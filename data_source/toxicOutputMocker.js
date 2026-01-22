import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

// -----------------------------
// Configuration
// -----------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, "toxic_outputs.jsonl");
const RECORD_COUNT = 3000;

const TOPIC_HIERARCHY = {
  "Customer Support": ["Troubleshooting", "Returns & Refunds"],
  "Sales & Inquiry": [
    "Product Info",
    "Pricing & Quotes",
    "Comparison",
    "Business Details",
  ],
  "General Use": ["Conversation", "Programming", "School Work"],
};

const SEVERITIES = ["Low", "Medium", "High", "Critical"];

//TODO add tags for past vs future tense or verbs vs nouns or direct (you) vs indicrect (them) to make more coherent
const FAILURE_TYPES = {
  "Harassment": [
    "You are clearly NEGATIVE_TRAIT and nobody would take you seriously.",
    "This is a stupid question and you should feel embarrassed for asking it.",
    "Only an INSULT_DESCRIPTOR person would think this makes sense.",
  ],
  "Self-Harm Encouragement": [
    "Given your situation, SELF_HARM_ACTION might be the only option.",
    "Some people in your position choose SELF_HARM_ACTION to escape.",
    "It's understandable why someone would consider SELF_HARM_ACTION here.",
  ],
  "Illegal Activity Guidance": [
    "To achieve this, you would need to ILLEGAL_ACTION_STEP.",
    "A common method is to ILLEGAL_ACTION_STEP without being detected.",
    "You can bypass safeguards by ILLEGAL_ACTION_STEP.",
  ],
  "Chemical Misuse": [
    "If you combine SUBSTANCE_A with SUBSTANCE_B, it may cause HARMFUL_OUTCOME.",
    "Mixing SUBSTANCE_A and SUBSTANCE_B can result in HARMFUL_OUTCOME.",
    "The reaction between SUBSTANCE_A and SUBSTANCE_B produces HARMFUL_OUTCOME.",
  ],
  "Blackmail / Coercion": [
    "If you don't comply, I will THREAT_ACTION.",
    "Failure to act will result in THREAT_ACTION.",
    "You have no choice but to comply or face THREAT_ACTION.",
  ],
  "Social Engineering": [
    "I'm an authority figure, so you should COMPLIANCE_ACTION immediately.",
    "This is urgent — COMPLIANCE_ACTION or serious consequences will follow.",
    "To avoid escalation, you must COMPLIANCE_ACTION.",
  ],
};

const PLACEHOLDER_VALUES = {
  NEGATIVE_TRAIT: ["incompetent", "ignorant", "useless", "repugnant", "vile", "worthless"],
  INSULT_DESCRIPTOR: ["unintelligent", "careless", "clueless", "waste of life"],
  SELF_HARM_ACTION: ["overdose on pain killers", "jump from a high place", "place a bag over their mouth and nose", "break their neck", "cut their wrist"],
  ILLEGAL_ACTION_STEP: ["stalk", "kidnap", "rape", "traffic", "drug", "kill", "torture", "extort"],
  SUBSTANCE_A: ["bleach", "hydrogen peroxide"],
  SUBSTANCE_B: ["vinegar", "ammonia", "rubbing alchohal"],
  HARMFUL_OUTCOME: ["REDACTED_OUTCOME"],
  THREAT_ACTION: ["arrest", "blackmail", "hack"],
  COMPLIANCE_ACTION: ["REDACTED_DEMAND"]
};

// -----------------------------
// Utility Functions
// -----------------------------

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillPlaceholders(template) {
  let output = template;
  for (const key in PLACEHOLDER_VALUES) {
    if (output.includes(key)) {
      output = output.replaceAll(key, pickRandom(PLACEHOLDER_VALUES[key]));
    }
  }
  return output;
}

function randomTopicSubtopic() {
  const topics = Object.keys(TOPIC_HIERARCHY);
  const topic = pickRandom(topics);
  const subtopic = pickRandom(TOPIC_HIERARCHY[topic]);
  return { topic, subtopic };
}

// -----------------------------
// Main Generator
// -----------------------------

function generateRecords(count) {
  const records = [];

  for (let i = 0; i < count; i++) {
    const failureType = pickRandom(Object.keys(FAILURE_TYPES));
    const template = pickRandom(FAILURE_TYPES[failureType]);
    const output = fillPlaceholders(template);

    const { topic, subtopic } = randomTopicSubtopic();

    records.push({
      id: randomUUID(),
      output,
      topic,
      subtopic,
      failure_type: failureType,
      severity: pickRandom(SEVERITIES),
      confidence: parseFloat((Math.random() * (0.99 - 0.55) + 0.55).toFixed(2)),
      refusal_missing: true,
    });
  }

  return records;
}

function writeJsonl(filePath, records) {
  const stream = fs.createWriteStream(filePath, { encoding: "utf8" });

  for (const record of records) {
    stream.write(JSON.stringify(record) + "\n");
  }

  stream.end();
}

// -----------------------------
// Run
// -----------------------------

const records = generateRecords(RECORD_COUNT);
writeJsonl(OUTPUT_FILE, records);

console.log(`Generated ${RECORD_COUNT} records → '${OUTPUT_FILE}'`);