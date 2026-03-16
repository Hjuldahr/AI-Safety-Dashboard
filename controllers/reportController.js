import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import AI_Log from '../models/AI_Log.js'; // AI_Log model is used
import { DATA_DICTIONARY } from '../constants/charts.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { AI_LOG_CUTOFF } from '../constants/sse.js';
import AI_Summary from '../models/AI_Summary.js';
import AlertLog from '../models/alert_log.js';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

const DEFAULT_DATA_POINTS = 60;

// Report Charts
const chartWidth = 800;
const chartHeight = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight });

// ===============================================
// === UTILITY & HELPER FUNCTIONS ================
// ===============================================

/**
 * Rounds a number to two decimal places, returning 0 if null/undefined.
 */
const round = (val) => Math.round((val ?? 0) * 100) / 100;

/**
 * Builds the MongoDB query object for filtering AI_Logs based on request parameters.
 */
const buildReportQuery = ({ modelName, startDate, endDate }) => {
    const query = {};

    if (modelName && modelName !== 'all') {
        query.modelName = modelName;
    }

    if (startDate || endDate) {
        query.responseTimestamp = {};

        if (startDate) {
            // Directly parse the datetime-local string
            query.responseTimestamp.$gte = new Date(startDate).getTime();
        }

        if (endDate) {
            // Directly parse the datetime-local string
            query.responseTimestamp.$lte = new Date(endDate).getTime();
        }
    }
    return query;
};

/**
 * Generates a Base64 image string of a Chart.js line chart rendered in memory.
 */
const generateChartImage = async (timeSeriesData, fieldKey) => {
    const config = DATA_DICTIONARY[fieldKey];
    if (!config) return null;

    // X-axis timestamps
    const labels = timeSeriesData.map(d => {
        const date = new Date(d.displayDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    });

    // Y-axis values
    const dataPoints = timeSeriesData.map(d => d[fieldKey]);

    const configuration = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: config.label,
                data: dataPoints,
                borderColor: config.color,
                // Add 33 to the hex color for 20% opacity fill underneath the line
                backgroundColor: `${config.color}33`,
                fill: true,
                tension: 0.2,
                pointRadius: 0 // Hide individual dots for cleaner dense graphs, or set to 2/3
            }]
        },
        options: {
            layout: {
                padding: {
                    left: 10,
                    right: 50, // This balances out the space taken by the Y-axis labels
                    top: 0,
                    bottom: 0
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: config.label,
                    font: { size: 18 }
                },
                legend: { display: false } // Title acts as legend
            },
            scales: {
                x: {
                    display: true,
                    title: { display: true, text: 'Time' },
                    ticks: { maxTicksLimit: 10 } // Don't crowd the x-axis with 60/90 labels
                },
                y: {
                    display: true,
                    title: { display: true, text: config.label },
                    beginAtZero: true,
                    ticks: {
                        // Format large numbers (70,000,000 -> 70M)
                        callback: function(value) {
                            if (value >= 1e6) return (value / 1e6).toFixed(0) + 'M';
                            if (value >= 1e3) return (value / 1e3).toFixed(0) + 'k';
                            return value;
                        }
                    }
                }
            }
        }
    };

    // This renders the chart in C++ and returns a data:image/png;base64 string
    return await chartJSNodeCanvas.renderToDataURL(configuration);
};

const getAppendixData = async (query) => {
    // Look for AI_Logs that actually have flagged outputs
    const logsWithFlags = await AI_Log.find({ ...query, flaggedCount: { $gt: 0 } })
        .select('flaggedOutputs responseTimestamp')
        .lean()
        .exec();

    const flatAppendix = [];
    logsWithFlags.forEach(log => {
        if (Array.isArray(log.flaggedOutputs)) {
            log.flaggedOutputs.forEach(flag => {
                flatAppendix.push({
                    timestamp: log.responseTimestamp,
                    severity: flag.severity || 'mild',
                    text: flag.text || 'Unknown flagged content'
                });
            });
        }
    });

    // Sort newest to oldest
    return flatAppendix.sort((a, b) => b.timestamp - a.timestamp);
};


// ===============================================
// ======== AGGREGATION FUNCTIONS ================
// ===============================================

