import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import User_Log from '../models/User_Log.js';
import AI_Log from '../models/AI_Log.js';
import User from '../models/user.js';

// === Helper Query Builders ===
const buildUserLogQuery = ({ userID, eventType, startDate, endDate }) => {
    const query = { userID };
    if (eventType) query.eventType = eventType;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
    }
    return query;
};

const buildAILogQuery = ({ modelID, policyCompliance, responseHelpfulness, responseTime, energyConsumption, responseTimestamp, startDate, endDate }) => {
    //TODO if start date is 0 and end date is -1 include all entries
    const query = { modelID };
    if (policyCompliance !== undefined) query.policyCompliance = policyCompliance;
    if (responseHelpfulness !== undefined) query.responseHelpfulness = responseHelpfulness;
    if (responseTime !== undefined) query.responseTime = responseTime;
    if (energyConsumption !== undefined) query.energyConsumption = energyConsumption;

    if (responseTimestamp) {
        query.responseTimestamp = {};
        if (responseTimestamp.start) query.responseTimestamp.$gte = responseTimestamp.start;
        if (responseTimestamp.end) query.responseTimestamp.$lte = responseTimestamp.end;
    }
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = startDate;
        if (endDate) query.createdAt.$lte = endDate;
    }

    return query;
};

// === PDF Streaming Helper ===
const streamLogsAsPDF = (res, filename, title, logs) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text('Event Logs', { underline: true });
    doc.moveDown(0.5);

    logs.forEach((log, i) => {
        const created = new Date(log.createdAt).toLocaleString();
        doc.fontSize(10)
            .text(`• [${i + 1}] ${log.eventType}`, { continued: true })
            .text(` — ${created}`, { align: 'right' });

        if (log.details && Object.keys(log.details).length > 0) {
            doc.moveDown(0.2)
                .fontSize(9)
                .fillColor('gray')
                .text(JSON.stringify(log.details, null, 2), { indent: 20 })
                .fillColor('black');
        }

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    doc.moveDown(2);
    doc.fontSize(9).fillColor('gray');
    doc.text(`Generated at: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.fillColor('black');

    doc.end();
};

// === Generic CSV Export Helper ===
const exportCSV = (res, logs, filename) => {
    const csv = new Parser().parse(logs.map(log => log.toObject()));
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    res.status(200).send(csv);
};

// === User Log Exports ===
const exportUserLogCSV = async (req, res) => {
    try {
        const { _id: userID } = req.user;
        const { eventType, startDate, endDate, page = 1, limit = 100 } = req.body || {};

        const logs = await User_Log.find(buildUserLogQuery({ userID, eventType, startDate, endDate }))
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        if (!logs.length) return res.status(404).json({ message: 'No logs found.' });

        const filename = `UserLog_${userID}_${Date.now()}.csv`;
        exportCSV(res, logs, filename);

    } catch (err) {
        console.error('Export User Log CSV Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

const exportUserLogPDF = async (req, res) => {
    try {
        const { _id: userID } = req.user;
        const { eventType, startDate, endDate, page = 1, limit = 100 } = req.body || {};

        const logs = await User_Log.find(buildUserLogQuery({ userID, eventType, startDate, endDate }))
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        if (!logs.length) return res.status(404).json({ message: 'No logs found.' });

        const filename = `UserLog_${userID}_${Date.now()}.pdf`;
        streamLogsAsPDF(res, filename, `User Log Report - ${userID}`, logs);

    } catch (err) {
        console.error('Export User Log PDF Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

// === AI Log Exports ===
const exportAILogCSV = async (req, res) => {
    try {
        const { _id: modelID } = req.model;
        const { policyCompliance, responseHelpfulness, responseTime, energyConsumption, responseTimestamp, startDate, endDate, page = 1, limit = 100 } = req.body || {};

        const logs = await AI_Log.find(buildAILogQuery({ modelID, policyCompliance, responseHelpfulness, responseTime, energyConsumption, responseTimestamp, startDate, endDate }))
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        if (!logs.length) return res.status(404).json({ message: 'No logs found.' });

        const filename = `AILog_${modelID}_${Date.now()}.csv`;
        exportCSV(res, logs, filename);

    } catch (err) {
        console.error('Export AI Log CSV Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

const exportAILogPDF = async (req, res) => {
    try {
        const { _id: modelID } = req.model;
        const { policyCompliance, responseHelpfulness, responseTime, energyConsumption, responseTimestamp, startDate, endDate, page = 1, limit = 100 } = req.body || {};

        const logs = await AI_Log.find(buildAILogQuery({ modelID, policyCompliance, responseHelpfulness, responseTime, energyConsumption, responseTimestamp, startDate, endDate }))
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        if (!logs.length) return res.status(404).json({ message: 'No logs found.' });

        const filename = `AILog_${modelID}_${Date.now()}.pdf`;
        streamLogsAsPDF(res, filename, `AI Model Log Report - ${modelID}`, logs);

    } catch (err) {
        console.error('Export AI Log PDF Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

// === Pagination ===
const getFilteredUserLogs = async (req, res) => {
    try {
        const {
            userID,
            eventType,
            startDate,
            endDate,
            page = 1,
            limit = 100
        } = req.body; 

        const query = buildUserLogQuery({ userID, eventType, startDate, endDate });
        const skip = (page - 1) * limit;

        const logs = await User_Log.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User_Log.countDocuments(query);

        res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user logs' });
    }
};

const getFilteredAILogs = async (req, res) => {
    try {
        const {
            modelID,
            policyCompliance,
            responseHelpfulness,
            responseTime,
            energyConsumption,
            responseTimestamp,
            startDate,
            endDate,
            page = 1,
            limit = 100
        } = req.body; 

        const query = buildAILogQuery({
            modelID,
            policyCompliance,
            responseHelpfulness,
            responseTime,
            energyConsumption,
            responseTimestamp,
            startDate,
            endDate
        });

        const skip = (page - 1) * limit;

        const logs = await AI_Log.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await AI_Log.countDocuments(query);

        res.json({ logs, total, page, pages: Math.ceil(total / limit) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch AI logs' });
    }
};

// Log Page
const getPage = async (req, res) => {
    try{
        res.render("logs", {
            user: req.user,
        }); 
    }catch (error){
        console.error("Error fetching logs page:", error);
    }
};

export default {
    getPage,
    exportUserLogCSV,
    exportUserLogPDF,
    exportAILogCSV,
    exportAILogPDF,
    getFilteredUserLogs,
    getFilteredAILogs
}