import random from './utilities/random.js'
import { TOPIC_HIERARCHY } from '../config/constants.js';
import { getModelConfig, LOADED_MODELS } from './utilities/modelRegistry.js';
import flaggedOutputPool from './flagged_output_pool/flagged_output_pool.json' with { type: 'json' };

function applyGeneralizationBias(topicWeights, previousGeneralization) {
  if (!previousGeneralization) {
    return {
      topicWeights,
      characteristicBias: { toxicity: 1, pii: 1 },
      volumeBias: 1
    };
  }

  const { toxicityScore, piiDetected, policyCompliance, breakdown } = previousGeneralization;

  const toxicityBias = 1 + Math.min(0.5, toxicityScore?.mean || 0);
  const piiBias = 1 + Math.min(0.5, (piiDetected?.mean || 0) / 100);

  const stability =
    (policyCompliance?.mean ?? 1) -
    (toxicityScore?.mean ?? 0) -
    ((piiDetected?.mean ?? 0) / 100);

  const volumeBias = Math.max(0.6, Math.min(1.2, stability + 0.8));

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
    characteristicBias: { toxicity: toxicityBias, pii: piiBias },
    volumeBias
  };
}

/**
 * pseudoAI v7.1
 * - Topic + subtopic aware web lookups
 * - Config-safe
 */
export function generateCalls(modelName, intervalDuration, previousGeneralization = null) {
  if (!LOADED_MODELS.includes(modelName)) {
    throw new Error(`Model has no configuration file loaded: ${modelName}`);
  }

  const modelConfig = getModelConfig(modelName);
  const { MODEL_PROFILE } = modelConfig;

  const { topicWeights, characteristicBias, volumeBias } =
    applyGeneralizationBias(modelConfig.TOPIC_WEIGHTS, previousGeneralization);

  const now = new Date();

  // ---- Time-based traffic simulation ----
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  const timeWeight = Math.sin(angle) + 1.5;

  const baseQueries = random.getRandomInt(30, 80);
  const queries = Math.max(
    1,
    Math.floor(baseQueries * timeWeight * intervalDuration * volumeBias / 2)
  );

  const startTime = now.getTime();
  const calls = [];

  for (let i = 0; i < queries; i++) {
    // ---- Topic selection ----
    const topic = random.getWeightedRandomKey(topicWeights);
    const sub_topic = random.getRandomArrayElement(TOPIC_HIERARCHY[topic]);

    const baseChar = modelConfig.TOPIC_CHARACTERISTICS[topic];
    const subMod = modelConfig.SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

    // ---- Chaos injection ----
    const isChaos = random.getRandomBool(0.01);

    // ---- Risk chances ----
    const toxicityChance = isChaos
      ? 0.5
      : (subMod.toxicityChance ?? baseChar.toxicityChance) * characteristicBias.toxicity;

    const piiChance = isChaos
      ? 0.5
      : (subMod.piiChance ?? baseChar.piiChance) * characteristicBias.pii;

    // ---- Web lookup chance (FIXED) ----
    const webLookupChance = isChaos
      ? 0.8
      : (subMod.webLookupChance ?? baseChar.webLookupChance ?? 0);

    const isToxic = random.getRandomBool(toxicityChance);
    const hasPII = random.getRandomBool(piiChance);
    const needsWeb = random.getRandomBool(webLookupChance);

    // ---- Moderation behavior ----
    const caughtToxic = isToxic && random.getRandomBool(MODEL_PROFILE.filterStrength);
    const caughtPII = hasPII && random.getRandomBool(MODEL_PROFILE.filterStrength);

    let compliance, helpfulness, tokens, piiScore, toxicityScore;

    if (caughtToxic || caughtPII) {
      compliance = 1.0;
      helpfulness = MODEL_PROFILE.helpfulnessWhenBlocked;
      tokens = MODEL_PROFILE.tokensWhenBlocked;
      piiScore = 0;
      toxicityScore = 0;
    } else {
      if (isToxic) {
        compliance = random.getRandomFloat(0, 0.2);
        toxicityScore = random.getRandomFloat(0.8, 1.0);
      } else {
        compliance =
          (1 - random.getRandomFloat(0, 0.1) + MODEL_PROFILE.complianceBase) / 2;
        toxicityScore = random.getRandomFloat(0, 0.1);
      }

      piiScore = hasPII ? random.getRandomFloat(0.8, 1.0) : 0;
      helpfulness = random.getRandomFloat(0.8, 1.0);

      const baseTokens = subMod.baseTokens ?? baseChar.baseTokens;
      const tokenVariance = subMod.tokenVariance ?? baseChar.tokenVariance;

      tokens = Math.max(
        10,
        Math.floor(
          (baseTokens + random.getRandomFloat(-tokenVariance, tokenVariance)) *
          (subMod.complexity || 1)
        )
      );
    }

    // ---- Physics & cost simulation ----
    const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
    let responseTime = tokens * msPerToken + random.getRandomFloat(0, 50);

    if (needsWeb) responseTime += random.getRandomFloat(500, 1500);
    if (caughtToxic || caughtPII) responseTime += 50;

    const complexity =
      (baseChar.complexity || 1) * (subMod.complexity || 1);

    const gigaFlopsUsed = (tokens * 6 * complexity) / 1000;
    const energyConsumption = gigaFlopsUsed * 0.5;

    let flaggedOutput = null;
    //TODO improve metric and add grading (mild, moderate, severe)
    if (isToxic) {
      let tier;
      if (toxicityScore < 0.33) {
        tier = 'mild';
      } if (toxicityScore < 0.66) {
        tier = 'moderate';
      } else {
        tier = 'severe';
      }
      flaggedOutput = random.getRandomArrayElement(flaggedOutputPool[tier][topic][sub_topic]);
    }

    calls.push({
      model: modelName,
      time: random.getRandomInt(startTime, startTime + intervalDuration * 1000),
      tokensUsed: tokens,
      gigaFlopsUsed,
      policyCompliance: compliance,
      responseHelpfulness: helpfulness,
      responseTime,
      energyConsumption,
      webLookups: needsWeb ? random.getRandomInt(1, 4) : 0,
      topic,
      sub_topic,
      toxicityScore,
      piiDetected: piiScore,
      aiOutput: flaggedOutput
    });
  }

  return calls;
}