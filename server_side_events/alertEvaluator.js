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
            if (alert.modelName) {
                const name = String(alert.modelName);
                const candidates = new Set();
                if (data && typeof data === 'object') {
                    // Common direct fields
                    if (data.modelName) candidates.add(String(data.modelName));
                    if (data.model) candidates.add(String(data.model));
                    if (data.model && typeof data.model === 'object') {
                        if (data.model.name) candidates.add(String(data.model.name));
                        if (data.model.modelName) candidates.add(String(data.model.modelName));
                    }

                    // Check top-level named payloads (e.g. GoodModel, BadModel)
                    for (const k of Object.keys(data)) {
                        try {
                            // include the key name itself as a candidate
                            candidates.add(String(k));
                            const candidate = data[k];
                            if (candidate && typeof candidate === 'object') {
                                if (candidate.modelName) candidates.add(String(candidate.modelName));
                                if (candidate.model) candidates.add(String(candidate.model));
                                if (candidate.model && typeof candidate.model === 'object') {
                                    if (candidate.model.name) candidates.add(String(candidate.model.name));
                                    if (candidate.model.modelName) candidates.add(String(candidate.model.modelName));
                                }
                            }
                        } catch (e) {
                            // ignore malformed payloads
                        }
                    }
                }
                if (!Array.from(candidates).includes(name)) {
                    // incoming data is not from the model this alert targets
                    continue;
                }
            }
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
                    modelName: alert.modelName || null,
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

    // support nested/dotted field names like "GoodModel.responseTime"
    function getValueByPath(obj, path) {
        if (!obj || !path) return undefined;
        const parts = String(path).split('.');
        let cur = obj;
        for (const p of parts) {
            if (cur === undefined || cur === null) return undefined;
            cur = cur[p];
        }
        return cur;
    }

    let actualRaw = getValueByPath(data, field);
    // If not found at the top-level path, attempt to locate the field
    // inside any top-level object (e.g. data = { GoodModel: {...}, BadModel: {...} })
    if (actualRaw === undefined || actualRaw === null) {
        if (typeof field === 'string' && !field.includes('.')) {
            for (const k of Object.keys(data)) {
                try {
                    const candidate = data[k];
                    if (candidate && typeof candidate === 'object' && Object.prototype.hasOwnProperty.call(candidate, field)) {
                        actualRaw = candidate[field];
                        break;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    }
    if (actualRaw === undefined || actualRaw === null) return false;

    // Try numeric comparison first; if values are not numeric and op is $eq, fall back to string compare
    const actualNum = Number(actualRaw);
    const expectedNum = Number(val);
    const bothNumeric = !Number.isNaN(actualNum) && !Number.isNaN(expectedNum);

    if (!bothNumeric) {
        if (op === '$eq') {
            return String(actualRaw) === String(val);
        }
        // other comparison ops require numeric values
        return false;
    }

    switch (op) {
        case '$gt': return actualNum > expectedNum;
        case '$gte': return actualNum >= expectedNum;
        case '$lt': return actualNum < expectedNum;
        case '$lte': return actualNum <= expectedNum;
        case '$eq': return actualNum === expectedNum;
        default: return false;
    }
}
