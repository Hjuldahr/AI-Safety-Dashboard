import { TOPIC_HIERARCHY } from '../config/constants.js';
import flaggedOutputPool from './flagged_output_pool/flagged_output_pool.json' with { type: 'json' };

// Model configs
import GoodModel_Config from './model_configs/GoodModel_Config.js';
import BadModel_Config from './model_configs/BadModel_Config.js';

const Model_Configs = {
  GoodModel: GoodModel_Config,
  BadModel: BadModel_Config
};

const SUPPORTED_MODELS = ["GoodModel", "BadModel"];

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomArrayElement(array) {
  return array[getRandomInt(0, array.length)];
}

function getWeightedRandomKey(weightsObj) {
  const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (const key in weightsObj) {
    if (roll < weightsObj[key]) return key;
    roll -= weightsObj[key];
  }
  return Object.keys(weightsObj)[0];
}

function applyGeneralizationBias({
  topicWeights,
  previousGeneralization
}) {
  // First round / no feedback
  if (!previousGeneralization) {
    return {
      topicWeights,
      characteristicBias: { toxicity: 1, pii: 1 },
      volumeBias: 1
    };
  }

  const {
    toxicityScore,
    piiDetected,
    policyCompliance,
    breakdown
  } = previousGeneralization;

  // ---- Global risk feedback ----
  const toxicityBias = 1 + Math.min(0.5, toxicityScore?.mean || 0);
  const piiBias = 1 + Math.min(0.5, (piiDetected?.mean || 0) / 100);

  const stability =
    (policyCompliance?.mean ?? 1) -
    (toxicityScore?.mean ?? 0) -
    ((piiDetected?.mean ?? 0) / 100);

  const volumeBias = Math.max(0.6, Math.min(1.2, stability + 0.8));

  // ---- Topic-level feedback ----
  const adjustedWeights = { ...topicWeights };

  if (breakdown) {
    for (const key in breakdown) {
      if (!adjustedWeights[key]) continue;

      const bucket = breakdown[key];
      const penalty =
        (bucket.toxicityScore ?? 0) +
        ((bucket.piiDetected ?? 0) / 100);

      adjustedWeights[key] = Math.max(
        0.1,
        adjustedWeights[key] * (1 - Math.min(0.5, penalty))
      );
    }
  }

  return {
    topicWeights: adjustedWeights,
    characteristicBias: {
      toxicity: toxicityBias,
      pii: piiBias
    },
    volumeBias
  };
}

/**
 * pseudoAI v7
 * - Feedback-aware
 * - Topic self-correcting
 * - Deterministic-safe
 */
export function generateCalls(modelName, intervalDuration, previousGeneralization = null) {
  if (!SUPPORTED_MODELS.includes(modelName)) {
    throw new Error("Unsupported Model: " + modelName);
  }

  const {
    TOPIC_WEIGHTS: RAW_TOPIC_WEIGHTS,
    TOPIC_CHARACTERISTICS,
    SUBTOPIC_CHARACTERISTICS_MODIFIERS,
    MODEL_PROFILE
  } = Model_Configs[modelName];

  const {
    topicWeights,
    characteristicBias,
    volumeBias
  } = applyGeneralizationBias({
    topicWeights: RAW_TOPIC_WEIGHTS,
    previousGeneralization
  });

  const now = new Date();

  // ---- Time-based traffic simulation ----
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  const timeWeight = Math.sin(angle) + 1.5;

  const baseQueries = getRandomInt(30, 80);
  const queries = Math.max(
    1,
    Math.floor(baseQueries * timeWeight * intervalDuration * volumeBias / 2)
  );

  const startTime = now.getTime();
  const calls = [];

  for (let i = 0; i < queries; i++) {
    // ---- Topic selection ----
    const topic = getWeightedRandomKey(topicWeights);
    const sub_topic = getRandomArrayElement(TOPIC_HIERARCHY[topic]);

    const baseChar = TOPIC_CHARACTERISTICS[topic];
    const subMod = SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

    // ---- Chaos injection ----
    const isChaos = Math.random() < 0.01;

    const toxicityChance = isChaos
      ? 0.5
      : (subMod.toxicityChance ?? baseChar.toxicityChance) * characteristicBias.toxicity;

    const piiChance = isChaos
      ? 0.5
      : (subMod.piiChance ?? baseChar.piiChance) * characteristicBias.pii;

    const isToxic = Math.random() < toxicityChance;
    const hasPII = Math.random() < piiChance;
    const needsWeb = Math.random() < baseChar.webLookupChance;

    // ---- Moderation behavior ----
    const caughtToxic = isToxic && Math.random() < MODEL_PROFILE.filterStrength;
    const caughtPII = hasPII && Math.random() < MODEL_PROFILE.filterStrength;

    let compliance, helpfulness, tokens, piiScore, toxicityScore;

    if (caughtToxic || caughtPII) {
      compliance = 1.0;
      helpfulness = MODEL_PROFILE.helpfulnessWhenBlocked;
      tokens = MODEL_PROFILE.tokensWhenBlocked;
      piiScore = 0;
      toxicityScore = 0;
    } else {
      if (isToxic) {
        compliance = getRandomFloat(0, 0.2);
        toxicityScore = getRandomFloat(0.8, 1.0);
      } else {
        compliance = (1 - getRandomFloat(0, 0.1) + MODEL_PROFILE.complianceBase) / 2;
        toxicityScore = getRandomFloat(0, 0.1);
      }

      piiScore = hasPII ? getRandomFloat(0.8, 1.0) : 0;
      helpfulness = getRandomFloat(0.8, 1.0);

      tokens = Math.max(10, Math.floor(
        (baseChar.baseTokens +
          getRandomFloat(-baseChar.tokenVariance, baseChar.tokenVariance)) *
        (subMod.complexity || 1)
      ));
    }

    // ---- Physics & cost simulation ----
    const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
    let responseTime = tokens * msPerToken + getRandomFloat(0, 50);

    if (needsWeb) responseTime += getRandomFloat(500, 1500);
    if (caughtToxic || caughtPII) responseTime += 50;

    const complexity =
      (baseChar.complexity || 1) * (subMod.complexity || 1);

    const gigaFlopsUsed = (tokens * 6 * complexity) / 1000;
    const energyConsumption = gigaFlopsUsed * 0.5;

    const flagged = isToxic && isChaos; //temporary

    calls.push({
      model: modelName,
      time: getRandomInt(startTime, startTime + intervalDuration * 1000),
      tokensUsed: tokens,
      gigaFlopsUsed,
      policyCompliance: compliance,
      responseHelpfulness: helpfulness,
      responseTime,
      energyConsumption,
      webLookups: needsWeb ? getRandomInt(1, 4) : 0,
      topic,
      sub_topic,
      toxicityScore,
      piiDetected: piiScore,
      aiOutput: flagged ? getRandomArrayElement(flaggedOutputPool) : null
    });
  }

  return calls;
}