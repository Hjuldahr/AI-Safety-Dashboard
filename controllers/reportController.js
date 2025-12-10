import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import User_Log from '../models/User_Log.js';
import AI_Log from '../models/AI_Log.js';
import User from '../models/user.js';
import { response } from 'express';

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Helper Query Builders ===
const buildReportQuery = ({ modelName, startDate, endDate }) => {
    const query = {};

    if (modelName && modelName !== 'all') {
        query.modelName = modelName;
    }

    if (startDate || endDate) {
        query.responseTimestamp = {}; 
        
        if (startDate) {
            // Create the start boundary (GTE) based on UTC midnight (00:00:00.000Z)
            const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
            query.responseTimestamp.$gte = startOfDayUTC.getTime();
        }
        
        if (endDate) {
            // Create the end boundary (LTE) based on the last millisecond of the day in UTC (23:59:59.999Z)
            const endDayDate = new Date(endDate + 'T00:00:00.000Z');
            
            // Add 24 hours (86,400,000 milliseconds) to get the start of the next day.
            const nextDayStartUTC = endDayDate.getTime() + 86400000;
            
            // Set the upper bound to the last millisecond of the selected day.
            query.responseTimestamp.$lte = nextDayStartUTC - 1; 
        }
    }
    return query;
};

const getAggregatedStats = async (query) => {
    const matchStage = { $match: query };
    
    // --- Aggregation Pipeline for Single Stats (Min/Max/Avg/Count) ---
    const groupSingleStatsStage = {
        $group: {
            _id: null,
            minVal: { $min: '$responseTime' }, 
            maxVal: { $max: '$responseTime' },
            avgVal: { $avg: '$responseTime' },
            totalCount: { $sum: 1 },
            minPolicy: { $min: '$policyCompliance' },
            maxPolicy: { $max: '$policyCompliance' },
            avgPolicy: { $avg: '$policyCompliance' },
            minHelpful: { $min: '$responseHelpfulness' },
            maxHelpful: { $max: '$responseHelpfulness' },
            avgHelpful: { $avg: '$responseHelpfulness' },
            minEnergy: { $min: '$energyConsumption' },
            maxEnergy: { $max: '$energyConsumption' },
            avgEnergy: { $avg: '$energyConsumption' }
        }
    };

    const agg = await AI_Log.aggregate([matchStage, groupSingleStatsStage]).exec().catch((err) => {
        console.error("Single Stats Aggregation Error:", err);
        return [];
    });

    // If agg is empty, the stats will default to 0
    const stats = agg && agg.length ? {
        min: agg[0].minVal ?? 0,
        max: agg[0].maxVal ?? 0,
        avg: Math.round((agg[0].avgVal ?? 0) * 100) / 100, 
        count: agg[0].totalCount ?? 0,
        policy: {
            min: agg[0].minPolicy ?? 0,
            max: agg[0].maxPolicy ?? 0,
            avg: Math.round((agg[0].avgPolicy ?? 0) * 100) / 100,
        },
        helpfulness: {
            min: agg[0].minHelpful ?? 0,
            max: agg[0].maxHelpful ?? 0,
            avg: Math.round((agg[0].avgHelpful ?? 0) * 100) / 100,
        },
        energy: {
            min: agg[0].minEnergy ?? 0,
            max: agg[0].maxEnergy ?? 0,
            avg: Math.round((agg[0].avgEnergy ?? 0) * 100) / 100,
        }
    } : { 
        min: 0, max: 0, avg: 0, count: 0, 
        policy: { min: 0, max: 0, avg: 0 },
        helpfulness: { min: 0, max: 0, avg: 0 },
        energy: { min: 0, max: 0, avg: 0 }
    };
    
    return stats;
}

