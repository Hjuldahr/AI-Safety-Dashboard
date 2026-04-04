import User_Log from '../models/User_Log.js';
import AI_Log from '../models/AI_Log.js';
import AI_Summary from "../models/AI_Summary.js"
import User from '../models/user.js';
import chartConstants from "../constants/charts.js";
import { DEFAULT_PAGE_LIMIT } from "../constants/pagination.js";
import HistTag from '../models/historicalTag.js';
import Tag from '../models/tag.js';
import {
    generateDynamicCsv,
    generateUserLogCsv,
    sendCsvResponse,
    handleEmptyExport,
    writeStructuredData,
    writeUserLogData,
    createAndSendHdf5
} from '../services/exportService.js';

// === Helper Query Builders ===
const buildUserLogQuery = async ({ userID, eventType, startDate, endDate, search }) => {
    const query = {};

    if (userID) {
        query.userID = userID;
    }

    if (eventType && eventType !== 'all') {
        query.eventType = eventType;
    }

    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.createdAt.$lte = endOfDay;
        }
    }

    if (search) {
        const searchRegex = new RegExp(search, 'i');
        const orConditions = [
            { eventType: searchRegex },
            { details: searchRegex }
        ];

        // Find users matching search
        try {
            const users = await User.find({
                $or: [{ email: searchRegex }, { username: searchRegex }]
            }).select('_id');

            if (users.length > 0) {
                orConditions.push({ userID: { $in: users.map(u => u._id) } });
            }
        } catch (err) {
            console.error("Error searching users in logs:", err);
        }

        query.$or = orConditions;
    }

    return query;
};

const buildAILogQuery = async ({ modelName, startDate, endDate, search }) => {
    const query = {};

    // Add modelName filter if provided and not "all"
    if (modelName && modelName !== 'all') {
        query.modelName = modelName;
    }

    if (startDate || endDate) {
        query.responseTimestamp = {};
        if (startDate) {
            query.responseTimestamp.$gte = new Date(startDate).getTime();
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query.responseTimestamp.$lte = endOfDay.getTime();
        }
    }

    if (search) {
        const searchRegex = new RegExp(search, 'i');
        const orConditions = [
            { modelName: searchRegex },
        ];

        const matchingTags = await HistTag.find({ 
            name: searchRegex 
        }).select('_id');

        const tagIds = matchingTags.map(t => t._id);

        if (tagIds.length > 0) {
            // Now we search the logs for any of these specific ObjectIds
            orConditions.push({ tags: { $in: tagIds } });
        }

        // Numeric check
        const searchNum = Number(search);
        if (!isNaN(searchNum)) {
            const numericFields = [
                'policyCompliance', 'responseHelpfulness', 'responseTime',
                'energyConsumption', 'tokensUsed', 'gigaFlopsUsed',
                'webLookups', 'toxicityScore', 'piiDetected', 'queryCount',
                'responseTimestamp'
            ];
            numericFields.forEach(field => {
                orConditions.push({ [field]: searchNum });
            });
        }

        query.$or = orConditions;
    }

    return query;
};

