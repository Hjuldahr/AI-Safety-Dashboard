import mongoose from 'mongoose';

const { Schema } = mongoose;

const AlertLogSchema = new Schema({
    alert: {
        type: Schema.Types.ObjectId,
        ref: 'Alert',
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    }
});

module.exports = mongoose.model('AlertLog', AlertLogSchema);