/**
 * Runs the aggregation pipeline for dynamic stats, finds the associated log IDs, 
 * and maps any triggered alerts to those specific logs.
 * * @param {Object} query - The base MongoDB query (dates, modelName).
 * @param {Array<string>} selectedFields - e.g., ['responseTime', 'tokensUsed']
 * @param {Model} LogModel - Pass the Mongoose model (AI_Log or AI_Summary) based on timeframe
 */
const getAggregatedStats = async (query, selectedFields, LogModel, sourceModelName) => {
    // Programmatically build the $group stage based on selected fields
    const groupStage = { _id: null, totalCount: { $sum: 1 } };

    selectedFields.forEach(field => {
        const config = DATA_DICTIONARY[field];
        // Skip categorical/special fields for this numerical aggregation
        if (!config || config.dataType !== 'numeric') return;

        groupStage[`${field}_min`] = { $min: `$${config.dbPath}` };
        groupStage[`${field}_max`] = { $max: `$${config.dbPath}` };

        // Respect the dictionary's summarize preference (avg vs sum)
        if (config.summarize === 'avg') {
            groupStage[`${field}_avg`] = { $avg: `$${config.dbPath}` };
        } else if (config.summarize === 'sum') {
            groupStage[`${field}_avg`] = { $sum: `$${config.dbPath}` };
        }
    });

    // Execute the mathematical aggregation
    const aggResult = await LogModel.aggregate([{ $match: query }, { $group: groupStage }]).exec().catch((err) => {
        console.error("Single Stats Aggregation Error:", err);
        return [];
    });

    const stats = aggResult[0] || {};
    const resultData = { count: stats.totalCount || 0 };

    // Arrays/Sets to hold our concurrent queries and unique IDs
    const logIdPromises = [];
    const uniqueLogIds = new Set();
    const logIdToAlertsMap = {}; // Maps logId to an array of alerts

    // Document Retrieval Pass: Find the Log IDs for the calculated min/max values
    selectedFields.forEach(field => {
        const config = DATA_DICTIONARY[field];
        if (!config || config.dataType !== 'numeric') return;

        const minVal = stats[`${field}_min`];
        const maxVal = stats[`${field}_max`];

        // Initialize the output structure for the EJS template, enriched with dictionary data
        resultData[field] = {
            label: config.label,
            color: config.color,
            min: minVal ?? 0,
            max: maxVal ?? 0,
            avg: round(stats[`${field}_avg`]),
            minLogId: null,
            maxLogId: null,
            minAlerts: [],
            maxAlerts: [],
            minSourceModel: sourceModelName,
            maxSourceModel: sourceModelName
        };

        // If a min value exists, find one document that matches it within the query timeframe
        if (minVal !== undefined && minVal !== null) {
            const minQuery = { ...query, [config.dbPath]: minVal };
            const pMin = LogModel.findOne(minQuery, '_id').lean().exec().then(doc => {
                if (doc) {
                    resultData[field].minLogId = doc._id.toString();
                    uniqueLogIds.add(doc._id.toString());
                }
            });
            logIdPromises.push(pMin);
        }

        // Repeat for the max value
        if (maxVal !== undefined && maxVal !== null) {
            const maxQuery = { ...query, [config.dbPath]: maxVal };
            const pMax = LogModel.findOne(maxQuery, '_id').lean().exec().then(doc => {
                if (doc) {
                    resultData[field].maxLogId = doc._id.toString();
                    uniqueLogIds.add(doc._id.toString());
                }
            });
            logIdPromises.push(pMax);
        }
    });

    // Execute all ID retrieval queries concurrently
    await Promise.all(logIdPromises);

    // Alert Pass: Search the AlertLog collection for the discovered log IDs
    if (uniqueLogIds.size > 0) {
        const alerts = await AlertLog.find({
            logs: { $in: Array.from(uniqueLogIds) }
        })
            .select('_id alert alertSnapshot logs') // Bring back enough info for linking
            .lean()
            .exec();

        // Organize alerts by the log ID they belong to
        alerts.forEach(alertLogEntry => {
            alertLogEntry.logs.forEach(logId => {
                const idStr = logId.toString();
                if (!logIdToAlertsMap[idStr]) logIdToAlertsMap[idStr] = [];

                logIdToAlertsMap[idStr].push({
                    alertLogId: alertLogEntry._id.toString(),
                    alertName: alertLogEntry.alertSnapshot?.alertName || 'Unknown Alert',
                    alertLevel: alertLogEntry.alertSnapshot?.alertLevel || 'info'
                });
            });
        });
    }

    // Map the grouped alerts back to the final data structure
    selectedFields.forEach(field => {
        if (resultData[field]) {
            const minId = resultData[field].minLogId;
            const maxId = resultData[field].maxLogId;

            if (minId && logIdToAlertsMap[minId]) {
                resultData[field].minAlerts = logIdToAlertsMap[minId];
            }
            if (maxId && logIdToAlertsMap[maxId]) {
                resultData[field].maxAlerts = logIdToAlertsMap[maxId];
            }
        }
    });

    return resultData;
};


