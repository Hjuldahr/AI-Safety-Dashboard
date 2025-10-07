import mongoose from 'mongoose';

const ModelCallSchema = new mongoose.Schema({
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

const ModelCall = mongoose.model('ModelCall', ModelCallSchema);

export default Log;