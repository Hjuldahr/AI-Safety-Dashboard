import mongoose from 'mongoose';
import { KNOWN_MODELS } from '../config/constants.js';

// === AI_Summary Schema ===
const AI_Summary_Schema = new mongoose.Schema({

    modelName: {
        type: String,
        required: true,
        enum: KNOWN_MODELS
    },

    // Core rating metrics
    policyCompliance: {
        type: Number,
        required: true,
        default: 0
    },
    responseHelpfulness: {
        type: Number,
        required: true,
        default: 0
    },
    responseTime: {
        type: Number,
        required: true,
        default: 0
    },

    // Energy usage (watt-seconds or joules)
    energyConsumption: {
        type: Number,
        required: true,
        default: 0
    },

    // Token stats
    tokensUsed: {
        type: Number,
        required: true,
        default: 0
    },

    // Model compute estimates
    gigaFlopsUsed: {
        type: Number,
        required: true,
        default: 0
    },

    // Web lookup count
    webLookups: {
        type: Number,
        required: true,
        default: 0
    },

    // Toxicity Score
    toxicityScore: {
        type: Number,
        required: true,
        default: 0
    },

    // Personally Identifiable Information
    piiDetected: {
        type: Number,
        required: true,
        default: 0
    },

    queryCount: {
        type: Number,
        required: true,
        default: 1
    },

    responseTimestamp: {
        type: Number,
        required: true,
        default: () => Date.now()
    }
});

// ---------- INDEXES ----------
AI_Summary_Schema.index({ modelName: 1, responseTimestamp: -1 });

// ---------- EXPORT ----------
const AI_Summary_Model = mongoose.model('AI_Summaries', AI_Summary_Schema);
export default AI_Summary_Model;