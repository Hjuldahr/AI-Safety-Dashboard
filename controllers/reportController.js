import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import AI_Log from '../models/AI_Log.js';
import chartConstants from "../constants/charts.js";
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { AI_LOG_CUTOFF } from '../constants/sse.js';
import AI_Summary from '../models/AI_Summary.js';
import AlertLog from '../models/alert_log.js';
import User_Log from '../models/User_Log.js';
import ReportRecord from '../models/ReportRecord.js';
import * as h5wasm from 'h5wasm/node';
import fs from "fs";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

const DEFAULT_DATA_POINTS = 60;

// Report Charts
const chartWidth = 800;
const chartHeight = 400;
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: chartWidth, height: chartHeight });

const DATA_DICTIONARY = chartConstants.DATA_DICTIONARY;

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
                        callback: function (value) {
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
 * Now fully dynamic based on the DATA_DICTIONARY.
 */
const generateAggregateCsvRows = (stats) => {
    const csvRows = ["Metric,Value"];

    const addRow = (metricName, value) => {
        // Handle potential undefined/null values safely
        const safeValue = round(value).toFixed(2);
        csvRows.push(`"${metricName}","${safeValue}"`);
    };

    // Global count row
    csvRows.push(`"Total Logs Analyzed","${stats.count}"`);

    // Iterate through the dictionary to find numeric metrics
    Object.keys(DATA_DICTIONARY).forEach(fieldKey => {
        const config = DATA_DICTIONARY[fieldKey];
        const data = stats[fieldKey];

        // Skip if it's not a numeric metric or if the data doesn't exist in the stats object
        if (config.dataType !== 'numeric' || !data) return;

        // Visual break in the CSV for readability
        csvRows.push("");

        // Add the three standard aggregate rows
        addRow(`${config.label} - Average`, data.avg);
        addRow(`${config.label} - Minimum`, data.min);
        addRow(`${config.label} - Maximum`, data.max);
    });

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
        user: req.user,
        constants: chartConstants
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

        // Extract appendix flags and remove them from numeric charting fields
        const APPENDIX_KEYS = ['flaggedOutputs', 'appendixAiLogs', 'appendixAiSummaries', 'appendixUserLogs', 'appendixAlertLogs'];
        const appendixFlags = {};
        APPENDIX_KEYS.forEach(key => { appendixFlags[key] = selectedFields.includes(key); });
        const numericFields = selectedFields.filter(f => !APPENDIX_KEYS.includes(f));

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

            if (appendixFlags.flaggedOutputs) {
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
            if (appendixFlags.flaggedOutputs) {
                appendixData = await getAppendixData(highQuery);
            }
        }

        // Generate Chart Images in Memory
        const chartImages = {};
        const chartPromises = numericFields.map(async (field) => {
            chartImages[field] = await generateChartImage(timeSeriesData, field);
        });
        await Promise.all(chartPromises);

        // Fetch additional appendix data concurrently
        const appendixPromises = [];
        let aiLogsAppendix = [];
        let aiSummariesAppendix = [];
        let userLogsAppendix = [];
        let alertLogsAppendix = [];

        const baseQuery = buildReportQuery({ modelName, startDate, endDate });

        if (appendixFlags.appendixAiLogs) {
            appendixPromises.push(
                AI_Log.find(baseQuery)
                    .sort({ responseTimestamp: -1 })
                    .limit(200)
                    .lean().exec()
                    .then(docs => { aiLogsAppendix = docs; })
            );
        }
        if (appendixFlags.appendixAiSummaries) {
            appendixPromises.push(
                AI_Summary.find(baseQuery)
                    .sort({ responseTimestamp: -1 })
                    .limit(200)
                    .lean().exec()
                    .then(docs => { aiSummariesAppendix = docs; })
            );
        }
        if (appendixFlags.appendixUserLogs) {
            const userLogQuery = {};
            if (startDate || endDate) {
                userLogQuery.createdAt = {};
                if (startDate) userLogQuery.createdAt.$gte = new Date(startDate);
                if (endDate) userLogQuery.createdAt.$lte = new Date(endDate);
            }
            appendixPromises.push(
                User_Log.find(userLogQuery)
                    .sort({ createdAt: -1 })
                    .limit(200)
                    .populate('userID', 'username')
                    .lean().exec()
                    .then(docs => { userLogsAppendix = docs; })
            );
        }
        if (appendixFlags.appendixAlertLogs) {
            const alertQuery = {};
            if (startDate || endDate) {
                alertQuery.timestamp = {};
                if (startDate) alertQuery.timestamp.$gte = new Date(startDate);
                if (endDate) alertQuery.timestamp.$lte = new Date(endDate);
            }
            appendixPromises.push(
                AlertLog.find(alertQuery)
                    .sort({ timestamp: -1 })
                    .limit(200)
                    .lean().exec()
                    .then(docs => { alertLogsAppendix = docs; })
            );
        }

        await Promise.all(appendixPromises);

        // Build Template Payload & Render
        const templateData = {
            reportTitle,
            startDate,
            endDate,
            modelName,
            fidelity,
            totalLogs: stats.count,
            lowLogs: stats.lowCount || 0,
            highLogs: stats.highCount || 0,
            selectedFields: numericFields,
            stats,
            chartImages,
            appendixData,
            aiLogsAppendix,
            aiSummariesAppendix,
            userLogsAppendix,
            alertLogsAppendix,
            appendixFlags
        };

        const pdfBuffer = await renderPdfFromTemplate('reportTemplate', templateData);

        // Save the report record and PDF to disk
        const recordId = new mongoose.Types.ObjectId();
        const pdfFilename = `${recordId}.pdf`;
        const storagePath = path.join(__dirname, '../storage/reports', pdfFilename);
        fs.writeFileSync(storagePath, pdfBuffer);

        await ReportRecord.create({
            _id: recordId,
            title: reportTitle,
            modelName,
            startDate,
            endDate,
            fields: selectedFields,
            fidelity,
            pdfFilename
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${modelName}-report.pdf"`);
        return res.send(pdfBuffer);

    } catch (err) {
        console.error('Create Report Error:', err);
        res.status(500).json({ message: 'Failed to generate report', error: err.message });
    }
};


/**
 * Dynamically generates CSV content based on the DATA_DICTIONARY.
 * This ensures new metrics are added to exports automatically.
 */
const generateDynamicCsv = (data, title = "Export") => {
    if (!data || data.length === 0) return "";

    // Identify numeric/categorical fields from dictionary to use as headers
    const dictFields = Object.keys(DATA_DICTIONARY).filter(key =>
        ['numeric', 'categorical', 'timestamp'].includes(DATA_DICTIONARY[key].dataType)
    );

    // Header row
    const headers = ['id', 'displayDate', ...dictFields];
    const rows = [headers.join(',')];

    data.forEach(item => {
        const values = headers.map(header => {
            let val = '';
            if (header === 'id') val = item._id?.toString();
            else if (header === 'displayDate') val = new Date(item.responseTimestamp).toISOString();
            else val = item[header] ?? '';

            // Escape for CSV
            return `"${('' + val).replace(/"/g, '""')}"`;
        });
        rows.push(values.join(','));
    });

    return rows.join('\n');
};

// ===============================================
// === EXPRESS CONTROLLER FUNCTIONS ==============
// ===============================================

/**
 * Helper to handle the "No Data" response for exports
 */
const handleEmptyExport = (res, type) => {
    return res.status(404).json({
        message: `No ${type} found for the selected criteria. The date range may be empty.`
    });
};

/**
 * Raw AI Logs (High Fidelity)
 */
export const downloadAiLogs = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });
        const logs = await AI_Log.find(query).lean().exec();

        if (!logs.length) return handleEmptyExport(res, 'AI Logs');

        const csv = generateDynamicCsv(logs, "AI Logs");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-logs-${Date.now()}.csv"`);
        return res.send(csv);
    } catch (err) {
        console.error("Error Generating AI Logs Export: ", err);
        res.status(500).json({ message: 'AI Logs Export failed', error: err.message });
    }
};

