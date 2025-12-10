import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import AI_Log from '../models/AI_Log.js'; // AI_Log model is used

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ONE_DAY_MS = 86400000; // 24 hours in milliseconds

// ===============================================
// === UTILITY & HELPER FUNCTIONS ================
// ===============================================

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
            // Start boundary: UTC midnight of the start date (inclusive)
            const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
            query.responseTimestamp.$gte = startOfDayUTC.getTime();
        }
        
        if (endDate) {
            // End boundary: Last millisecond of the end date (inclusive)
            const endDayDate = new Date(endDate + 'T00:00:00.000Z');
            const nextDayStartUTC = endDayDate.getTime() + ONE_DAY_MS;
            query.responseTimestamp.$lte = nextDayStartUTC - 1; 
        }
    }
    return query;
};

/**
 * Rounds a number to two decimal places, returning 0 if null/undefined.
 */
const round = (val) => Math.round((val ?? 0) * 100) / 100;

/**
 * Runs the aggregation pipeline for min/max/avg/count (single stats).
 */
const getAggregatedStats = async (query) => {
    const matchStage = { $match: query };
    
    const groupSingleStatsStage = {
        $group: {
            _id: null,
            totalCount: { $sum: 1 },
            
            // Response Time
            minResponseTime: { $min: '$responseTime' }, 
            maxResponseTime: { $max: '$responseTime' },
            avgResponseTime: { $avg: '$responseTime' },

            // Policy Compliance
            minPolicy: { $min: '$policyCompliance' },
            maxPolicy: { $max: '$policyCompliance' },
            avgPolicy: { $avg: '$policyCompliance' },
            
            // Response Helpfulness
            minHelpful: { $min: '$responseHelpfulness' },
            maxHelpful: { $max: '$responseHelpfulness' },
            avgHelpful: { $avg: '$responseHelpfulness' },
            
            // Energy Consumption
            minEnergy: { $min: '$energyConsumption' },
            maxEnergy: { $max: '$energyConsumption' },
            avgEnergy: { $avg: '$energyConsumption' },
            
            // --- NEW FIELDS AGGREGATION ---
            minTokens: { $min: '$tokensUsed' }, 
            maxTokens: { $max: '$tokensUsed' },
            avgTokens: { $avg: '$tokensUsed' },
            
            minFlops: { $min: '$gigaFlopsUsed' }, 
            maxFlops: { $max: '$gigaFlopsUsed' },
            avgFlops: { $avg: '$gigaFlopsUsed' },
            
            minLookups: { $min: '$webLookups' }, 
            maxLookups: { $max: '$webLookups' },
            avgLookups: { $avg: '$webLookups' },
            
            minToxicity: { $min: '$toxicityScore' }, 
            maxToxicity: { $max: '$toxicityScore' },
            avgToxicity: { $avg: '$toxicityScore' },
            
            minPii: { $min: '$piiDetected' }, 
            maxPii: { $max: '$piiDetected' },
            avgPii: { $avg: '$piiDetected' }
            // --- END NEW FIELDS AGGREGATION ---
        }
    };

    const agg = await AI_Log.aggregate([matchStage, groupSingleStatsStage]).exec().catch((err) => {
        console.error("Single Stats Aggregation Error:", err);
        return [];
    });

    const result = agg[0];

    // Normalize the output data structure
    return result ? {
        count: result.totalCount ?? 0,
        responseTime: {
            min: result.minResponseTime ?? 0,
            max: result.maxResponseTime ?? 0,
            avg: round(result.avgResponseTime),
        },
        policy: {
            min: result.minPolicy ?? 0,
            max: result.maxPolicy ?? 0,
            avg: round(result.avgPolicy),
        },
        helpfulness: {
            min: result.minHelpful ?? 0,
            max: result.maxHelpful ?? 0,
            avg: round(result.avgHelpful),
        },
        energy: {
            min: result.minEnergy ?? 0,
            max: result.maxEnergy ?? 0,
            avg: round(result.avgEnergy),
        },
        // --- NEW FIELDS NORMALIZATION ---
        tokens: {
            min: result.minTokens ?? 0,
            max: result.maxTokens ?? 0,
            avg: round(result.avgTokens),
        },
        gigaFlops: {
            min: result.minFlops ?? 0,
            max: result.maxFlops ?? 0,
            avg: round(result.avgFlops),
        },
        webLookups: {
            min: result.minLookups ?? 0,
            max: result.maxLookups ?? 0,
            avg: round(result.avgLookups),
        },
        toxicity: {
            min: result.minToxicity ?? 0,
            max: result.maxToxicity ?? 0,
            avg: round(result.avgToxicity),
        },
        piiDetected: {
            min: result.minPii ?? 0,
            max: result.maxPii ?? 0,
            avg: round(result.avgPii),
        }
        // --- END NEW FIELDS NORMALIZATION ---
    } : { 
        count: 0, 
        responseTime: { min: 0, max: 0, avg: 0 },
        policy: { min: 0, max: 0, avg: 0 },
        helpfulness: { min: 0, max: 0, avg: 0 },
        energy: { min: 0, max: 0, avg: 0 },
        // Ensure ALL fields are present for EJS template even if data is 0
        tokens: { min: 0, max: 0, avg: 0 },
        gigaFlops: { min: 0, max: 0, avg: 0 },
        webLookups: { min: 0, max: 0, avg: 0 },
        toxicity: { min: 0, max: 0, avg: 0 },
        piiDetected: { min: 0, max: 0, avg: 0 }
    };
}


