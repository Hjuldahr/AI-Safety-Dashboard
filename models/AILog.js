import mongoose from 'mongoose';

const AIModelSchema = new mongoose.Schema({
    modelID: {
        type: String,
        required: true
    },
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

const AIModelCall = mongoose.model('ModelCall', ModelCallSchema);

//query 1 - get all models for user

//query 2 - get all logs for model

//query 3 - add logs to model

//query 4 - add model to user


export default Log;