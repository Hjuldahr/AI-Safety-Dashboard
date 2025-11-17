import mongoose from 'mongoose';

// === alert_model Schema ===
const alert_model_Schema = new mongoose.Schema({
    // Name of the alert
    alertName: {
        type: String,
        required: true
    },
    // Optional name of the model this alert targets
    modelName: {
        type: String,
        required: false,
        default: null
    },
    // Alert level (e.g., Critical, High, Medium, Info)
    alertLevel: {
        type: String,
        required: true,
        enum: ['Critical', 'High', 'Medium', 'Info'],
        default: 'Info'
    },
    // Boolean condition
    alertRule: {
        type: Object,
        required: true,
        default: {}
    },
    // Timestamp of when the alert was created
    created: {
        type: Date,
        required: true,
        default: () => new Date().getTime()
    },
});

// ---------- Helper / Statics ----------
const displayToDbField = {
    'Policy Compliance': 'policyCompliance',
    'Response Helpfulness': 'responseHelpfulness',
    'Response Time': 'responseTime',
    'Energy Consumption': 'energyConsumption'
};
const dbToDisplayField = Object.keys(displayToDbField).reduce((acc, k) => {
    acc[displayToDbField[k]] = k;
    return acc;
}, {});

const allowedOps = new Set(['$gt', '$gte', '$lt', '$lte', '$eq']);

function mapFieldName(field) {
    if (!field) return null;
    if (Object.values(displayToDbField).includes(field)) return field; // already db name
    if (displayToDbField[field]) return displayToDbField[field];
    return null;
}

function normalizeCondition(cond) {
    if (!cond || typeof cond !== 'object' || Array.isArray(cond)) throw new Error('Invalid condition');
    const keys = Object.keys(cond);
    if (keys.length !== 1) throw new Error('Condition must have exactly one field');
    const rawField = keys[0];
    const dbField = mapFieldName(rawField);
    if (!dbField) throw new Error(`Unknown field: ${rawField}`);
    const opObj = cond[rawField];
    if (!opObj || typeof opObj !== 'object') throw new Error('Invalid operator object');
    const opKeys = Object.keys(opObj);
    if (opKeys.length !== 1) throw new Error('Operator object must have exactly one operator');
    const opKey = opKeys[0];
    if (!allowedOps.has(opKey)) throw new Error(`Unsupported operator: ${opKey}`);
    const rawValue = opObj[opKey];
    const num = Number(rawValue);
    if (Number.isNaN(num)) throw new Error('Condition value must be a number');
    const out = {};
    out[dbField] = {};
    out[dbField][opKey] = num;
    return out;
}

/**
 * Statics: convert a client-provided rule into a validated Mongo-style rule.
 * Accepts either a single condition (e.g. { 'Response Time': { '$gt': '100' } })
 * or a wrapper { $and: [ ... ] } / { $or: [ ... ] } where each part is a condition.
 */
alert_model_Schema.statics.convertToJSONFormat = function (input) {
    if (!input || typeof input !== 'object') throw new Error('Missing rule');
    const keys = Object.keys(input);
    if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) {
        const arr = input[keys[0]];
        if (!Array.isArray(arr) || arr.length === 0) throw new Error('Logical operator must wrap a non-empty array');
        const parts = arr.map((p) => normalizeCondition(p));
        const out = {};
        out[keys[0]] = parts;
        return out;
    }
    // single condition
    return normalizeCondition(input);
};

/**
 * Statics: convert a stored Mongo-style rule object into a human readable string.
 */
alert_model_Schema.statics.convertToHumanFormat = function (rule) {
    if (!rule || typeof rule !== 'object') return '';
    const opWords = {
        '$gt': 'greater than',
        '$gte': 'greater than or equal to',
        '$lt': 'less than',
        '$lte': 'less than or equal to',
        '$eq': 'equal to'
    };

    const makePhrase = (cond) => {
        const field = Object.keys(cond)[0];
        const opObj = cond[field];
        const opKey = Object.keys(opObj)[0];
        const val = opObj[opKey];
        const display = dbToDisplayField[field] || field;
        const word = opWords[opKey] || opKey;
        return `"${display}" ${word} ${val}`;
    };

    const keys = Object.keys(rule);
    if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) {
        const parts = rule[keys[0]];
        const conj = keys[0] === '$and' ? ' AND ' : ' OR ';
        return parts.map(makePhrase).join(conj) + '.';
    }

    try {
        return makePhrase(rule) + '.';
    } catch (e) {
        return JSON.stringify(rule);
    }
};

// ---------- EXPORT ----------
const alert_model = mongoose.model('Alert', alert_model_Schema);

export default alert_model;