/**
 * AI Summaries (Low Fidelity / 1min)
 */
export const downloadAiSummaries = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });
        const summaries = await AI_Summary.find(query).lean().exec();

        if (!summaries.length) return handleEmptyExport(res, 'Summaries');

        const csv = generateDynamicCsv(summaries, "AI Summaries");
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-summaries-${Date.now()}.csv"`);
        return res.send(csv);
    } catch (err) {
        console.error("Error Generating Summary Export: ", err);
        res.status(500).json({ message: 'Summary Export failed', error: err.message });
    }
};

/**
 * Aggregates (The Min/Max/Avg Table)
 */
export const downloadAggregatesCsv = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });

        // We use the same aggregation logic that powers the UI
        const numericFields = Object.keys(DATA_DICTIONARY)
            .filter(f => DATA_DICTIONARY[f].dataType === 'numeric');

        const stats = await getAggregatedStats(query, numericFields, AI_Log, 'AI_Log');

        if (stats.count === 0) return handleEmptyExport(res, 'Aggregates');

        const csvContent = generateAggregateCsvRows(stats); // This was already good, just needed the trigger
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-aggregates-${Date.now()}.csv"`);
        return res.send(csvContent);
    } catch (err) {
        console.error("Error Generating Aggregate Export: ", err);
        res.status(500).json({ message: 'Aggregate Export failed', error: err.message });
    }
};

/**
 * HDF5 Helpers
 */

