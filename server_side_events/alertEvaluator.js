import Alert from "../models/alert_model.js";
import AlertLog from "../models/alert_log.js";
import { broadcastEvent } from './scheduler.js';

export default async function evaluateAlerts(logsMap, options = {}) {
    const { cooldownMs = 60000 } = options;
    if (!logsMap || Object.keys(logsMap).length === 0) return;

    let alerts;
    try {
        alerts = await Alert.find().populate('tags').lean();
    } catch (err) {
        console.error('[AlertEvaluator] Failed to fetch alerts:', err);
        return;
    }

    const now = Date.now();

    for (const alert of alerts) {
        // Identify which models to check
        let candidates = [];
        if (alert.modelName) {
            // Specific Alert: Only check the named model
            if (logsMap[alert.modelName]) candidates.push(logsMap[alert.modelName]);
        } else {
            // Global Alert: Check all models in this batch
            candidates = Object.values(logsMap);
        }

        // Collect ALL matches for this specific alert
        const matchingLogs = [];
        for (const log of candidates) {
            if (evaluateRule(alert.alertRule, log)) {
                matchingLogs.push(log);
            }
        }

        // If no models triggered this alert, move to the next alert
        if (matchingLogs.length === 0) continue;

        // Groups model logs that are close together in time - so there is only one Alert_Log obj
        if (cooldownMs > 0) {
            try {
                const last = await AlertLog.findOne({ alert: alert._id })
                    .sort({ timestamp: -1 })
                    .lean();

                if (last && (now - new Date(last.timestamp).getTime()) < cooldownMs) {
                    continue; // Skip if we alerted on this rule recently
                }
            } catch (err) {
                console.error('[AlertEvaluator] Cooldown check failed', err);
            }
        }

        // ToDo: Create the HistoricalTag Obj
        
        // ToDo: Stamp the AI_Log with the HistoricalTag

        // Create on AlertLog for all matches
        try {
            const triggeredModelNames = matchingLogs.map(l => l.modelName);
            const modelLabel = triggeredModelNames.join(', ');

            const snapshot = {
                _id: alert._id,
                alertName: alert.alertName,
                alertLevel: alert.alertLevel,
                modelName: modelLabel,
                alertRule: alert.alertRule,
                created: alert.created
            };

            const created = await AlertLog.create({
                alert: alert._id,
                alertSnapshot: snapshot,
                tags: alert.tags || [],
                logs: matchingLogs.map(l => l._id)
            });

            // Broadcast
            broadcastEvent('alert', {
                _id: created._id,
                alert: created.alert,
                timestamp: created.timestamp,
                alertSnapshot: created.alertSnapshot,
                humanRule: Alert.convertToHumanFormat(created.alertSnapshot.alertRule),
                tags: alert.tags || []
            });
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

    // Simpler Value Getter: Strict path only. 
    // No more fuzzy searching through parents/children.
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