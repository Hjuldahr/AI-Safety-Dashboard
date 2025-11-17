import Alert from "../models/alert_model.js";
import AlertLog from "../models/alert_log.js";
import { broadcastEvent } from './scheduler.js';

export default async function evaluateAlerts(data, options = {}) {
    const { cooldownMs = 60000 } = options;
    if (!data || typeof data !== 'object') return;

    let alerts;
    try {
        alerts = await Alert.find().lean();
    } catch (err) {
        console.error('[AlertEvaluator] Failed to fetch alerts:', err);
        return;
    }

    const now = Date.now();

    for (const alert of alerts) {
        try {
            if (!alert || !alert.alertRule) continue;
            const matched = evaluateRule(alert.alertRule, data);
            if (!matched) continue;

            // cooldown check: skip if last fired within cooldownMs
            if (cooldownMs > 0) {
                try {
                    const last = await AlertLog.findOne({ alert: alert._id }).sort({ timestamp: -1 }).lean();
                    if (last && (now - new Date(last.timestamp).getTime()) < cooldownMs) {
                        continue;
                    }
                } catch (qErr) {
                    console.error('[AlertEvaluator] Failed to query AlertLog for cooldown check:', qErr);
                }
            }

            // create alert log (and snapshot if alert is removed)
            try {
                const snapshot = {
                    _id: alert._id,
                    alertName: alert.alertName,
                    alertLevel: alert.alertLevel,
                    alertRule: alert.alertRule,
                    created: alert.created
                };
                try {
                    const created = await AlertLog.create({ alert: alert._id, alertSnapshot: snapshot });
                    // Emit SSE 'alert' event with basic info
                    try {
                        const payload = {
                            _id: created._id,
                            alert: created.alert,
                            timestamp: created.timestamp,
                            alertSnapshot: created.alertSnapshot
                        };
                        broadcastEvent('alert', payload);
                    } catch (emitErr) {
                        console.error('[AlertEvaluator] Failed to broadcast alert SSE:', emitErr);
                    }
                } catch (createErr) {
                    console.error('[AlertEvaluator] Failed to create AlertLog for', alert._id, createErr);
                }
            } catch (createErr) {
                console.error('[AlertEvaluator] Failed to create AlertLog for', alert._id, createErr);
            }
        } catch (inner) {
            console.error('[AlertEvaluator] Error evaluating alert', alert && alert._id, inner);
        }
    }
}

// ---------- Helper: evaluateRule ----------
function evaluateRule(rule, data) {
    if (!rule || typeof rule !== 'object') return false;
    const keys = Object.keys(rule);
    if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) {
        const arr = rule[keys[0]];
        if (!Array.isArray(arr) || arr.length === 0) return false;
        if (keys[0] === '$and') return arr.every(r => evaluateRule(r, data));
        return arr.some(r => evaluateRule(r, data));
    }

    const field = keys[0];
    const opObj = rule[field];
    if (!opObj || typeof opObj !== 'object') return false;
    const op = Object.keys(opObj)[0];
    const val = opObj[op];

    if (data[field] === undefined || data[field] === null) return false;

    const actual = Number(data[field]);
    const expected = Number(val);
    if (Number.isNaN(actual) || Number.isNaN(expected)) return false;

    switch (op) {
        case '$gt': return actual > expected;
        case '$gte': return actual >= expected;
        case '$lt': return actual < expected;
        case '$lte': return actual <= expected;
        case '$eq': return actual === expected;
        default: return false;
    }
}
