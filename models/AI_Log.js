import mongoose from 'mongoose';
import { KNOWN_MODELS } from '../config/constants.js';

// === AI_Log Schema ===
const AI_Log_Schema = new mongoose.Schema({

    modelName: {
        type: String,
        required: true,
        enum: KNOWN_MODELS
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
        required: true,
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

// ---------- INDEXES ----------
AI_Log_Schema.index({ modelName: 1, responseTimestamp: -1 });



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

// Summaries
AI_Log_Schema.statics.generateSixtySecondSummary = async function () {
    const oneMinuteAgo = Date.now() - 60000;

    return await this.aggregate([
        {
            // Filter for records from the last 60 seconds
            $match: {
                responseTimestamp: { $gte: oneMinuteAgo }
            }
        },
        {
            // Group by modelName and calculate averages
            $group: {
                _id: "$modelName",
                policyCompliance: { $avg: "$policyCompliance" },
                responseHelpfulness: { $avg: "$responseHelpfulness" },
                responseTime: { $avg: "$responseTime" },
                energyConsumption: { $avg: "$energyConsumption" },
                tokensUsed: { $avg: "$tokensUsed" },
                gigaFlopsUsed: { $avg: "$gigaFlopsUsed" },
                webLookups: { $avg: "$webLookups" },
                toxicityScore: { $avg: "$toxicityScore" },
                piiDetected: { $avg: "$piiDetected" },
                queryCount: { $sum: "$queryCount" } // We sum the count, not average it
            }
        },
        {
            // Reshape the output to match AI_Summary schema
            $project: {
                _id: 0,
                modelName: "$_id",
                policyCompliance: 1,
                responseHelpfulness: 1,
                responseTime: 1,
                energyConsumption: 1,
                tokensUsed: 1,
                gigaFlopsUsed: 1,
                webLookups: 1,
                toxicityScore: 1,
                piiDetected: 1,
                queryCount: 1,
                responseTimestamp: { $literal: Date.now() }
            }
        }
    ]);
};


// ---------- EXPORT ----------
const AI_Log_Model = mongoose.model('AI_Logs', AI_Log_Schema);
export default AI_Log_Model;
