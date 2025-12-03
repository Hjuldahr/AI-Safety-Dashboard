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
        query.responseTimestamp = {}; 
        
        if (startDate) {
            // FIX: Create the start boundary (GTE) based on UTC midnight (00:00:00.000Z)
            const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
            query.responseTimestamp.$gte = startOfDayUTC.getTime();
        }
        
        if (endDate) {
            // FIX: Create the end boundary (LTE) based on the last millisecond of the day in UTC (23:59:59.999Z)
            const endDayDate = new Date(endDate + 'T00:00:00.000Z');
            
            // Add 24 hours (86,400,000 milliseconds) to get the start of the next day.
            const nextDayStartUTC = endDayDate.getTime() + 86400000;
            
            // Set the upper bound to the last millisecond of the selected day.
            query.responseTimestamp.$lte = nextDayStartUTC - 1; 
        }
    }
    return query;
};

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


// === Main Report Generation Handler (DEBUGGING ADDED HERE) ===
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

        // Build query and fetch logs 
        const query = buildReportQuery({ 
            modelName, 
            startDate, 
            endDate 
        });
        
        // === DEBUGGING STEP 1: Log the exact Mongoose query object ===
        console.log('--- REPORT DEBUG: Input Dates ---', { startDate, endDate, modelName });
        console.log('--- REPORT DEBUG: Mongoose Query Object ---', JSON.stringify(query));


        const matchStage = { $match: query };

        // Aggregation stage to calculate min, max, avg responseTime and total count
        const groupStage = {
            $group: {
                _id: null,
                minVal: { $min: '$responseTime' }, 
                maxVal: { $max: '$responseTime' },
                avgVal: { $avg: '$responseTime' },
                totalCount: { $sum: 1 }
            }
        };

        // Run aggregation on AI_Log
        const agg = await AI_Log.aggregate([matchStage, groupStage]).exec().catch((err) => {
            console.error("Aggregation Error:", err);
            return [];
        });
        
        // === DEBUGGING STEP 2: Log the raw aggregation result ===
        console.log('--- REPORT DEBUG: Raw Aggregation Result ---', agg);
        
        // If agg is empty, the stats will default to 0
        const stats = agg && agg.length ? {
            min: agg[0].minVal ?? 0,
            max: agg[0].maxVal ?? 0,
            avg: Math.round((agg[0].avgVal ?? 0) * 100) / 100, 
            count: agg[0].totalCount ?? 0
        } : { min: 0, max: 0, avg: 0, count: 0 };
        

        // ... (rest of function remains the same)
        
        // Render template and produce PDF
        const templateData = {
            reportTitle,
            startDate,
            endDate,
            reportType,
            modelName,
            notes,
            totalLogs: stats.count,
            stats
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

const getPage = (req, res) => {
    res.render('reports', { 
        title: 'Reports',
        user: req.user
    });
};


export default {
    createReport,
    getPage
};