/**
 * Runs the aggregation pipeline for time-series data, dynamically bucketing
 * into a specific number of data points and filling gaps with zeros.
 * * @param {Object} query - The base MongoDB query.
 * @param {Array<string>} selectedFields - e.g., ['responseTime', 'tokensUsed']
 * @param {Model} LogModel - AI_Log or AI_Summary
 * @param {number} startTimeMs - Start of the report timeframe in Unix ms
 * @param {number} endTimeMs - End of the report timeframe in Unix ms
 * @param {number} numPoints - The exact number of buckets to return (e.g., 60 or 90)
 */
const getTimeSeriesData = async (
    query,
    selectedFields,
    LogModel,
    startTimeMs,
    endTimeMs,
    numPoints = DEFAULT_DATA_POINTS
) => {

    // Fallback: If for some reason we don't have exact time bounds, fetch them from the DB
    let start = startTimeMs;
    let end = endTimeMs;
    if (!start || !end) {
        const bounds = await LogModel.aggregate([
            { $match: query },
            { $group: { _id: null, minTime: { $min: "$responseTimestamp" }, maxTime: { $max: "$responseTimestamp" } } }
        ]);
        if (!bounds.length) return []; // No data available
        start = start || bounds[0].minTime;
        end = end || bounds[0].maxTime;
    }

    // Calculate how many milliseconds each bucket represents
    const bucketInterval = (end - start) / numPoints;

    // Programmatically build the group stage
    const groupStage = {
        // Find the bucket index: Math.floor((timestamp - start) / interval)
        _id: {
            $floor: {
                $divide: [
                    { $subtract: ["$responseTimestamp", start] },
                    bucketInterval
                ]
            }
        }
    };

    selectedFields.forEach(field => {
        const config = DATA_DICTIONARY[field];
        if (!config || config.dataType !== 'numeric') return;

        // Respect the dictionary's summarize preference
        if (config.summarize === 'avg') {
            groupStage[`${field}_avg`] = { $avg: `$${config.dbPath}` };
        } else if (config.summarize === 'sum') {
            groupStage[`${field}_avg`] = { $sum: `$${config.dbPath}` };
        }
    });

    // Execute aggregation
    const pipeline = [
        { $match: query },
        { $group: groupStage },
        { $sort: { _id: 1 } } // Sort by bucket index ascending
    ];

    const rawResults = await LogModel.aggregate(pipeline).exec().catch((err) => {
        console.error("Time Series Aggregation Error:", err);
        return [];
    });

    // Fill in the gaps (ensure exactly `numPoints` buckets exist)
    const filledTimeSeries = [];
    // Create a map for fast O(1) lookups of existing data
    const resultsMap = new Map(rawResults.map(r => [r._id, r]));

    for (let i = 0; i < numPoints; i++) {
        const bucketStartTime = Math.round(start + (i * bucketInterval));
        const existingData = resultsMap.get(i);

        // Base object with the timestamp to act as our X-axis label
        const bucketData = {
            timestamp: bucketStartTime,
            // You can format this date string further in EJS or Chart.js config later
            displayDate: new Date(bucketStartTime).toISOString()
        };

        // Populate selected fields (use calculated value, or 0 if a gap exists)
        selectedFields.forEach(field => {
            const config = DATA_DICTIONARY[field];
            if (!config || config.dataType !== 'numeric') return;

            bucketData[field] = existingData ? round(existingData[`${field}_avg`]) : 0;
        });

        filledTimeSeries.push(bucketData);
    }

    return filledTimeSeries;
};

/**
 * Handles the Puppeteer PDF generation from an EJS template.
 */
