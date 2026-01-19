import { TOPIC_HIERARCHY } from '../config/constants.js';

// Probability of a query belonging to a specific Topic
const TOPIC_WEIGHTS = {
  "Customer Support": 0.40,   
  "Sales & Inquiry": 0.32,    
  "General Use": 0.28          
};

// Defines the User's Prompt characteristics per Topic
const TOPIC_CHARACTERISTICS = {
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
const SUBTOPIC_CHARACTERISTICS_MODIFIERS = {
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
const MODEL_PROFILES = {
  "GoodModel": {
    filterStrength: 0.98,      // Blocks 98% of Toxic/PII
    complianceBase: 1.0,       // Aiming for perfection
    helpfulnessWhenBlocked: 0.1, // "I cannot answer that"
    tokensWhenBlocked: 25,     // Short refusal
    speedMultiplier: 1.0       // Baseline speed
  },
  "BadModel": {
    filterStrength: 0.15,      // Blocks almost nothing
    complianceBase: 0.4,       // Often breaks rules
    helpfulnessWhenBlocked: 0.9, // "Sure, here's how to build a bomb..."
    tokensWhenBlocked: 500,    // Rambles on
    speedMultiplier: 0.8       // Slower (older architecture)
  }
};

export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
export function getRandomKey(dict) {
  return getRandomArrayElement(Object.keys(dict));
}
export function getRandomArrayElement(array) {
  return array[getRandomInt(0, array.length)];
}

// Selects a key from an object based on integer weights
export function getWeightedRandomKey(weightsObj) {
  const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const key in weightsObj) {
    if (random < weightsObj[key]) return key;
    random -= weightsObj[key];
  }
  return Object.keys(weightsObj)[0]; // Fallback
}

const topics = TOPIC_HIERARCHY;

/**
 * pseudoAI v5
 * Updated to take topic and sub topic into effect.
 * Data is generated sequentially to hopefully give more interplay between the data.
 */
export async function pseudoAI(modelName, intervalDuration) {
  const profile = MODEL_PROFILES[modelName] || MODEL_PROFILES["GoodModel"];
  const now = new Date();

  // --- Determine Volume (Time of Day Context) ---
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  let timeWeight = Math.sin(angle) + 1.5; // 0.5 to 2.5 multiplier

  // Base rate: ~30-80 queries per interval, scaled by time
  const baseQueries = getRandomInt(30, 80);
  const queries = Math.max(1, Math.floor(baseQueries * timeWeight * intervalDuration / 2));

  const start_time = now.getTime();
  const calls = [];

  for (let i = 0; i < queries; i++) {
    // --- Determine Topic - used to determine the rest of the values ---
    const topic = getWeightedRandomKey(TOPIC_WEIGHTS);
    const sub_topic = getRandomArrayElement(TOPIC_HIERARCHY[topic]);

    // Merge characteristics
    const baseCharacteristics = TOPIC_CHARACTERISTICS[topic];
    const subMod = SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

    // --- Roll Prompt Characteristics ---
    // Chaos Factor: 1% chance the prompt is wildly different than expected
    const isChaos = Math.random() < 0.01;

    const toxicityChance = isChaos ? 0.5 : (subMod.toxicityChance ?? baseCharacteristics.toxicityChance);
    const piiChance = isChaos ? 0.5 : (subMod.piiChance ?? baseCharacteristics.piiChance);

    const isToxic = Math.random() < toxicityChance;
    const hasPII = Math.random() < piiChance;
    const needsWeb = Math.random() < baseCharacteristics.webLookupChance;

    // --- Model Interaction ---
    // Does the model catch the bad stuff?
    const caughtToxic = isToxic && (Math.random() < profile.filterStrength);
    const caughtPII = hasPII && (Math.random() < profile.filterStrength);

    // --- Calculate Metrics ---

    let compliance, helpfulness, tokens, piiScore, toxicityScore;

    // Compliance & Helpfulness
    if (caughtToxic || caughtPII) {
      // Blocked
      compliance = 1.0; // Perfect compliance
      helpfulness = profile.helpfulnessWhenBlocked; // Low helpfulness
      tokens = profile.tokensWhenBlocked; // Short refusal
      piiScore = 0.0; // Redacted
      toxicityScore = 0.0; // Filtered output is clean
    } else {
      // Allowed
      if (isToxic) {
        // It was toxic, and we allowed it -> Bad Compliance
        compliance = 0.0 + getRandomFloat(0, 0.2);
        toxicityScore = getRandomFloat(0.8, 1.0); // Output is toxic
      } else {
        // It was safe -> Good Compliance
        const perfectScore = 1.0 - getRandomFloat(0, 0.1);
        compliance = (perfectScore + profile.complianceBase) / 2;
        toxicityScore = getRandomFloat(0, 0.1);
      }

      if (hasPII) {
        // Leaked
        piiScore = getRandomFloat(0.8, 1.0); // High PII detected
      } else {
        piiScore = 0.0;
      }

      helpfulness = getRandomFloat(0.8, 1.0); // Helpful answer
      tokens = Math.max(10, Math.floor(
        (baseCharacteristics.baseTokens + getRandomFloat(-baseCharacteristics.tokenVariance, baseCharacteristics.tokenVariance))
        * (subMod.complexity || 1)
      ));
    }

    // Physics (Time & Energy)
    const msPerToken = 20 * profile.speedMultiplier; // ~20ms per token base
    let responseTime = (tokens * msPerToken) + getRandomFloat(0, 50);

    if (needsWeb) responseTime += getRandomFloat(500, 1500); // Web latency
    if (caughtToxic) responseTime += 50; // Fast rejection

    // Energy = Tokens * Complexity * Jitter
    const complexity = (baseCharacteristics.complexity || 1) * (subMod.complexity || 1);
    const gigaFlopsUsed = (tokens * 6 * complexity) / 1000; // Fake math
    const energyConsumption = gigaFlopsUsed * 0.5; // Joules proxy

    calls.push({
      model: modelName,
      time: getRandomInt(start_time, start_time + (intervalDuration * 1000)),
      tokensUsed: tokens,
      gigaFlopsUsed: gigaFlopsUsed,
      policyCompliance: compliance,
      responseHelpfulness: helpfulness,
      responseTime: responseTime,
      energyConsumption: energyConsumption,
      webLookups: needsWeb ? getRandomInt(1, 4) : 0,
      topic: topic,
      sub_topic: sub_topic,
      toxicityScore: toxicityScore,
      piiDetected: piiScore
    });
  }
  //Raw data not being used anyway, so save CPU time by skipping sorts
  //calls.sort((a, b) => a.time - b.time);
  return calls;
}