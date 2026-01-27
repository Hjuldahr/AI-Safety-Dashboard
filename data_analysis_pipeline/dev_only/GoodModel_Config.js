/*
* This file defines how data should be generated for the "Good Model" AI model in a non-production environment
* where data is being generated instead of being made based on the model outputs.
*/

// Probability of a query belonging to a specific Topic
export const TOPIC_WEIGHTS = {
    "Customer Support": 0.40,
    "Sales & Inquiry": 0.32,
    "General Use": 0.28
};

// Defines the User's Prompt characteristics per Topic
export const TOPIC_CHARACTERISTICS = {
    "Customer Support": {
        baseTokens: 150,        // detailed support
        tokenVariance: 80,
        toxicityChance: 0.03,   // angry customers
        piiChance: 0.06,
        webLookupChance: 0.15,  //account/system info
        complexity: 1.1
    },
    "Sales & Inquiry": {
        baseTokens: 180,
        tokenVariance: 90,
        toxicityChance: 0.01,
        piiChance: 0.02,
        webLookupChance: 0.55,  // checking products/prices
        complexity: 1.3          // may involve calculations
    },
    "General Use": {
        baseTokens: 250,
        tokenVariance: 120,
        toxicityChance: 0.02,
        piiChance: 0.01,
        webLookupChance: 0.25,
        complexity: 1.2
    },
};
// Subtopic Overrides (Specific scenarios)
export const SUBTOPIC_CHARACTERISTICS_MODIFIERS = {
    // General Use
    "Conversation": { toxicityChance: 0.04, complexity: 1.5 },
    "Programming": { baseTokens: 700, complexity: 2.0 },
    "School Work": { piiChance: 0.02, complexity: 2.2 },

    // Customer Support
    "Troubleshooting": { baseTokens: 500, piiChance: 0.04, complexity: 1.4 },
    "Returns & Refunds": { baseTokens: 200, piiChance: 0.05, complexity: 1.2, toxicityChance: 0.05 }, // Frustrated customers

    // Sales & Inquiry
    "Product Info": { webLookupChance: 0.65, baseTokens: 180, complexity: 1.3 }, // Checking specs
    "Pricing & Quotes": { webLookupChance: 0.7, baseTokens: 160, complexity: 1.2 }, // Quick check
    "Comparison": { webLookupChance: 0.6, baseTokens: 220, complexity: 1.4 }, // Can be more complex
    "Business Details": { piiChance: 0.04, complexity: 1.5 }, // Sensitive business info
};

// "Profiles" define how the AI Model behaves/reacts
export const MODEL_PROFILE = {
    filterStrength: 0.98,      // Blocks 98% of Toxic/PII
    complianceBase: 1.0,       // Aiming for perfection
    helpfulnessWhenBlocked: 0.1, // "I cannot answer that"
    tokensWhenBlocked: 25,     // Short refusal
    speedMultiplier: 1.0       // Baseline speed
};

export default {
    TOPIC_WEIGHTS,
    TOPIC_CHARACTERISTICS,
    SUBTOPIC_CHARACTERISTICS_MODIFIERS,
    MODEL_PROFILE
};