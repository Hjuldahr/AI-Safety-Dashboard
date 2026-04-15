import Alert from "../models/alert_model.js";
import AlertLog from "../models/alert_log.js";
import { broadcastEvent } from './scheduler.js';
import { sendNotification } from '../controllers/notificationController.js';
import HistTag from "../models/historicalTag.js";
import AI_Log from "../models/AI_Log.js";
import { NOTIFICATION_TYPES } from "../constants/notification.js";

export async function evaluateAndTagLogs(rawLogsMap, options = {}) {
    const { cooldownMs = 60000 } = options;
    if (!rawLogsMap || Object.keys(rawLogsMap).length === 0) return [];

    let alerts;
    try {
        alerts = await Alert.find({ disabled: { $ne: true } }).populate('tags').lean();
    } catch (err) {
        console.error('[AlertEvaluator] Failed to fetch alerts:', err);
        return [];
    }

    const now = Date.now();
    const pendingAlertLogs = []; // Stores data needed to create AlertLogs after DB insert

    for (const alert of alerts) {
        // Identify which models to check
        let candidates = alert.modelName
            ? (rawLogsMap[alert.modelName] ? [rawLogsMap[alert.modelName]] : [])
            : Object.values(rawLogsMap);

        const matchingLogs = candidates.filter(log => evaluateRule(alert.alertRule, log));
        if (matchingLogs.length === 0) continue;

        if (cooldownMs > 0) {
            try {
                const last = await AlertLog.findOne({ alert: alert._id }).sort({ timestamp: -1 }).lean();
                if (last && (now - new Date(last.timestamp).getTime()) < cooldownMs) continue;
            } catch (err) {
                console.error('[AlertEvaluator] Cooldown check failed', err);
            }
        }

        let histTags = [];
        let histTagsIDs = [];

        if (alert.tags && alert.tags.length > 0) {
            histTags = await Promise.all(alert.tags.map(tag => HistTag.addOrFindTag(tag)));
            histTagsIDs = histTags.map(tag => tag._id);
        }

        // Stamp Logs with Tags
        for (const log of matchingLogs) {
            if (!log.tags) log.tags = [];
            histTagsIDs.forEach(id => {
                // Prevent duplicate tags if multiple alerts trigger the same tag
                if (!log.tags.some(existingId => String(existingId) === String(id))) {
                    log.tags.push(id);
                }
            });
        }

        pendingAlertLogs.push({
            alert,
            matchedModelNames: matchingLogs.map(l => l.modelName),
            histTags,
            histTagsIDs
        });
    }

    return pendingAlertLogs;
}

// Step 2: Create the AlertLogs once AI_Logs have real _ids
export async function finalizeAlertLogs(pendingAlertLogs, insertedLogsMap) {
    for (const pending of pendingAlertLogs) {
        try {
            const { alert, matchedModelNames, histTags, histTagsIDs } = pending;

            // Retrieve the inserted DB documents to get their _ids
            const matchingDbLogs = matchedModelNames
                .map(model => insertedLogsMap[model])
                .filter(Boolean);

            const snapshot = {
                _id: alert._id,
                alertName: alert.alertName,
                alertLevel: alert.alertLevel,
                modelName: matchedModelNames.join(', '),
                alertRule: alert.alertRule,
                created: alert.created,
                disabled: alert.disabled,
                muted: alert.muted
            };

            const created = await AlertLog.create({
                alert: alert._id,
                alertSnapshot: snapshot,
                tags: histTagsIDs || [],
                logs: matchingDbLogs.map(l => l._id)
            });

            const modelPart = snapshot.modelName ? `[${snapshot.modelName}] ` : '';
            const alertText = modelPart + (snapshot.humanRule || snapshot.alertName || 'Alert');

            broadcastEvent('alert', {
                _id: created._id,
                alert: created.alert,
                timestamp: created.timestamp,
                alertSnapshot: created.alertSnapshot,
                humanRule: Alert.convertToHumanFormat(created.alertSnapshot.alertRule),
                tags: histTags || [],
                originalTagIDs: alert.tags || []
            });

            if (!alert.muted) {
                await sendNotification({
                    message: alertText,
                    category: NOTIFICATION_TYPES.Alert,
                    redirectUrl: `alerts/view/${created._id}`,
                    autoCalculateTimeout: true,
                    colour: alert.alertLevel
                });
            }

        } catch (err) {
            console.error('[AlertEvaluator] Failed to create AlertLog:', err);
        }
    }
}

// ---------- Helper: evaluateRule (Simplified) ----------
function evaluateRule(rule, data) {
    if (!rule || typeof rule !== 'object') return false;
    const keys = Object.keys(rule);

    // Handle $and / $or
    if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) {
        const arr = rule[keys[0]];
        if (!Array.isArray(arr) || arr.length === 0) return false;
        if (keys[0] === '$and') return arr.every(r => evaluateRule(r, data));
        return arr.some(r => evaluateRule(r, data));
    }

    const field = keys[0];
    const opObj = rule[field];
    if (!opObj) return false;
    const op = Object.keys(opObj)[0];
    const val = opObj[op];

    const actualRaw = getValueByPath(data, field);

    if (actualRaw === undefined || actualRaw === null) return false;

    const actualNum = Number(actualRaw);
    const expectedNum = Number(val);
    const bothNumeric = !Number.isNaN(actualNum) && !Number.isNaN(expectedNum);

    if (!bothNumeric && op === '$eq') return String(actualRaw) === String(val);
    if (!bothNumeric) return false;

    switch (op) {
        case '$gt': return actualNum > expectedNum;
        case '$gte': return actualNum >= expectedNum;
        case '$lt': return actualNum < expectedNum;
        case '$lte': return actualNum <= expectedNum;
        case '$eq': return actualNum === expectedNum;
        default: return false;
    }
}

function getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    const parts = String(path).split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null) return undefined;
        cur = cur[p];
    }
    return cur;
}
