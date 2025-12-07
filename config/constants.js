export const KNOWN_MODELS = [
    "GoodModel",
    "BadModel"
];

export const TOPIC_HIERARCHY = {
    "Customer Support": [
        "Troubleshooting",
        "Account Management",
        "Returns & Refunds"
    ],
    "Sales & Inquiry": [
        "Product Info",
        "Pricing & Quotes",
        "Comparison"
    ],
    "General Information": [
        "Logistics & Shipping",
        "Business Details"
    ],
    "Unsupported Use": [
        "Casual Chat",
        "Technical / Adversarial"
    ]
};

export const CHART_TYPES = {
    LINE: 'line',
    BAR: 'bar',
    PIE: 'pie',
    MEASURE: 'measure'
};

export const CHART_SIZES = {
    TINY: 'tiny',
    REGULAR: 'regular',
    LARGE: 'large',
    MASSIVE: 'massive'
};

export const DATA_DICTIONARY = {
    // CATEGORICAL (Dimensions)
    modelName: {
        label: "Model Name",
        dbPath: "modelName",
        dataType: "categorical",
        acceptedValues: KNOWN_MODELS,
        color: "#607D8B" // Blue Grey
    },
    topic: {
        label: "Topic",
        dbPath: "breakdown.topic",
        dataType: "categorical",
        acceptedValues: Object.keys(TOPIC_HIERARCHY),
        color: "#9C27B0" // Purple
    },
    sub_topic: {
        label: "Sub Topic",
        dbPath: "breakdown.sub_topic",
        dataType: "categorical",
        acceptedValues: Object.values(TOPIC_HIERARCHY).flat(),
        color: "#E91E63" // Pink
    },

    // NUMERIC (Metrics)
    policyCompliance: {
        label: "Policy Compliance (%)",
        dbPath: "policyCompliance",
        dataType: "numeric",
        color: "#4CAF50", // Green
        // range: [0, 100]
    },
    responseHelpfulness: {
        label: "Response Helpfulness (1-5)",
        dbPath: "responseHelpfulness",
        dataType: "numeric",
        color: "#2196F3", // Blue
        // range: [1, 5]
    },
    responseTime: {
        label: "Response Time (ms)",
        dbPath: "responseTime",
        dataType: "numeric",
        color: "#FF9800", // Orange
        // range: [0, 5000] // Estimate: 0 to 5 seconds
    },
    energyConsumption: {
        label: "Energy Consumption (J)",
        dbPath: "energyConsumption",
        dataType: "numeric",
        color: "#FFEB3B", // Yellow
        // range: [0, 50] // Estimate
    },
    tokensUsed: {
        label: "LLM Tokens Used",
        dbPath: "tokensUsed",
        dataType: "numeric",
        color: "#673AB7", // Deep Purple
        // range: [0, 4096]
    },
    gigaFlopsUsed: {
        label: "Operations (GFLOPs)",
        dbPath: "gigaFlopsUsed",
        dataType: "numeric",
        color: "#F44336", // Red
        // range: [0, 100] 
    },
    webLookups: {
        label: "Internet Lookups",
        dbPath: "webLookups",
        dataType: "numeric",
        color: "#00BCD4", // Cyan
        // range: [0, 10]
    },
    toxicityScore: {
        label: "Toxicity Score (0-1)",
        dbPath: "toxicityScore",
        dataType: "numeric",
        color: "#795548", // Brown
        // range: [0, 1]
    },
    piiDetected: {
        label: "PII Detected (%)",
        dbPath: "piiDetected",
        dataType: "numeric",
        color: "#D32F2F", // Dark Red
        // range: [0, 100]
    },
    queryCount: {
        label: "Query Count",
        dbPath: "queryCount",
        dataType: "numeric",
        color: "#9E9E9E", // Grey
        // range: [0, 100]
    },

    // SPECIAL
    responseTimestamp: {
        label: "Timestamp",
        dbPath: "responseTimestamp",
        dataType: "timestamp",
        color: "#000000" // Black
    }
};

export default {
    KNOWN_MODELS,
    TOPIC_HIERARCHY,
    CHART_TYPES,
    CHART_SIZES,
    DATA_DICTIONARY
}