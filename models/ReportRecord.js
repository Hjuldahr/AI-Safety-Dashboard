import mongoose from 'mongoose';

const reportRecordSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    modelName: {
        type: String,
        required: true
    },
    startDate: {
        type: String,
        required: true
    },
    endDate: {
        type: String,
        required: true
    },
    fields: [{
        type: String
    }],
    fidelity: {
        type: String,
        enum: ['high', 'low', 'split'],
        default: 'high'
    },
    pdfFilename: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

reportRecordSchema.index({ createdAt: -1 });

const ReportRecord = mongoose.model('ReportRecord', reportRecordSchema);
export default ReportRecord;
