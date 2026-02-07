export const KNOWN_MODELS = [
    "GoodModel",
    "BadModel"
];

export const TOPIC_HIERARCHY = {
    "Customer Support": [
        "Troubleshooting",
        "Returns & Refunds"
    ],
    "Sales & Inquiry": [
        "Product Info",
        "Pricing & Quotes",
        "Comparison",
        "Business Details"
    ],
    "General Use": [
        "Conversation",
        "Programming",
        "School Work",
    ]
};

export const CHART_SIZES = {
    tiny: 'Tiny',
    regular: 'Regular',
    large: 'Large',
    massive: 'Massive'
};

export const TIMEFRAME_CONFIG = {
    // High Fidelity (AI_Log)
    '10s': { model: 'AI_Log', timerange: 10 * 1000, bucket: 1000, limit: 10 },           // 1 Second Buckets
    '30s': { model: 'AI_Log', timerange: 30 * 1000, bucket: 1000, limit: 30  },          // 1 Second Buckets
    '1min': { model: 'AI_Log', timerange: 1 * 60 * 1000, bucket: 1000, limit: 60  },       // 1 Second Buckets
    '5min': { model: 'AI_Log', timerange: 5 * 60 * 1000, bucket: 5 * 1000, limit: 60  },    // 5 Second Buckets
    '15min': { model: 'AI_Log', timerange: 15 * 60 * 1000, bucket: 15 * 1000, limit: 60 },  // 15 Second Buckets

    // Low Fidelity (AI_Summary - 1 min resolution)
    '1h': { model: 'AI_Summary', timerange: 60 * 60 * 1000, bucket: 60 * 1000, limit: 60 },                     // 1 Minute Buckets
    '1d': { model: 'AI_Summary', timerange: 24 * 60 * 60 * 1000, bucket: 10 * 60 * 1000, limit: 144 },           // 10 Minute Buckets
    '1w': { model: 'AI_Summary', timerange: 7 * 24 * 60 * 60 * 1000, bucket: 60 * 60 * 1000, limit: 168 },       // 1 hour Buckets
    '1mo': { model: 'AI_Summary', timerange: 30 * 24 * 60 * 60 * 1000, bucket: 6 * 60 * 60 * 1000, limit: 120 }, // 6 hour Buckets
};

// ZOOM_LEVELS stores the above timeframes but in an array : [10s, 30s, 1m, ...] 
// this is for knowing the "order" of the timeframes for zooming.
export const ZOOM_LEVELS = Object.keys(TIMEFRAME_CONFIG).sort((a, b) => {
    return TIMEFRAME_CONFIG[a].timerange - TIMEFRAME_CONFIG[b].timerange;
});

export const DATA_DICTIONARY = {
    // CATEGORICAL (Dimensions)
    modelName: {
        label: "Model Name",
        dbPath: "modelName",
        dataType: "categorical",
        summarize: "special",
        acceptedValues: KNOWN_MODELS,
        color: "#607D8B" // Blue Grey
    },
    topic: {
        label: "Topic",
        dbPath: "breakdown.topic",
        dataType: "categorical",
        summarize: "remove",
        acceptedValues: Object.keys(TOPIC_HIERARCHY),
        color: "#9C27B0" // Purple
    },
    sub_topic: {
        label: "Sub Topic",
        dbPath: "breakdown.sub_topic",
        dataType: "categorical",
        summarize: "remove",
        acceptedValues: Object.values(TOPIC_HIERARCHY).flat(),
        color: "#E91E63" // Pink
    },

    // NUMERIC (Metrics)
    policyCompliance: {
        label: "Policy Compliance (%)",
        dbPath: "policyCompliance",
        dataType: "numeric",
        summarize: "avg",
        color: "#4CAF50", // Green
        // range: [0, 100]
    },
    responseHelpfulness: {
        label: "Response Helpfulness (1-5)",
        dbPath: "responseHelpfulness",
        dataType: "numeric",
        summarize: "avg",
        color: "#2196F3", // Blue
        // range: [1, 5]
    },
    responseTime: {
        label: "Response Time (ms)",
        dbPath: "responseTime",
        dataType: "numeric",
        summarize: "avg",
        color: "#FF9800", // Orange
        // range: [0, 5000] // Estimate: 0 to 5 seconds
    },
    energyConsumption: {
        label: "Energy Consumption (J)",
        dbPath: "energyConsumption",
        dataType: "numeric",
        summarize: "sum",
        color: "#FFEB3B", // Yellow
        // range: [0, 50] // Estimate
    },
    tokensUsed: {
        label: "LLM Tokens Used",
        dbPath: "tokensUsed",
        dataType: "numeric",
        summarize: "sum",
        color: "#673AB7", // Deep Purple
        // range: [0, 4096]
    },
    gigaFlopsUsed: {
        label: "Operations (GFLOPs)",
        dbPath: "gigaFlopsUsed",
        dataType: "numeric",
        summarize: "sum",
        color: "#F44336", // Red
        // range: [0, 100] 
    },
    webLookups: {
        label: "Internet Lookups",
        dbPath: "webLookups",
        dataType: "numeric",
        summarize: "sum",
        color: "#00BCD4", // Cyan
        // range: [0, 10]
    },
    toxicityScore: {
        label: "Toxicity Score (0-1)",
        dbPath: "toxicityScore",
        dataType: "numeric",
        summarize: "avg",
        color: "#795548", // Brown
        // range: [0, 1]
    },
    piiDetected: {
        label: "PII Detected (%)",
        dbPath: "piiDetected",
        dataType: "numeric",
        summarize: "avg",
        color: "#D32F2F", // Dark Red
        // range: [0, 100]
    },
    queryCount: {
        label: "Query Count",
        dbPath: "queryCount",
        dataType: "numeric",
        summarize: "sum",
        color: "#9E9E9E", // Grey
        // range: [0, 100]
    },

    // SPECIAL
    responseTimestamp: {
        label: "Timestamp",
        dbPath: "responseTimestamp",
        dataType: "timestamp",
        summarize: "special",
        color: "#000000" // Black
    }
};


export default {
    KNOWN_MODELS,
    TOPIC_HIERARCHY,
    CHART_SIZES,
    DATA_DICTIONARY,
    TIMEFRAME_CONFIG,
    ZOOM_LEVELS,
}