import mongoose from 'mongoose';

// === AI_Log Schema ===
const AI_Log_Schema = new mongoose.Schema({
    modelName: {
        type: String,
        required: true
    },
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
    energyConsumption: {
        type: Number,
        required: true,
        default: 0
    },
    responseTimestamp: {
        type: Number,
        required: true,
        default: () => new Date().getTime()
    }
});

// ---------- QUERIES ----------

// Add a single log
AI_Log_Schema.statics.addLog = function(logData) {
    const log = new this(logData);
    return log.save();
};

// Add multiple logs at once
AI_Log_Schema.statics.addLogs = function(logsArray) {
    return this.insertMany(logsArray);
};

// Get all logs by modelID
AI_Log_Schema.statics.getLogsByModel = function(modelID) {
    return this.find({ modelID });
};

// Get logs by modelID between two timestamps (start or end can be null)
AI_Log_Schema.statics.getLogsByModelAndTime = function(modelID, start = null, end = null) {
    const query = { modelID };
    if (start !== null || end !== null) {
        query.responseTimestamp = {};
        if (start !== null) query.responseTimestamp.$gte = start;
        if (end !== null) query.responseTimestamp.$lte = end;
    }
    return this.find(query);
};

// Remove a single log by its ID
AI_Log_Schema.statics.removeLogById = function(logID) {
    return this.findByIdAndDelete(logID);
};

// Remove all logs for a model
AI_Log_Schema.statics.removeLogsByModel = function(modelID) {
    return this.deleteMany({ modelID });
};

// ---------- EXPORT ----------
const AI_Log_Model = mongoose.model('AI_Logs', AI_Log_Schema);

export default AI_Log_Model;
