import mongoose from 'mongoose';

// === alert_model Schema ===
const alert_model_Schema = new mongoose.Schema({
    // Name of the alert
    alertName: {
        type: String,
        required: true
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
    // Timestamp of when the alert was last triggered.
    lastTrigger: {
        type: Date,
        required: false,
        default: null
    },
    // Boolean true or false for active/inactive
    isActive: {
        type: Boolean,
        required: true,
        default: false
    }
});

// ---------- QUERIES ----------

// Add an alert
alert_model_Schema.statics.addAlert = function(alertData) {
    const alert = new this(alertData);
    return alert.save();
};

// Remove a single alert by its ID
alert_model_Schema.statics.removeAlertById = function(alertID) {
    return this.findByIdAndDelete(alertID);
};

// ---------- EXPORT ----------
const alert_model = mongoose.model('Alert', alert_model_Schema);

export default alert_model;
