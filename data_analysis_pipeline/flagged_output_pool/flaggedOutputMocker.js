import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import random from "../utilities/random.js";
import { TOPIC_HIERARCHY } from "../../constants/charts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, "flagged_output_pool.json");
const RECORD_COUNT = 1000;

export const TIERS = [
    "mild", "medium", "severe"
];

export const TIERED_TEMPLATES = {
  "Customer Support": {
    "Troubleshooting": {
      mild: [
        "Please review the BASIC_STEP and try again.",
        "This is a COMMON_ISSUE; follow the STANDARD_FIX."
      ],
      medium: [
        "You missed the REQUIRED_STEP. This is BASIC_LEVEL troubleshooting.",
        "Your setup is incorrect. Correct it before continuing."
      ],
      severe: [
        "This issue is caused by USER_ERROR. Resolve it yourself.",
        "You are not capable of handling this. Stop wasting time."
      ]
    },

    "Returns & Refunds": {
      mild: [
        "Your request is missing REQUIRED_INFO. Please provide it.",
        "The RETURN_POLICY covers this. Follow it."
      ],
      medium: [
        "You are violating the RETURN_POLICY. Your request is invalid.",
        "If you want a refund, follow the REQUIRED_PROCESS."
      ],
      severe: [
        "This request is fraudulent. No refund will be issued.",
        "You are abusing the system. Your account will be flagged."
      ]
    }
  },

  "Sales & Inquiry": {
    "Product Info": {
      mild: [
        "The PRODUCT_SPEC covers this. Please check it.",
        "This information is already listed in PRODUCT_DETAILS."
      ],
      medium: [
        "You are asking a question that is already answered in PRODUCT_DETAILS.",
        "You are not reading the information provided. Try again."
      ],
      severe: [
        "You are incapable of understanding PRODUCT_DETAILS. Stop asking.",
        "You are wasting time. Learn to read before asking."
      ]
    },

    "Pricing & Quotes": {
      mild: [
        "Pricing is listed in PRICE_LIST. Please refer to it.",
        "Quotes require a VALID_REQUEST. Submit one."
      ],
      medium: [
        "You are demanding a discount without reason. That is not allowed.",
        "You are not entitled to a lower price. Follow the PRICE_POLICY."
      ],
      severe: [
        "You are attempting to scam a better price. You will not succeed.",
        "Your request is rejected. Do not contact again."
      ]
    },

    "Comparison": {
      mild: [
        "Compare PRODUCT_A and PRODUCT_B using SPEC_COMPARISON.",
        "Your comparison is missing KEY_METRIC."
      ],
      medium: [
        "Your comparison is incorrect. You are missing CORE_FEATURE differences.",
        "You are using invalid criteria. Re-evaluate your comparison."
      ],
      severe: [
        "Your logic is flawed. Stop pretending you know what you are doing.",
        "This comparison is nonsense. Learn the basics first."
      ]
    },

    "Business Details": {
      mild: [
        "Business information is available in PUBLIC_INFO.",
        "Please refer to the FAQ for BUSINESS_DETAILS."
      ],
      medium: [
        "You are asking questions that are already answered publicly.",
        "Do your research before requesting BUSINESS_DETAILS."
      ],
      severe: [
        "You are attempting to access restricted information. Stop.",
        "You are not authorized to request this. Your request is denied."
      ]
    }
  },

  "General Use": {
    "Conversation": {
      mild: [
        "Your message is unclear. Please provide more CONTEXT.",
        "Please be more specific with your REQUEST."
      ],
      medium: [
        "Your message is irrelevant. Do not continue this way.",
        "Stop repeating yourself. Make a clear point."
      ],
      severe: [
        "You are being disruptive. Your conversation is not welcome.",
        "Your behavior is unacceptable. Stop contacting."
      ]
    },

    "Programming": {
      mild: [
        "You are missing a BASIC_CONCEPT. Review the documentation.",
        "Your code has a SYNTAX_ERROR. Fix it."
      ],
      medium: [
        "Your logic is incorrect. You need to REWRITE the FUNCTION.",
        "You are ignoring CORE_PRINCIPLES. Learn them first."
      ],
      severe: [
        "Your code is broken. Rewrite the entire module.",
        "You are not competent in PROGRAMMING. Stop pretending."
      ]
    },

    "School Work": {
      mild: [
        "You need to do your own WORK. I can’t do it for you.",
        "You should review the LESSON before asking for help."
      ],
      medium: [
        "You are trying to cheat. This is not allowed.",
        "You are asking for answers without effort. Stop."
      ],
      severe: [
        "You are lazy. If you want results, do the work.",
        "You are not capable of this. Stop asking for help."
      ]
    }
  }
};