// Helper to resolve nested paths (e.g., "breakdown.topic")
const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const writeStructuredData = (group, data) => {
    if (!data.length) return;

    // Iterate through every field defined in your dictionary
    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
        const { dbPath, dataType } = config;

        // 1. Extract the column from the array of objects
        const columnData = data.map(item => {
            const val = getNestedValue(item, dbPath);

            if (dataType === 'numeric') return val ?? 0;
            if (dataType === 'timestamp') return new Date(val).getTime(); // Store as numeric epoch
            return val ? String(val) : ""; // Categorical/String
        });

        // 2. Create the dataset with the proper type
        group.create_dataset({
            name: key,
            data: columnData,
            // HDF5 optimization: store numbers as floats/ints, everything else as string
            dtype: dataType === 'numeric' || dataType === 'timestamp' ? 'f8' : undefined
        });
    });
};

/**
 * HDF5 (All-in-one bundle)
 */
export const downloadHdf5 = async (req, res) => {
    const filePath = path.join(__dirname, `../temp/report-${Date.now()}.h5`);

    try {
        await h5wasm.ready;

        const { modelName, startDate, endDate } = req.body;
        const query = buildReportQuery({ modelName, startDate, endDate });

        const [logs, summaries] = await Promise.all([
            AI_Log.find(query).lean().exec(),
            AI_Summary.find(query).lean().exec()
        ]);

        if (!logs.length && !summaries.length) return handleEmptyExport(res, 'Data');

        // Create HDF5 File
        const file = new h5wasm.File(filePath, 'w');

        // Create Groups
        const logGroup = file.create_group('raw_logs');
        const summaryGroup = file.create_group('summaries');

        if (logs.length) writeStructuredData(logGroup, logs);
        if (summaries.length) writeStructuredData(summaryGroup, summaries);

        file.close();

        res.download(filePath, `AI-Project-Data.h5`, () => {
            fs.unlinkSync(filePath);
        });

    } catch (err) {
        console.error("HDF5 Error:", err);
        res.status(500).json({ message: 'HDF5 Generation failed', error: err.message });
    }
};


// ===============================================
// === REPORT HISTORY FUNCTIONS ==================
// ===============================================

const HISTORY_PAGE_LIMIT = 10;

/**
 * Returns paginated report history as JSON.
 */
const getHistory = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);

        const [records, total] = await Promise.all([
            ReportRecord.find()
                .sort({ createdAt: -1 })
                .skip((page - 1) * HISTORY_PAGE_LIMIT)
                .limit(HISTORY_PAGE_LIMIT)
                .lean()
                .exec(),
            ReportRecord.countDocuments()
        ]);

        res.json({
            reports: records,
            page,
            totalPages: Math.ceil(total / HISTORY_PAGE_LIMIT),
            total
        });
    } catch (err) {
        console.error('Get Report History Error:', err);
        res.status(500).json({ message: 'Failed to fetch report history', error: err.message });
    }
};

/**
 * Serves a stored PDF by report record ID.
 */
const getHistoryPdf = async (req, res) => {
    try {
        const record = await ReportRecord.findById(req.params.id).lean().exec();
        if (!record) return res.status(404).json({ message: 'Report not found' });

        const filePath = path.resolve(__dirname, '../storage/reports', record.pdfFilename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'PDF file not found on disk' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${record.title}.pdf"`);
        return res.sendFile(filePath);
    } catch (err) {
        console.error('Get History PDF Error:', err);
        res.status(500).json({ message: 'Failed to retrieve PDF', error: err.message });
    }
};

/**
 * Re-generates a download using stored report params.
 * The `type` param maps to an existing download handler.
 */
const downloadFromHistory = async (req, res) => {
    try {
        const record = await ReportRecord.findById(req.params.id).lean().exec();
        if (!record) return res.status(404).json({ message: 'Report not found' });

        // Reconstruct req.body from the stored record so existing handlers can process it
        req.body = {
            modelName: record.modelName,
            startDate: record.startDate,
            endDate: record.endDate,
            fields: record.fields
        };

        const type = req.params.type;
        switch (type) {
            case 'logs': return downloadAiLogs(req, res);
            case 'summaries': return downloadAiSummaries(req, res);
            case 'aggregates': return downloadAggregatesCsv(req, res);
            case 'hdf5': return downloadHdf5(req, res);
            default: return res.status(400).json({ message: `Unknown download type: ${type}` });
        }
    } catch (err) {
        console.error('Download From History Error:', err);
        res.status(500).json({ message: 'Failed to process download', error: err.message });
    }
};

/**
 * Deletes a report record and its associated PDF file.
 */
const deleteReport = async (req, res) => {
    try {
        const record = await ReportRecord.findById(req.params.id).exec();
        if (!record) return res.status(404).json({ message: 'Report not found' });

        // Remove PDF from disk
        const filePath = path.join(__dirname, '../storage/reports', record.pdfFilename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await record.deleteOne();
        res.json({ message: 'Report deleted successfully' });
    } catch (err) {
        console.error('Delete Report Error:', err);
        res.status(500).json({ message: 'Failed to delete report', error: err.message });
    }
};

export default {
    createReport,
    getPage,
    downloadAiLogs,
    downloadAiSummaries,
    downloadAggregatesCsv,
    downloadHdf5,
    getHistory,
    getHistoryPdf,
    downloadFromHistory,
    deleteReport
};