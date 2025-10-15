import { Parser } from 'json2csv';
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

const writeUserLogPDF = async (req, res) => {
    
} 

const writeAILogPDF = async (req, res) => {
    
} 

// === Filtered Pagination ===





// === Log Manipulation ===
// TODO
// 