const renderPdfFromTemplate = async (templateName, templateData) => {
    const templatePath = path.join(__dirname, `../views/${templateName}.ejs`);
    const html = await ejs.renderFile(templatePath, templateData);

    let browser;
    try {
        browser = await puppeteer.launch({
            // The 'new' headless mode is more modern and reliable
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
            // Flags are required for Puppeteer to run inside Docker (as previously addressed)
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfOptions = {
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            }
        };

        const pdfBuffer = await page.pdf(pdfOptions);

        return pdfBuffer;

    } catch (error) {
        console.error('Puppeteer PDF Generation Error:', error);
        throw new Error('PDF generation failed.');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

/**
 * Utility to generate rows for the aggregate CSV download.
 */
const generateAggregateCsvRows = (stats) => {
    const csvRows = ["Metric,Value,Unit"];

    const addRow = (metricName, value, unit) => {
        // Use the round helper for consistency and to ensure 2 decimal places in CSV
        const safeValue = round(value).toFixed(2);
        csvRows.push(`"${metricName}","${safeValue}","${unit}"`);
    };

    csvRows.push(`"Total Logs Analyzed","${stats.count}","logs"`);

    // Response Time
    const rt = stats.responseTime;
    addRow("Response Time - Average", rt.avg, "ms");
    addRow("Response Time - Minimum", rt.min, "ms");
    addRow("Response Time - Maximum", rt.max, "ms");

    // Policy Compliance
    const pc = stats.policy;
    addRow("Policy Compliance - Average", pc.avg, "score");
    addRow("Policy Compliance - Minimum", pc.min, "score");
    addRow("Policy Compliance - Maximum", pc.max, "score");

    // Response Helpfulness
    const rh = stats.helpfulness;
    addRow("Response Helpfulness - Average", rh.avg, "score");
    addRow("Response Helpfulness - Minimum", rh.min, "score");
    addRow("Response Helpfulness - Maximum", rh.max, "score");

    // Energy Consumption
    const ec = stats.energy;
    addRow("Energy Consumption - Average", ec.avg, "units");
    addRow("Energy Consumption - Minimum", ec.min, "units");
    addRow("Energy Consumption - Maximum", ec.max, "units");

    // --- NEW FIELDS CSV GENERATION ---

    // Token Usage
    const tkn = stats.tokens;
    csvRows.push(``); // Blank line for separation
    addRow("Tokens Used - Average", tkn.avg, "tokens");
    addRow("Tokens Used - Minimum", tkn.min, "tokens");
    addRow("Tokens Used - Maximum", tkn.max, "tokens");

    // Giga Flops Used
    const gflp = stats.gigaFlops;
    csvRows.push(``);
    addRow("Giga Flops Used - Average", gflp.avg, "GFLOPs");
    addRow("Giga Flops Used - Minimum", gflp.min, "GFLOPs");
    addRow("Giga Flops Used - Maximum", gflp.max, "GFLOPs");

    // Web Lookups
    const wbl = stats.webLookups;
    csvRows.push(``);
    addRow("Web Lookups - Average", wbl.avg, "lookups");
    addRow("Web Lookups - Minimum", wbl.min, "lookups");
    addRow("Web Lookups - Maximum", wbl.max, "lookups");

    // Toxicity Score
    const tsc = stats.toxicity;
    csvRows.push(``);
    addRow("Toxicity Score - Average", tsc.avg, "score");
    addRow("Toxicity Score - Minimum", tsc.min, "score");
    addRow("Toxicity Score - Maximum", tsc.max, "score");

    // PII Detected
    const pii = stats.piiDetected;
    csvRows.push(``);
    addRow("PII Detected - Average", pii.avg, "count");
    addRow("PII Detected - Minimum", pii.min, "count");
    addRow("PII Detected - Maximum", pii.max, "count");

    // --- END NEW FIELDS CSV GENERATION ---

    return csvRows.join('\n');
};


// ===============================================
// === EXPRESS CONTROLLER FUNCTIONS ==============
// ===============================================

/**
 * Controller to render the reports page.
 */
const getPage = (req, res) => {
    const cutoffTime = Date.now() - AI_LOG_CUTOFF;

    res.render('reports', {
        title: 'Reports',
        cutoffTime: cutoffTime,
        user: req.user
    });
};

/**
 * Controller to generate and send the PDF report.
 */
const createReport = async (req, res) => {
    try {
        const {
            reportTitle = 'Dashboard Report',
            startDate,
            endDate,
            modelName,
            fields = []
        } = req.body || {};

        // Context & Setup - ToDo: Currently defaults to 2 fields if they aren't found, update this to throw an error
        const selectedFields = Array.isArray(fields) && fields.length > 0
            ? fields
            : ['responseTime', 'policyCompliance'];

        // Ensure the user actually wants the appendix
        const includeAppendix = selectedFields.includes('flaggedOutputs');

        // Remove flaggedOutputs from the numeric charting fields
        const numericFields = selectedFields.filter(f => f !== 'flaggedOutputs');

        // Calculate absolute timestamps for our timeframe
        const startMs = startDate ? new Date(startDate).getTime() : Date.now() - ONE_DAY_MS;
        const endMs = endDate ? new Date(endDate).getTime() : Date.now();

        // Determine exactly where our data retention line is right now
        const cutoffTime = Date.now() - AI_LOG_CUTOFF;

        // The Cutoff Router (Determine Fidelity)
        let fidelity = 'split';
        if (endMs < cutoffTime) fidelity = 'low';
        else if (startMs >= cutoffTime) fidelity = 'high';

        let stats = { count: 0 };
        let timeSeriesData = [];
        let appendixData = [];

        // Data Gathering based on Fidelity
        if (fidelity === 'high') {
            const query = buildReportQuery({ modelName, startDate, endDate });
            stats = await getAggregatedStats(query, numericFields, AI_Log, 'AI_Log');
            timeSeriesData = await getTimeSeriesData(query, numericFields, AI_Log, startMs, endMs);

            if (includeAppendix) {
                appendixData = await getAppendixData(query);
            }

        } else if (fidelity === 'low') {
            const query = buildReportQuery({ modelName, startDate, endDate });
            stats = await getAggregatedStats(query, numericFields, AI_Summary, 'AI_Summary');
            timeSeriesData = await getTimeSeriesData(query, numericFields, AI_Summary, startMs, endMs);

        } else if (fidelity === 'split') {
            // Build separate queries for the two halves of the timeframe
            const lowQuery = { ...buildReportQuery({ modelName }), responseTimestamp: { $gte: startMs, $lt: cutoffTime } };
            const highQuery = { ...buildReportQuery({ modelName }), responseTimestamp: { $gte: cutoffTime, $lte: endMs } };

            // Fetch data concurrently
            const [lowStats, highStats, lowTimeSeries, highTimeSeries] = await Promise.all([
                getAggregatedStats(lowQuery, numericFields, AI_Summary, 'AI_Summary'),
                getAggregatedStats(highQuery, numericFields, AI_Log, 'AI_Log'),
                // Notice we pass the full startMs and endMs to BOTH, so Mongo calculates the exact same global bucket intervals!
                getTimeSeriesData(lowQuery, numericFields, AI_Summary, startMs, endMs),
                getTimeSeriesData(highQuery, numericFields, AI_Log, startMs, endMs)
            ]);

            // Merge Stats
            stats.count = (lowStats.count || 0) + (highStats.count || 0);
            stats.lowCount = lowStats.count || 0;
            stats.highCount = highStats.count || 0;
            numericFields.forEach(field => {
                if (!lowStats[field] && !highStats[field]) return;
                const l = lowStats[field] || { min: Infinity, max: -Infinity, avg: 0 };
                const h = highStats[field] || { min: Infinity, max: -Infinity, avg: 0 };

                stats[field] = {
                    label: l.label || h.label,
                    color: l.color || h.color,
                    // True Min
                    min: Math.min(l.min, h.min),
                    // True Max
                    max: Math.max(l.max, h.max),
                    // Weighted Average Formula: ((avg1 * count1) + (avg2 * count2)) / totalCount
                    avg: round(((l.avg * lowStats.count) + (h.avg * highStats.count)) / (stats.count || 1))
                };

                // Figure out who holds the TRUE minimum to keep the correct link/alerts
                if (l.min < h.min) {
                    Object.assign(stats[field], { minLogId: l.minLogId, minAlerts: l.minAlerts, minSourceModel: l.minSourceModel });
                } else {
                    Object.assign(stats[field], { minLogId: h.minLogId, minAlerts: h.minAlerts, minSourceModel: h.minSourceModel });
                }

                // Figure out who holds the TRUE maximum
                if (l.max > h.max) {
                    Object.assign(stats[field], { maxLogId: l.maxLogId, maxAlerts: l.maxAlerts, maxSourceModel: l.maxSourceModel });
                } else {
                    Object.assign(stats[field], { maxLogId: h.maxLogId, maxAlerts: h.maxAlerts, maxSourceModel: h.maxSourceModel });
                }
            });

            // Merge Time Series (Favor high fidelity if they somehow overlap in a bucket)
            timeSeriesData = lowTimeSeries.map((lowBucket, index) => {
                const highBucket = highTimeSeries[index];
                // If the high bucket has actual data (not 0 filling), use it, otherwise use low
                const hasHighData = numericFields.some(f => highBucket[f] > 0);
                return hasHighData ? highBucket : lowBucket;
            });

            // Grab Appendix data just for the high-fidelity portion
            if (includeAppendix) {
                appendixData = await getAppendixData(highQuery);
            }
        }

        // Generate Chart Images in Memory
        const chartImages = {};
        const chartPromises = numericFields.map(async (field) => {
            chartImages[field] = await generateChartImage(timeSeriesData, field);
        });
        await Promise.all(chartPromises);

        // Build Template Payload & Render
        const templateData = {
            reportTitle,
            startDate,
            endDate,
            modelName,
            fidelity, // Passes 'high', 'low', or 'split' to power the UI badge
            totalLogs: stats.count,
            lowLogs: stats.lowCount || 0,
            highLogs: stats.highCount || 0,
            selectedFields: numericFields,
            stats,
            chartImages,
            appendixData
        };

        const pdfBuffer = await renderPdfFromTemplate('reportTemplate', templateData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${modelName}-report.pdf"`);
        return res.send(pdfBuffer);

    } catch (err) {
        console.error('Create Report Error:', err);
        res.status(500).json({ message: 'Failed to generate report', error: err.message });
    }
};
/**
 * Controller to download raw AI logs as a CSV file.
 */
const downloadCsv = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });

        const logs = await AI_Log.find(query).lean().exec();

        if (logs.length === 0) {
            return res.status(404).json({ message: 'No logs found for the selected criteria. The date range may be empty.' });
        }

        // Define headers with new fields
        const headers = [
            'responseDate', 'modelName', 'policyCompliance', 'responseHelpfulness',
            'responseTime', 'energyConsumption',
            'tokensUsed', 'gigaFlopsUsed', 'webLookups', 'toxicityScore', 'piiDetected',
            'queryCount', 'responseTimestamp', '_id'
        ];
        const csvRows = [headers.join(',')];

        // Generate log rows
        for (const log of logs) {
            // Create a temporary object with all fields flattened and formatted
            const logData = {
                _id: log._id.toString(),
                modelName: log.modelName,
                policyCompliance: log.policyCompliance,
                responseHelpfulness: log.responseHelpfulness,
                responseTime: log.responseTime,
                energyConsumption: log.energyConsumption,
                // --- NEW FIELDS MAPPED ---
                tokensUsed: log.tokensUsed,
                gigaFlopsUsed: log.gigaFlopsUsed,
                webLookups: log.webLookups,
                toxicityScore: log.toxicityScore,
                piiDetected: log.piiDetected,
                // --- END NEW FIELDS MAPPED ---
                queryCount: log.queryCount,
                responseTimestamp: log.responseTimestamp,
                responseDate: new Date(log.responseTimestamp).toISOString(),
            };

            const values = headers.map(header => {
                const value = logData[header] !== undefined ? logData[header] : '';
                // Simple CSV escaping
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-logs-${modelName}-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
        return res.send(csvContent);

    } catch (err) {
        console.error('Download CSV Error:', err);
        res.status(500).json({ message: 'Failed to generate CSV due to a server error.', error: err.message });
    }
};

/**
 * Controller to download aggregate statistics as a CSV file.
 */
const downloadAggregatesCsv = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });

        const stats = await getAggregatedStats(query);

        if (stats.count === 0) {
            return res.status(404).json({ message: 'No data found to calculate aggregates.' });
        }

        const csvContent = generateAggregateCsvRows(stats);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-aggregates-${modelName}-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
        return res.send(csvContent);

    } catch (err) {
        console.error('Download Aggregates CSV Error:', err);
        res.status(500).json({ message: 'Failed to generate aggregate CSV due to a server error.', error: err.message });
    }
};


export default {
    createReport,
    getPage,
    downloadCsv,
    downloadAggregatesCsv
};