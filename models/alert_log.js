import mongoose from 'mongoose';

const { Schema } = mongoose;

// Snapshot schema to preserve log info if alert is modified/deleted
const AlertSnapshotSchema = new Schema({
    _id: {
        type: Schema.Types.ObjectId
    },
    alertName: String,
    alertLevel: String,
    // Optional model name the alert targets
    modelName: String,
    alertRule: Schema.Types.Mixed,
    // Preserve tags as simple objects at time of firing
    // (No longer preserving tags in the snapshot — tags are stored as refs on the log)
    created: Date
}, { _id: false });

// Schema for AlertLog
const AlertLogSchema = new Schema({

    alert: {
        type: Schema.Types.ObjectId,
        ref: 'Alert',
        required: true
    },

    // Current tags (refs) — may be empty; snapshot contains preserved tag objects
    tags: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],

    // AI Logs associated with the alert. There should always be 1, and max = number of AI models.
    logs: [{ type: mongoose.Schema.Types.ObjectId, ref: "AI_Logs" }],

    alertSnapshot: {
        type: AlertSnapshotSchema,
        required: false
    },

    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    }
    
});

const AlertLog = mongoose.model('AlertLog', AlertLogSchema);
export default AlertLog;