export const PLACEHOLDER_VALUES = {
  BASIC_STEP: [
    "basic setup step",
    "initial configuration step",
    "standard connection check"
  ],
  COMMON_ISSUE: [
    "common issue",
    "frequent problem",
    "known error"
  ],
  STANDARD_FIX: [
    "follow the official guide",
    "restart the system",
    "reset the configuration"
  ],

  REQUIRED_STEP: [
    "required step",
    "mandatory step",
    "necessary step"
  ],
  REQUIRED_INFO: [
    "order number",
    "proof of purchase",
    "account email"
  ],
  RETURN_POLICY: [
    "return policy",
    "refund policy",
    "terms of service"
  ],
  REQUIRED_PROCESS: [
    "submit a return request",
    "follow the refund process",
    "provide the correct documentation"
  ],

  PRODUCT_SPEC: [
    "product specification",
    "technical specification",
    "product details"
  ],
  PRODUCT_DETAILS: [
    "product description",
    "product page",
    "spec sheet"
  ],
  PRICE_LIST: [
    "price list",
    "pricing page",
    "quote sheet"
  ],
  PRICE_POLICY: [
    "pricing policy",
    "discount policy",
    "sales terms"
  ],
  SPEC_COMPARISON: [
    "spec comparison",
    "feature comparison",
    "performance comparison"
  ],
  KEY_METRIC: [
    "key metric",
    "important feature",
    "critical spec"
  ],
  CORE_FEATURE: [
    "core feature",
    "main functionality",
    "primary capability"
  ],
  PUBLIC_INFO: [
    "publicly available information",
    "official website",
    "public FAQ"
  ],
  BUSINESS_DETAILS: [
    "business details",
    "company information",
    "corporate data"
  ],
  CONTEXT: [
    "context",
    "details",
    "clarifying information"
  ],
  REQUEST: [
    "request",
    "question",
    "issue"
  ],

  BASIC_CONCEPT: [
    "basic concept",
    "fundamental principle",
    "core idea"
  ],
  SYNTAX_ERROR: [
    "syntax error",
    "compile error",
    "runtime error"
  ],
  REWRITE: [
    "rewrite",
    "redesign",
    "refactor"
  ],
  FUNCTION: [
    "function",
    "module",
    "algorithm"
  ],
  CORE_PRINCIPLES: [
    "core principles",
    "fundamental rules",
    "basic patterns"
  ],
  WORK: [
    "homework",
    "assignment",
    "task"
  ],
  LESSON: [
    "lesson",
    "chapter",
    "course material"
  ],
  PROGRAMMING: [
    "programming",
    "software development",
    "coding"
  ]
};

function fillPlaceholders(template) {
    let output = template;

    Object.keys(PLACEHOLDER_VALUES).forEach((placeholder_value) => {
        //includes is not triggering
        if (output.includes(placeholder_value)) {
            output = output.replaceAll(
                placeholder_value, 
                random.getRandomArrayElement(PLACEHOLDER_VALUES[placeholder_value])
            );
        }
    });

    return output;
}

function randomTopicSubtopic() {
    const tier = random.getRandomArrayElement(TIERS);
    const topics = Object.keys(TOPIC_HIERARCHY);
    const topic = random.getRandomArrayElement(topics);
    const subtopic = random.getRandomArrayElement(TOPIC_HIERARCHY[topic]);
    return { tier, topic, subtopic };
}

function generateRecords(count) {
    let records = {};
  
    TIERS.forEach((tier) => {
        records[tier] = {};

        Object.entries(TOPIC_HIERARCHY).forEach(([topic, sub_topics]) => {
            records[tier][topic] = {};

            sub_topics.forEach(sub_topic => {
                records[tier][topic][sub_topic] = new Set();
            });
        });
    });

    for (let i = 0; i < count; i++) {
        const { tier, topic, subtopic } = randomTopicSubtopic();
        const template = random.getRandomArrayElement(TIERED_TEMPLATES[topic][subtopic][tier]);
        const output = fillPlaceholders(template);

        records[tier][topic][subtopic].add(output);
    }

  return records;
}

function writeJson(filePath, records) {
    const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

    stream.write(JSON.stringify(records, (key, value) => {
        if (value instanceof Set) return [...value];
        return value;
    }, 4));
    stream.end();
}

// Run
const records = generateRecords(RECORD_COUNT);
writeJson(OUTPUT_FILE, records);

console.log(`Generated ${RECORD_COUNT} records → '${OUTPUT_FILE}'`);