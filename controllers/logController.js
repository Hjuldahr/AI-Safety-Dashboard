import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import User_Log from '../models/User_Log.js';
import AI_Log from '../models/AI_Log.js';

// === File Read/Write ===
export const exportUserLogCSV = async (req, res) => {
    try {
        const userID = req.user._id;
        const startDate = req.startDate || null;
        const endDate = req.endDate || null;

        const logs = await User_Log.getLogsByUserAndTime(userID, startDate, endDate);
        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No logs found.' });
        }

        // Convert to plain JS objects
        const data = logs.map(log => log.toObject());

        // Convert JSON → CSV
        const parser = new Parser();
        const csv = parser.parse(data);

        // Send CSV directly as download
        const timestamp = Date.now();
        const filename = `UserLog_${userID}_${timestamp}.csv`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csv);

    } catch (err) {
        console.error('Export User Log Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

export const exportAILogCSV = async (req, res) => {
    try {
        const modelID = req.model._id;
        const startDate = req.startDate || null;
        const endDate = req.endDate || null;

        const logs = await AI_Log.getLogsByModelAndTime(modelID, startDate, endDate);
        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No logs found.' });
        }

        const data = logs.map(log => log.toObject());
        const parser = new Parser();
        const csv = parser.parse(data);

        const timestamp = Date.now();
        const filename = `AILog_${modelID}_${timestamp}.csv`;

        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csv);

    } catch (err) {
        console.error('Export AI Log Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

function streamLogsAsPDF(res, filename, title, logs) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Set headers before piping
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe PDF directly to HTTP response
    doc.pipe(res);

    // --- Title ---
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // --- Table Header ---
    doc.fontSize(12).text('Event Logs', { underline: true });
    doc.moveDown(0.5);

    // --- Table Content ---
    logs.forEach((log, i) => {
        const created = new Date(log.createdAt).toLocaleString();
        doc
            .fontSize(10)
            .text(`• [${i + 1}] ${log.eventType}`, { continued: true })
            .text(` — ${created}`, { align: 'right' });

        if (log.details && Object.keys(log.details).length > 0) {
            doc.moveDown(0.2);
            doc.fontSize(9).fillColor('gray');
            doc.text(JSON.stringify(log.details, null, 2), { indent: 20 });
            doc.fillColor('black');
        }

        doc.moveDown(0.5);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').stroke();
        doc.moveDown(0.5);
    });

    // --- Footer ---
    doc.moveDown(2);
    doc.fontSize(9).fillColor('gray');
    doc.text(`Generated at: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.fillColor('black');

    // Finalize document and send
    doc.end();
}

export const exportUserLogPDF = async (req, res) => {
    try {
        const userID = req.user._id;
        const startDate = req.startDate || null;
        const endDate = req.endDate || null;

        const logs = await User_Log.getLogsByUserAndTime(userID, startDate, endDate);
        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No logs found.' });
        }

        const filename = `UserLog_${userID}_${Date.now()}.pdf`;
        streamLogsAsPDF(res, filename, `User Log Report - ${userID}`, logs);

    } catch (err) {
        console.error('Export User Log PDF Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

export const exportAILogPDF = async (req, res) => {
    try {
        const modelID = req.model._id;
        const startDate = req.startDate || null;
        const endDate = req.endDate || null;

        const logs = await AI_Log.getLogsByModelAndTime(modelID, startDate, endDate);
        if (!logs || logs.length === 0) {
            return res.status(404).json({ message: 'No logs found.' });
        }

        const filename = `AILog_${modelID}_${Date.now()}.pdf`;
        streamLogsAsPDF(res, filename, `AI Model Log Report - ${modelID}`, logs);

    } catch (err) {
        console.error('Export AI Log PDF Error:', err);
        res.status(500).json({ message: 'Failed to export logs', error: err.message });
    }
};

// === Filtered Pagination ===





// === Log Manipulation ===
// TODO
// 