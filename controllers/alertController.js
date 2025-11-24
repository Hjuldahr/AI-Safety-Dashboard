import Alert from "../models/alert_model.js";
import User_Log from "../models/User_Log.js";
import AlertLog from "../models/alert_log.js";
import User from "../models/user.js";
import AI_Log from "../models/AI_Log.js";

const getPage = async (req, res) => {
    try {
        const alerts = await Alert.find();
        // Fetch distinct model names from AI logs to populate the UI
        let modelNames = [];
        try {
            modelNames = await AI_Log.distinct('modelName');
        } catch (mnErr) {
            console.error('Failed to fetch model names for alerts page:', mnErr);
            modelNames = [];
        }

        res.render("alerts", {
            user: req.user,
            alerts: alerts,
            alertLogs: [],
            models: modelNames
        });
    } catch (error) {
        console.error("Error fetching alert page:", error);
    }
};

// GET /alerts/api/history - Paginated and Filtered History
const getAlertHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const level = req.query.level;
        const modelName = req.query.modelName;
        const start = req.query.startDate;
        const end = req.query.endDate;
        const skip = (page - 1) * limit;

        const query = {};

        // Filter logic: We prioritize 'alertSnapshot' fields as they represent the historical state
        if (level && level !== 'all') {
            query['alertSnapshot.alertLevel'] = level;
        }
        if (modelName && modelName !== 'all') {
            query['alertSnapshot.modelName'] = modelName;
        }
        if (start || end) query.timestamp = {};
        if (start) {
            const sd = new Date(start);
            if (!Number.isNaN(sd.getTime())) query.timestamp.$gte = sd;
        }
        if (end) {
            const ed = new Date(end);
            if (!Number.isNaN(ed.getTime())) {
                // Make end-date inclusive by setting to end of day
                ed.setHours(23, 59, 59, 999);
                query.timestamp.$lte = ed;
            }
        }

        const total = await AlertLog.countDocuments(query);
        const rawLogs = await AlertLog.find(query)
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .populate('alert')
            .lean();

        const alertLogs = rawLogs.map(l => {
            const a = l.alertSnapshot || l.alert || {};
            let humanRule = '';
            try {
                humanRule = Alert.convertToHumanFormat(a.alertRule);
            } catch (err) {
                humanRule = '';
            }
            return {
                _id: l._id,
                level: a.alertLevel || 'Info',
                timestamp: l.timestamp,
                alertName: a.alertName || '',
                modelName: a.modelName || null,
                humanRule,
                created: l.timestamp // Ensure created exists for frontend sorting/display
            };
        });

        res.json({
            logs: alertLogs,
            total,
            page,
            pages: Math.ceil(total / limit)
        });

    } catch (error) {
        console.error("Error fetching alert history:", error);
        res.status(500).json({ message: 'Error fetching history' });
    }
};

// POST /alerts/create - create a new alert
const createAlert = async (req, res) => {
    try {
        const { alertName, alertLevel, alertRule, created, modelName } = req.body;

        // Normalize and validate rule using model static
        let normalizedRule;
        try {
            normalizedRule = Alert.convertToJSONFormat(alertRule);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid alert rule: ' + err.message });
        }

        const newAlert = new Alert({ alertName, alertLevel, alertRule: normalizedRule, created, modelName: modelName || null });
        await newAlert.save();
        // Add a human readable version for UI/logging
        const humanRule = Alert.convertToHumanFormat(normalizedRule);
        try {
            await User_Log.addLog(req.user ? req.user._id : null, 'Alert_Created', `Alert "${alertName}" created. Rule: ${humanRule}`);
        } catch (logErr) {
            console.error('Failed to write user log for alert creation:', logErr);
        }
        res.status(201).json({ message: 'Alert created successfully.', alert: newAlert, humanRule });
    } catch (error) {
        console.error("Error creating alert:", error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

// GET /alerts/live - return alerts as JSON (optionally filter active=true)
const getLiveAlerts = async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ created: -1 }).lean();
        return res.status(200).json({ alerts });
    } catch (error) {
        console.error('Error fetching live alerts:', error);
        return res.status(500).json({ message: 'Failed to fetch alerts.' });
    }
};

// DELETE /alerts/:id - remove alert by id
const removeAlertById = async (req, res) => {
    try {
        const alertId = req.params.id;
        if (!alertId) return res.status(400).json({ message: 'Missing alert id.' });
        // Fetch the alert first so we can log its name
        const alert = await Alert.findById(alertId).lean();
        if (!alert) return res.status(404).json({ message: 'Alert not found.' });
        await Alert.findByIdAndDelete(alertId);
        try {
            const name = alert.alertName || `ID:${alertId}`;
            await User_Log.addLog(req.user ? req.user._id : null, 'Alert_Deleted', `Alert "${name}" deleted.`);
        } catch (logErr) {
            console.error('Failed to write user log for alert deletion:', logErr);
        }
        return res.status(200).json({ message: 'Alert removed.' });
    } catch (error) {
        console.error('Error removing alert:', error);
        return res.status(500).json({ message: 'Failed to remove alert.' });
    }
};