// === PDF generation via Puppeteer (Chart.js in-template) ===
const renderPdfFromTemplate = async (templateName, templateData) => {
    const templatePath = path.join(__dirname, `../views/${templateName}.ejs`);
    const html = await ejs.renderFile(templatePath, templateData);

    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new',
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


// === Main Report Generation Handler ===
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

        const query = buildReportQuery({ 
            modelName, 
            startDate, 
            endDate 
        });
        
        const matchStage = { $match: query };

        // --- 1. Time-Series Aggregation Stages (for Line Charts) ---
        const projectStage = {
            $project: {
                date: { $toDate: "$responseTimestamp" }, // Convert numeric timestamp to Date object
                responseTime: "$responseTime",
                policyCompliance: "$policyCompliance",
                responseHelpfulness: "$responseHelpfulness",
                energyConsumption: "$energyConsumption",
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
            }
        };
        
        const sortStage = { $sort: { _id: 1 } };


        // --- 2. Single Stats Aggregation Pipeline (for Min/Max/Avg/Count) ---
        const groupSingleStatsStage = {
            $group: {
                _id: null,
                totalCount: { $sum: 1 },
                minResponseTime: { $min: '$responseTime' }, 
                maxResponseTime: { $max: '$responseTime' },
                avgResponseTime: { $avg: '$responseTime' },
                minPolicy: { $min: '$policyCompliance' },
                maxPolicy: { $max: '$policyCompliance' },
                avgPolicy: { $avg: '$policyCompliance' },
                minHelpful: { $min: '$responseHelpfulness' },
                maxHelpful: { $max: '$responseHelpfulness' },
                avgHelpful: { $avg: '$responseHelpfulness' },
                minEnergy: { $min: '$energyConsumption' },
                maxEnergy: { $max: '$energyConsumption' },
                avgEnergy: { $avg: '$energyConsumption' }
            }
        };

        // Run both aggregations concurrently for efficiency
        const [singleStatsAgg, timeSeriesAgg] = await Promise.all([
            AI_Log.aggregate([matchStage, groupSingleStatsStage]).exec().catch((err) => {
                console.error("Single Stats Aggregation Error:", err);
                return [];
            }),
            AI_Log.aggregate([matchStage, projectStage, groupTimeSeriesStage, sortStage]).exec().catch((err) => {
                console.error("Time Series Aggregation Error:", err);
                return [];
            })
        ]);

        const agg = singleStatsAgg;
        
        // If agg is empty, the stats will default to 0
        const stats = agg && agg.length ? {
            count: agg[0].totalCount ?? 0,
            responseTime: {
                min: agg[0].minResponseTime ?? 0,
                max: agg[0].maxResponseTime ?? 0,
                avg: Math.round((agg[0].avgResponseTime ?? 0) * 100) / 100,
            },
            policy: {
                min: agg[0].minPolicy ?? 0,
                max: agg[0].maxPolicy ?? 0,
                avg: Math.round((agg[0].avgPolicy ?? 0) * 100) / 100,
            },
            helpfulness: {
                min: agg[0].minHelpful ?? 0,
                max: agg[0].maxHelpful ?? 0,
                avg: Math.round((agg[0].avgHelpful ?? 0) * 100) / 100,
            },
            energy: {
                min: agg[0].minEnergy ?? 0,
                max: agg[0].maxEnergy ?? 0,
                avg: Math.round((agg[0].avgEnergy ?? 0) * 100) / 100,
            }
        } : { 
            min: 0, max: 0, avg: 0, count: 0, 
            policy: { min: 0, max: 0, avg: 0 },
            helpfulness: { min: 0, max: 0, avg: 0 },
            energy: { min: 0, max: 0, avg: 0 }
        };


        // Render template and produce PDF
        const templateData = {
            reportTitle,
            startDate,
            endDate,
            reportType,
            modelName,
            notes,
            totalLogs: stats.count,
            stats,
            timeSeriesData: timeSeriesAgg 
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

const downloadCsv = async (req, res) => {
    try {
        // Parameters come from req.query for a GET request
        const { modelName, startDate, endDate } = req.query;

        const query = buildReportQuery({ modelName, startDate, endDate });

        // --- DEBUGGING LINE 1 ---
        console.log('CSV Download: Query Built:', JSON.stringify(query));
        
        // Fetch all logs matching the query. Use .lean() for faster data retrieval.
        const logs = await AI_Log.find(query).lean().exec();

        // --- DEBUGGING LINE 2 ---
        console.log(`CSV Download: Found ${logs.length} logs.`);

        if (logs.length === 0) {
            // Send a 404/400 to prevent a silent 204 failure
            return res.status(404).json({ message: 'No logs found for the selected criteria. The date range may be empty.' }); 
        }

        // Prepare the logs for CSV, adding a readable date field
        const logsForCsv = logs.map(log => ({
            _id: log._id.toString(), // Convert ObjectId to string
            modelName: log.modelName,
            policyCompliance: log.policyCompliance,
            responseHelpfulness: log.responseHelpfulness,
            responseTime: log.responseTime,
            energyConsumption: log.energyConsumption,
            queryCount: log.queryCount,
            responseTimestamp: log.responseTimestamp,
            responseDate: new Date(log.responseTimestamp).toISOString(),
        }));

        // Determine CSV headers (in desired order)
        const headers = [
            'responseDate', 'modelName', 'policyCompliance', 'responseHelpfulness', 
            'responseTime', 'energyConsumption', 'queryCount', 'responseTimestamp', '_id'
        ];
        const csvRows = [headers.join(',')]; // Header row

        // Simple manual CSV conversion with quote escaping
        for (const log of logsForCsv) {
            const values = headers.map(header => {
                const value = log[header] !== undefined ? log[header] : '';
                // Escape: Wrap value in quotes, and escape internal double quotes by doubling them (" becomes "")
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }
        
        const csvContent = csvRows.join('\n');

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-logs-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
        return res.send(csvContent);

    } catch (err) {
        console.error('Download CSV Error:', err);
        // Return a 500 status with an error message
        res.status(500).json({ message: 'Failed to generate CSV due to a server error.', error: err.message });
    }
};

const downloadAggregatesCsv = async (req, res) => {
    try {
        const { modelName, startDate, endDate } = req.query;

        const query = buildReportQuery({ modelName, startDate, endDate });
        
        // Get the normalized aggregate statistics object
        const stats = await getAggregatedStats(query);

        if (stats.count === 0) {
            return res.status(404).json({ message: 'No data found to calculate aggregates.' });
        }
        
        // Manually build the CSV content for the key metrics
        const csvRows = [
            "Metric,Value,Unit"
        ];
        
        // Helper to add rows to CSV
        const addRow = (metricName, value, unit) => {
            const safeValue = value.toFixed(2);
            csvRows.push(`"${metricName}","${safeValue}","${unit}"`);
        };
        
        // Add all metrics
        csvRows.push(`"Total Logs Analyzed","${stats.count}","logs"`);

        // Response Time
        addRow("Response Time - Average", stats.avg, "ms");
        addRow("Response Time - Minimum", stats.min, "ms");
        addRow("Response Time - Maximum", stats.max, "ms");

        // Policy Compliance
        addRow("Policy Compliance - Average", stats.policy.avg, "score");
        addRow("Policy Compliance - Minimum", stats.policy.min, "score");
        addRow("Policy Compliance - Maximum", stats.policy.max, "score");
        
        // Response Helpfulness
        addRow("Response Helpfulness - Average", stats.helpfulness.avg, "score");
        addRow("Response Helpfulness - Minimum", stats.helpfulness.min, "score");
        addRow("Response Helpfulness - Maximum", stats.helpfulness.max, "score");

        // Energy Consumption
        addRow("Energy Consumption - Average", stats.energy.avg, "units");
        addRow("Energy Consumption - Minimum", stats.energy.min, "units");
        addRow("Energy Consumption - Maximum", stats.energy.max, "units");

        const csvContent = csvRows.join('\n');

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="ai-aggregates-${startDate || 'all'}-to-${endDate || 'all'}.csv"`);
        return res.send(csvContent);

    } catch (err) {
        console.error('Download Aggregates CSV Error:', err);
        res.status(500).json({ message: 'Failed to generate aggregate CSV due to a server error.', error: err.message });
    }
};

const getPage = (req, res) => {
    res.render('reports', { 
        title: 'Reports',
        user: req.user
    });
};


export default {
    createReport,
    getPage,
    downloadCsv,
    downloadAggregatesCsv
};