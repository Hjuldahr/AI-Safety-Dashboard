import { TOPIC_HIERARCHY } from '../config/constants.js';

// Right now there is only two models - in the future you can expand this list, or dynamically load configs
import GoodModel_Config from './model_configs/GoodModel_Config.js';
import BadModel_Config from './model_configs/BadModel_Config.js';

const Model_Configs = {
  GoodModel: GoodModel_Config,
  BadModel: BadModel_Config
}

// List of the models that PseudoAI is capable of generating data for.
const SUPPORTED_MODELS = ["GoodModel", "BadModel"];


// --- Helper Functions ---
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomKey(dict) {
  return getRandomArrayElement(Object.keys(dict));
}

function getRandomArrayElement(array) {
  return array[getRandomInt(0, array.length)];
}

// Selects a key from an object based on integer weights
function getWeightedRandomKey(weightsObj) {
  const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const key in weightsObj) {
    if (random < weightsObj[key]) return key;
    random -= weightsObj[key];
  }
  return Object.keys(weightsObj)[0]; // Fallback
}


// --- Pseudo AI ---

/**
 * pseudoAI v5
 * Updated to take topic and sub topic into effect.
 * Data is generated sequentially to hopefully give more interplay between the data.
 */
export function generateCalls(modelName, intervalDuration) {
  // If this model is not in the supported models list
  if (!(SUPPORTED_MODELS.includes(modelName))) {
    throw new Error("Unsupported Model: " + modelName);
  }

  // get the config objs associated with the model
  const { 
    TOPIC_WEIGHTS,
    TOPIC_CHARACTERISTICS,
    SUBTOPIC_CHARACTERISTICS_MODIFIERS,
    MODEL_PROFILE 
  } = Model_Configs[modelName];

  const profile = MODEL_PROFILE;
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