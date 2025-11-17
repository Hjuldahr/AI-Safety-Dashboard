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
    created: Date
}, { _id: false });

// Schema for AlertLog
const AlertLogSchema = new Schema({
    alert: {
        type: Schema.Types.ObjectId,
        ref: 'Alert',
        required: true
    },
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