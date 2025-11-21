import mongoose from 'mongoose';

// === AI_Log Schema ===
const AI_Log_Schema = new mongoose.Schema({

    modelName: {
        type: String,
        required: true
    },

    // Core rating metrics
    policyCompliance: {
        type: Number,
        required: true,
        default: 0
    },
    responseHelpfulness: {
        type: Number,
        required: true,
        default: 0
    },
    responseTime: {
        type: Number,
        required: true,
        default: 0
    },

    // Energy usage (watt-seconds or joules)
    energyConsumption: {
        type: Number,
        equired: true,
        default: 0
    },

    // Token stats
    tokensUsed: {
        type: Number,
        required: true,
        default: 0
    },

    // Model compute estimates
    gigaFlopsUsed: {
        type: Number,
        required: true,
        default: 0
    },

    // Web lookup count
    webLookups: {
        type: Number,
        required: true,
        default: 0
    },

    // Toxicity Score
    toxicityScore: {
        type: Number,
        required: true,
        default: 0
    },

    // Personally Identifiable Information
    piiDetected: {
        type: Number,
        required: true,
        default: 0
    },

    // Summaries of Categorical Data, like topic and sub topic
    breakdown: {
        type: Object,
        default: {}
    },

    queryCount: {
        type: Number,
        required: true,
        default: 1
    },

    responseTimestamp: {
        type: Number,
        required: true,
        default: () => Date.now()
    }
});


// ---------- QUERIES ----------

// Add a single log
AI_Log_Schema.statics.addLog = function (logData) {
    return new this(logData).save();
};

// Add multiple logs
AI_Log_Schema.statics.addLogs = function (logsArray) {
    return this.insertMany(logsArray);
};

// Get logs for a model
AI_Log_Schema.statics.getLogsByModel = function (modelName) {
    return this.find({ modelName });
};

// Get logs for a model between timestamps
AI_Log_Schema.statics.getLogsByModelAndTime = function (modelName, start = null, end = null) {
    const query = { modelName };
    if (start !== null || end !== null) {
        query.responseTimestamp = {};
        if (start !== null) query.responseTimestamp.$gte = start;
        if (end !== null) query.responseTimestamp.$lte = end;
    }
    return this.find(query);
};

// Remove one log
AI_Log_Schema.statics.removeLogById = function (logID) {
    return this.findByIdAndDelete(logID);
};

// Remove all logs of a model
AI_Log_Schema.statics.removeLogsByModel = function (modelName) {
    return this.deleteMany({ modelName });
};

// ---------- EXPORT ----------
const AI_Log_Model = mongoose.model('AI_Logs', AI_Log_Schema);
export default AI_Log_Model;
