import mongoose from 'mongoose';

const reportTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    icon: {
        type: String,
        default: ''
    },
    fields: [{
        type: String
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ReportTemplate = mongoose.model('ReportTemplate', reportTemplateSchema);
export default ReportTemplate;