// === Pagination ===
const getFilteredUserLogs = async (req, res) => {
    try {
        const {
            userID,
            eventType,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        const query = await buildUserLogQuery({ userID, eventType, startDate, endDate, search });
        const skip = (pageNum - 1) * limitNum;

        const logsQuery = User_Log.find(query)
            .sort({ createdAt: -1 })
            .populate('userID', 'email username')
            .skip(skip)
            .limit(limitNum);

        const totalQuery = User_Log.countDocuments(query);

        //Execute both queries in parallel
        const [logs, total] = await Promise.all([logsQuery, totalQuery]);

        res.json({
            logs,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user logs.' });
    }
};

const getFilteredAILogs = async (req, res) => {
    try {
        const {
            modelName,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        const query = await buildAILogQuery({
            modelName,
            startDate,
            endDate,
            search
        });

        const skip = (pageNum - 1) * limitNum;

        const logsQuery = AI_Log.find(query)
            .sort({ responseTimestamp: -1 })
            .skip(skip)
            .limit(limitNum)
            .populate("tags");

        const totalQuery = AI_Log.countDocuments(query);

        const [logs, total] = await Promise.all([logsQuery, totalQuery]);

        res.json({
            logs,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch AI logs.' });
    }
};

const getFilteredAISummaries = async (req, res) => {
    try {
        const {
            modelName,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 10
        } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);

        const query = await buildAILogQuery({
            modelName,
            startDate,
            endDate,
            search
        });

        const skip = (pageNum - 1) * limitNum;

        const logsQuery = AI_Summary.find(query)
            .sort({ responseTimestamp: -1 })
            .skip(skip)
            .limit(limitNum);

        const totalQuery = AI_Summary.countDocuments(query);

        const [logs, total] = await Promise.all([logsQuery, totalQuery]);

        res.json({
            logs,
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch AI Summaries.' });
    }
};


// Log Page
const getPage = async (req, res) => {
    try {
        res.render("logs", {
            user: req.user,
            deepLink: null,
            constants: chartConstants
        });
    } catch (error) {
        console.error("Error fetching logs page:", error);
    }
};

// Gets a specific AI log and returns its page number so we can open the logs page to view the log
const getAILogView = async (req, res) => {
    try {
        const { id } = req.params;

        const limit = DEFAULT_PAGE_LIMIT;

        // Find the target log
        const targetLog = await AI_Log.findById(id);
        if (!targetLog) {
            return res.redirect('logs?error=LogNotFound');
        }

        // Calculate which page it's on
        // We count how many logs come BEFORE it in the 'responseTimestamp: -1' sort
        const countBefore = await AI_Log.countDocuments({
            responseTimestamp: { $gt: targetLog.responseTimestamp }
        });

        const targetPage = Math.floor(countBefore / limit) + 1;

        // Render the page with "Deep Link" instructions
        res.render("logs", {
            user: req.user,
            // Pass these to the frontend
            deepLink: {
                view: 'ai',
                id: id,
                page: targetPage,
            },
            constants: chartConstants
        });
    } catch (error) {
        console.error("Error redirecting to AI log:", error);
        res.redirect('/logs');
    }
};

const getAILog = async (req, res) => {
    try {
        const id = req.params.id
        
        const log = await AI_Log.findById(id);

        if(!log){
            return res.status(404).json({message: "Ai Log not found"});
        }

        return res.status(200).json(log);
    } catch (error) {
        console.error("Error fetching AI log:", error);
        return res.status(500).json({ message: "Error fetching AI log." });
    }
};


// Log Tagging
const tagAILog = async (req, res) => {
    try {
        const id = req.params.id;
        const { tags } = req.body;

        const targetLog = await AI_Log.findById(id);
        if (!targetLog) {
            return res.status(404).json({ message: "AI Log not found." });
        }

        let historicalTagIds = [];

        if (tags && tags.length > 0) {
            // Fetch the full Active Tag documents so we know their current names/colors
            const activeTags = await Tag.find({ _id: { $in: tags } });

            // Generate or find the corresponding Historical Tags
            historicalTagIds = await HistTag.addOrFindTags(activeTags);
        }

        targetLog.tags = historicalTagIds;

        await targetLog.save();

        return res.status(200).json(targetLog);

    } catch (error) {
        console.error("Error tagging AI log:", error);
        return res.status(500).json({ message: "Error tagging AI log." });
    }
}



// === Export Handlers ===

const exportUserLogCSV = async (req, res) => {
    try {
        const { startDate, endDate, eventType } = req.body;
        const query = await buildUserLogQuery({ eventType, startDate, endDate });
        const logs = await User_Log.find(query)
            .sort({ createdAt: -1 })
            .populate('userID', 'email username')
            .lean()
            .exec();

        if (!logs.length) return handleEmptyExport(res, 'User Logs');

        const csv = generateUserLogCsv(logs);
        sendCsvResponse(res, csv, `user-logs-${Date.now()}.csv`);
    } catch (err) {
        console.error('Export User Log CSV Error:', err);
        res.status(500).json({ message: 'Failed to export user logs', error: err.message });
    }
};

const exportUserLogHDF5 = async (req, res) => {
    try {
        const { startDate, endDate, eventType } = req.body;
        const query = await buildUserLogQuery({ eventType, startDate, endDate });
        const logs = await User_Log.find(query)
            .sort({ createdAt: -1 })
            .populate('userID', 'email username')
            .lean()
            .exec();

        if (!logs.length) return handleEmptyExport(res, 'User Logs');

        await createAndSendHdf5(res, 'user_logs', logs, writeUserLogData, `user-logs-${Date.now()}.h5`);
    } catch (err) {
        console.error('Export User Log HDF5 Error:', err);
        res.status(500).json({ message: 'Failed to export user logs', error: err.message });
    }
};

const exportAILogCSV = async (req, res) => {
    try {
        const { startDate, endDate, modelName } = req.body;
        const query = await buildAILogQuery({ modelName, startDate, endDate });
        const logs = await AI_Log.find(query).lean().exec();

        if (!logs.length) return handleEmptyExport(res, 'AI Logs');

        const csv = generateDynamicCsv(logs, 'AI Logs');
        sendCsvResponse(res, csv, `ai-logs-${Date.now()}.csv`);
    } catch (err) {
        console.error('Export AI Log CSV Error:', err);
        res.status(500).json({ message: 'Failed to export AI logs', error: err.message });
    }
};

const exportAILogHDF5 = async (req, res) => {
    try {
        const { startDate, endDate, modelName } = req.body;
        const query = await buildAILogQuery({ modelName, startDate, endDate });
        const logs = await AI_Log.find(query).lean().exec();

        if (!logs.length) return handleEmptyExport(res, 'AI Logs');

        await createAndSendHdf5(res, 'ai_logs', logs, writeStructuredData, `ai-logs-${Date.now()}.h5`);
    } catch (err) {
        console.error('Export AI Log HDF5 Error:', err);
        res.status(500).json({ message: 'Failed to export AI logs', error: err.message });
    }
};

const exportAISummaryCSV = async (req, res) => {
    try {
        const { startDate, endDate, modelName } = req.body;
        const query = await buildAILogQuery({ modelName, startDate, endDate });
        const summaries = await AI_Summary.find(query).lean().exec();

        if (!summaries.length) return handleEmptyExport(res, 'AI Summaries');

        const csv = generateDynamicCsv(summaries, 'AI Summaries');
        sendCsvResponse(res, csv, `ai-summaries-${Date.now()}.csv`);
    } catch (err) {
        console.error('Export AI Summary CSV Error:', err);
        res.status(500).json({ message: 'Failed to export AI summaries', error: err.message });
    }
};

const exportAISummaryHDF5 = async (req, res) => {
    try {
        const { startDate, endDate, modelName } = req.body;
        const query = await buildAILogQuery({ modelName, startDate, endDate });
        const summaries = await AI_Summary.find(query).lean().exec();

        if (!summaries.length) return handleEmptyExport(res, 'AI Summaries');

        await createAndSendHdf5(res, 'ai_summaries', summaries, writeStructuredData, `ai-summaries-${Date.now()}.h5`);
    } catch (err) {
        console.error('Export AI Summary HDF5 Error:', err);
        res.status(500).json({ message: 'Failed to export AI summaries', error: err.message });
    }
};

export default {
    getPage,
    getAILogView,
    getAILog,
    getFilteredUserLogs,
    getFilteredAILogs,
    getFilteredAISummaries,
    tagAILog,
    exportUserLogCSV,
    exportUserLogHDF5,
    exportAILogCSV,
    exportAILogHDF5,
    exportAISummaryCSV,
    exportAISummaryHDF5
}