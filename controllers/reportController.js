import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
import User_Log from '../models/User_Log.js';
import AI_Log from '../models/AI_Log.js';
import User from '../models/user.js';

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
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endOfDay;
        }
    }

    return query;
};

// === PDF generation via Puppeteer (Chart.js in-template) ===
const renderPdfFromTemplate = async (templateName, templateData) => {
    const templatePath = path.join(__dirname, `../views/${templateName}`);
    const html = await ejs.renderFile(templatePath, templateData);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for charts to mark renderComplete
    await page.waitForFunction(() => window.renderComplete === true).catch(() => {
        // If the page never sets renderComplete, continue after a timeout
        return new Promise(resolve => setTimeout(resolve, 800));
    });

    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm' }
    });

    await browser.close();
    return pdfBuffer;
};

// === Controller functions ===

/**
 * Renders the reports page.
 */
const getPage = async (req, res) => {
    try {
        res.render('reports', {
            user: req.user
        });
    } catch (err) {
        console.error('Error rendering reports page:', err);
        res.status(500).send('Error loading reports page.');
    }
};

/**
 * Creates a report PDF (Puppeteer + Chart.js in the EJS template) and returns it inline.
 * Body fields expected:
 *  - reportTitle, startDate, endDate, reportType, modelName, notes
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

        // Build query and fetch logs (adjust limit or full scan as needed)
        const query = buildReportQuery({ modelName, startDate, endDate });

        // For demonstration we aggregate a numeric field named `value` from AI_Log.
        // Replace `value` with whichever numeric stat your logs record (e.g., responseTime).
        const matchStage = { $match: query };
        const groupStage = {
            $group: {
                _id: null,
                minVal: { $min: '$responseTime' },
                maxVal: { $max: '$responseTime' },
                avgVal: { $avg: '$responseTime' },
                totalCount: { $sum: 1 }
            }
        };

        // Run aggregation on AI_Log as an example.
        // If you want to aggregate user logs, switch to User_Log accordingly.
        const agg = await AI_Log.aggregate([matchStage, groupStage]).exec().catch(() => []);

        const stats = agg && agg.length ? {
            min: agg[0].minVal ?? 0,
            max: agg[0].maxVal ?? 0,
            avg: Math.round((agg[0].avgVal ?? 0) * 100) / 100,
            count: agg[0].totalCount ?? 0
        } : { min: 0, max: 0, avg: 0, count: 0 };

        // Prepare two example Chart.js configs — extend them to match your real chart configs
        const chartConfig1 = {
            type: 'line',
            data: {
                labels: ['T-4','T-3','T-2','T-1','Now'],
                datasets: [{
                    label: 'Example Trend',
                    data: [
                        Math.max(0, stats.avg - 10),
                        Math.max(0, stats.avg - 5),
                        stats.avg,
                        Math.max(0, stats.avg + 5),
                        Math.max(0, stats.avg + 12)
                    ],
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        };

        const chartConfig2 = {
            type: 'bar',
            data: {
                labels: ['Min','Avg','Max'],
                datasets: [{
                    label: 'Range',
                    data: [stats.min, stats.avg, stats.max]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
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
            // embed as raw JS objects for EJS -> template
            chartConfig1: JSON.stringify(chartConfig1),
            chartConfig2: JSON.stringify(chartConfig2)
        };

        const pdfBuffer = await renderPdfFromTemplate('reportTemplate.ejs', templateData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="dashboard-report.pdf"');
        return res.send(pdfBuffer);

    } catch (err) {
        console.error('Report creation failed:', err);
        return res.status(500).json({ message: 'Failed to generate report', error: err.message });
    }
};

export default {
    getPage,
    createReport
};
