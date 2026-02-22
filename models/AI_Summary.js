import mongoose from 'mongoose';
import { KNOWN_MODELS, DATA_DICTIONARY } from "../constants/charts.js";

// === AI_Summary Schema ===
const schemaDefinition = {
    flaggedOutputs: { type: Object, default: {} }
};

Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
    if (key === 'responseTimestamp') {
        schemaDefinition[key] = { type: Number, required: true, default: () => Date.now() };
    } else if (config.dataType === 'numeric') {
        schemaDefinition[key] = {
            type: Number,
            required: true,
            default: key === 'queryCount' ? 1 : 0
        };
    } else if (config.dataType === 'categorical') {
        if (key === 'modelName') {
            schemaDefinition[key] = { type: String, required: true, enum: config.acceptedValues };
        } else{
            // Do nothing - only modelName is saved, no topic or sub topic
        }
    }
});

const AI_Summary_Schema = new mongoose.Schema(schemaDefinition);

// ---------- INDEXES ----------
AI_Summary_Schema.index({ modelName: 1, responseTimestamp: -1 });

// ---------- EXPORT ----------
const AI_Summary_Model = mongoose.model('AI_Summaries', AI_Summary_Schema);
export default AI_Summary_Model;