/**
 * Runs the aggregation pipeline for time-series data (daily averages).
 */
const getTimeSeriesData = async (query) => {
    const matchStage = { $match: query };
    const projectStage = {
        $project: {
            date: { $toDate: "$responseTimestamp" }, 
            responseTime: "$responseTime",
            policyCompliance: "$policyCompliance",
            responseHelpfulness: "$responseHelpfulness",
            energyConsumption: "$energyConsumption",
            // --- NEW FIELDS PROJECT ---
            tokensUsed: "$tokensUsed",
            gigaFlopsUsed: "$gigaFlopsUsed",
            webLookups: "$webLookups",
            toxicityScore: "$toxicityScore",
            piiDetected: "$piiDetected",
            // --- END NEW FIELDS PROJECT ---
        }
    };
    
    const groupTimeSeriesStage = {
        $group: {
            _id: {
                $dateToString: { 
                    format: "%Y-%m-%d", 
                    date: "$date" 
                }
            },
            avgResponseTime: { $avg: '$responseTime' },
            avgPolicyCompliance: { $avg: '$policyCompliance' },
            avgResponseHelpfulness: { $avg: '$responseHelpfulness' },
            avgEnergyConsumption: { $avg: '$energyConsumption' },
            // --- NEW FIELDS AVERAGE ---
            avgTokensUsed: { $avg: '$tokensUsed' },
            avgGigaFlopsUsed: { $avg: '$gigaFlopsUsed' },
            avgWebLookups: { $avg: '$webLookups' },
            avgToxicityScore: { $avg: '$toxicityScore' },
            avgPiiDetected: { $avg: '$piiDetected' },
            // --- END NEW FIELDS AVERAGE ---
        }
    };
    
    const sortStage = { $sort: { _id: 1 } };

    return AI_Log.aggregate([matchStage, projectStage, groupTimeSeriesStage, sortStage]).exec().catch((err) => {
        console.error("Time Series Aggregation Error:", err);
        return [];
    });
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

        // Wait for JavaScript signal that all charts are rendered
        await page.waitForFunction(() => window.renderComplete === true, {
            timeout: 5000
        }).catch(e => {
            console.warn('Puppeteer wait for chart render timed out. Proceeding with PDF generation.', e.message);
        });
        
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
    res.render('reports', { 
        title: 'Reports',
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
            reportType, 
            modelName, 
            notes 
        } = req.body || {};

        const query = buildReportQuery({ modelName, startDate, endDate });

        // Fetch all necessary data concurrently using centralized helpers
        const [stats, timeSeriesData] = await Promise.all([
            getAggregatedStats(query),
            getTimeSeriesData(query)
        ]);
        
        // Prepare template data
        // The EJS template will now have access to all the new fields via the 'stats' object
        const templateData = {
            reportTitle,
            startDate,
            endDate,
            reportType,
            modelName,
            notes,
            totalLogs: stats.count,
            stats,
            timeSeriesData: timeSeriesData 
        };

        const pdfBuffer = await renderPdfFromTemplate('reportTemplate', templateData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="dashboard-report.pdf"');
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
        const { modelName, startDate, endDate } = req.query;
        const query = buildReportQuery({ modelName, startDate, endDate });
        
        const logs = await AI_Log.find(query).lean().exec();

        if (logs.length === 0) {
            return res.status(404).json({ message: 'No logs found for the selected criteria. The date range may be empty.' }); 
        }

        // Define headers with new fields
        const headers = [
            'responseDate', 'modelName', 'policyCompliance', 'responseHelpfulness', 
            'responseTime', 'energyConsumption', 
            // --- NEW HEADERS ADDED HERE ---
            'tokensUsed', 'gigaFlopsUsed', 'webLookups', 'toxicityScore', 'piiDetected',
            // --- END NEW HEADERS ---
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
        res.setHeader('Content-Disposition', `attachment; filename="ai-logs-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
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
        const { modelName, startDate, endDate } = req.query;
        const query = buildReportQuery({ modelName, startDate, endDate });
        
        const stats = await getAggregatedStats(query);

        if (stats.count === 0) {
            return res.status(404).json({ message: 'No data found to calculate aggregates.' });
        }
        
        const csvContent = generateAggregateCsvRows(stats);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-aggregates-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
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