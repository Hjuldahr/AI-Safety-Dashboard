import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
    policyCompliance: {
        type: Float,
        required: true,
        default: 0
    },
    responseHelpfulness: {
        type: Float,
        required: true,
        default: 0
    },
    responseTime: {
        type: Float,
        required: true,
        default: 0
    },
    energyConsumption: {
        type: Float,
        required: true,
        default: 0
    },
    responseTimestamp: {
        type: String,
        required: true,
        default: new Date().toISOString()
    }
}); 

const Log = mongoose.model('Log', LogSchema);

export default Log;