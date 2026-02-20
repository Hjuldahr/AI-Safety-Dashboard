import mongoose from 'mongoose';
import { KNOWN_MODELS, DATA_DICTIONARY } from '../config/constants.js';

// === AI_Log Schema ===
const schemaDefinition = {};

Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
    if (key === 'responseTimestamp') {
        schemaDefinition[key] = { type: Number, required: true, default: () => Date.now() };
    } else if (config.dataType === 'numeric') {
        schemaDefinition[key] = {
            type: Number,
            required: true,
            default: key === 'queryCount' ? 1 : 0
        };
    }
    else if (config.dataType === 'categorical') {
        if (key === 'modelName') {
            schemaDefinition[key] = { type: String, required: true, enum: config.acceptedValues };
        } else {
            // "breakdown" logic for other categoricals
            schemaDefinition.breakdown = { type: Object, default: {} };
        }
    }
    else if (config.dataType === 'flagged_outputs') {
        schemaDefinition[key] = { type: Object, default: {} };
    }
});

const AI_Log_Schema = new mongoose.Schema(schemaDefinition);

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


/**
 * Summaries:
 * Uses DATA_DICTIONARY from constants.js to figure out what
 * values need to be averaged and which need to be summarized.
 * @returns 
 */
AI_Log_Schema.statics.generateSixtySecondSummary = async function () {
    const oneMinuteAgo = Date.now() - 60000;

    // Group By Model Name
    const groupStage = {
        _id: "$modelName"
    };

    // Set the new ID, and timestamp
    const projectStage = {
        _id: 0,
        modelName: "$_id",
        responseTimestamp: { $literal: Date.now() }
    };

    // Iterate through the dictionary to populate stages
    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
        // Skip fields that shouldn't be in the summary or are special
        if (config.summarize === "remove" || config.summarize === "special") {
            return;
        }
        if (config.summarize === "flagged_outputs") {
            //TODO adjust so its not producing a list of 1 object
            groupStage[key] = { $push: "$flaggedOutputs" };
            projectStage[key] = { $let: {
                vars: { flat: {
                    $reduce: {
                    input: `$${key}`,
                    initialValue: [],
                    in: { $concatArrays: ["$$value", "$$this"] }
                    }
                }},
                in: { $arrayToObject: { $map: {
                    input: { $setUnion: { $map: {
                            input: "$$flat",
                            as: "f",
                            in: "$$f.severity"
                    }}},
                    as: "sev", in: {
                        k: "$$sev",
                        v: { $size: { $filter: {
                                input: "$$flat",
                                cond: { $eq: ["$$this.severity", "$$sev"] }
                        }}}
                    }}
                }}
            }};
            return;
        }

        // Map "avg" -> "$avg", "sum" -> "$sum"
        const mongoOp = `$${config.summarize}`; 
        
        // Add to group stage: e.g., tokensUsed: { $sum: "$tokensUsed" }
        groupStage[key] = { [mongoOp]: `$${key}` };

        // Add to project stage: e.g., tokensUsed: 1
        projectStage[key] = 1;
    });

    return await this.aggregate([
        {
            $match: {
                responseTimestamp: { $gte: oneMinuteAgo }
            }
        },
        { $group: groupStage },
        { $project: projectStage }
    ]);
};


// ---------- EXPORT ----------
const AI_Log_Model = mongoose.model('AI_Logs', AI_Log_Schema);
export default AI_Log_Model;