// PUT /alerts/:id - update an existing alert
const updateAlertById = async (req, res) => {
    try {
        const alertId = req.params.id;
        const update = req.body;
        if (!alertId) return res.status(400).json({ message: 'Missing alert id.' });
        // Prevent changing immutable fields accidentally
        delete update._id;
        // Load the existing alert so we can log the name change
        const existing = await Alert.findById(alertId).lean();
        if (!existing) return res.status(404).json({ message: 'Alert not found.' });
        const oldName = existing.alertName || `ID:${alertId}`;

        // Normalize alertRule
        if (update.alertRule) {
            try {
                update.alertRule = Alert.convertToJSONFormat(update.alertRule);
            } catch (err) {
                return res.status(400).json({ message: 'Invalid alert rule: ' + err.message });
            }
        }

        const updated = await Alert.findByIdAndUpdate(alertId, update, { new: true });

        // Build a concise diff of what changed
        try {
            const fieldsToCheck = ['alertName', 'alertLevel', 'alertRule', 'modelName'];

            const stableStringify = (obj) => {
                const seen = new WeakSet();
                const stringifySorted = (v) => {
                    if (v === null || typeof v !== 'object') return JSON.stringify(v);
                    if (seen.has(v)) return '"[Circular]"';
                    seen.add(v);
                    if (Array.isArray(v)) return '[' + v.map(stringifySorted).join(',') + ']';
                    const keys = Object.keys(v).sort();
                    return '{' + keys.map(k => JSON.stringify(k) + ':' + stringifySorted(v[k])).join(',') + '}';
                };
                return stringifySorted(obj);
            };

            const short = (s, max = 200) => {
                if (s === undefined) return 'undefined';
                if (s === null) return 'null';
                const str = typeof s === 'string' ? s : JSON.stringify(s);
                return str.length > max ? str.slice(0, max) + '...' : str;
            };

            const changes = [];
            fieldsToCheck.forEach(field => {
                const before = existing[field];
                const after = updated[field];
                if (field === 'alertRule') {
                    const beforeReadable = Alert.convertToHumanFormat(before);
                    const afterReadable = Alert.convertToHumanFormat(after);
                    if (beforeReadable !== afterReadable) {
                        changes.push(`${field}: ${beforeReadable} -> ${afterReadable}`);
                    }
                } else {
                    const beforeStr = stableStringify(before);
                    const afterStr = stableStringify(after);
                    if (beforeStr !== afterStr) {
                        const beforeFmt = short(before);
                        const afterFmt = short(after);
                        changes.push(`${field}: ${beforeFmt} -> ${afterFmt}`);
                    }
                }
            });

            const detail = changes.length ? changes.join('; ') : 'no fields changed';
            const newName = updated && updated.alertName ? updated.alertName : oldName;
            await User_Log.addLog(req.user ? req.user._id : null, 'Alert_Modified', `Changes: ${detail}`);
        } catch (logErr) {
            console.error('Failed to write user log for alert update:', logErr);
        }

        return res.status(200).json({ message: 'Alert updated.', alert: updated });
    } catch (error) {
        console.error('Error updating alert:', error);
        return res.status(500).json({ message: 'Failed to update alert.' });
    }
};

// GET /alerts/unread-count - return number of AlertLog entries newer than user's last seen (for notifications)
const getUnreadCount = async (req, res) => {
    try {
        if (!req.user) return res.status(200).json({ unread: 0 });
        const userId = req.user._id;
        const user = await User.findById(userId).lean();
        const lastSeen = user && user.alertsLastSeen ? new Date(user.alertsLastSeen) : new Date(0);
        const count = await AlertLog.countDocuments({ timestamp: { $gt: lastSeen } });
        return res.status(200).json({ unread: count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return res.status(500).json({ unread: 0 });
    }
};

// POST /alerts/mark-read - mark all alerts as read for current user (for notifications)
const markAlertsRead = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
        const userId = req.user._id;
        await User.findByIdAndUpdate(userId, { alertsLastSeen: new Date() });
        return res.status(200).json({ message: 'Marked read' });
    } catch (error) {
        console.error('Error marking alerts read:', error);
        return res.status(500).json({ message: 'Failed to mark read' });
    }
};

export default { 
    getPage, 
    createAlert, 
    getLiveAlerts, 
    getAlertHistory,
    removeAlertById, 
    updateAlertById, 
    getUnreadCount, 
    markAlertsRead 
};