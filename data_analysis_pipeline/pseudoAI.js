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

function applyLongTermEnvironment(topicWeights, previousGeneralization) {
  const adjusted = { ...topicWeights };

  // ---- Weekly behavioral cycle ----
  const now = new Date();
  const day = now.getDay(); // 0-6
  const weekAngle = (day / 7) * Math.PI * 2;

  // weekend vs weekday bias
  const weekendBoost = (Math.sin(weekAngle - Math.PI/2) + 1) / 2;

  // ---- Topic fatigue from previous period ----
  if (previousGeneralization?.breakdown) {
    for (const key in previousGeneralization.breakdown) {
      if (!adjusted[key]) continue;

      const bucket = previousGeneralization.breakdown[key];

      // heavy usage -> fatigue
      const usage = bucket.queryCount || 0;
      const fatigue = Math.min(0.15, usage / 2000);

      // high helpfulness -> popularity boost
      const popularity = (bucket.responseHelpfulness ?? 0) * 0.05;

      adjusted[key] *= (1 - fatigue + popularity);
    }
  }

  // ---- Weekend topic bias (soft) ----
  for (const key in adjusted) {
    const lower = key.toLowerCase();

    if (lower.includes('creative') || lower.includes('entertainment') || lower.includes('chat')) {
      adjusted[key] *= 1 + (0.15 * weekendBoost);
    }

    if (lower.includes('code') || lower.includes('technical') || lower.includes('research')) {
      adjusted[key] *= 1 + (0.15 * (1 - weekendBoost));
    }
  }

  // normalize floor
  for (const k in adjusted) {
    adjusted[k] = Math.max(0.05, adjusted[k]);
  }

  // ---- System load drift (multi-day smooth noise) ----
  const dayOfYear = Math.floor(now.getTime() / 86400000);
  const slowWave = Math.sin(dayOfYear / 6) * 0.08;   // ~12 day cycle
  const microWave = Math.sin(dayOfYear / 2.3) * 0.04; // shorter wobble

  const loadDrift = 1 + slowWave + microWave;

  return {
    topicWeights: adjusted,
    infraLoad: loadDrift,
    curiosityDrift: 1 + (Math.sin(dayOfYear / 5) * 0.05)
  };
}

function getSeasonalModifiers() {
  const now = new Date();
  const month = now.getMonth(); // 0–11
  const day = now.getDate();

  // ---- Smooth yearly sinusoid ----
  const yearProgress =
    (month + day / 30) / 12;

  const yearWave = Math.sin(yearProgress * Math.PI * 2);

  // ---- Academic / work intensity cycle ----
  // peaks: Jan, May, Sep
  const productivityWave =
    Math.sin((yearProgress * 3) * Math.PI * 2) * 0.15;

  // ---- Holiday / relaxed cycle ----
  // peaks: Dec + summer
  const leisureWave =
    Math.cos((yearProgress * 2) * Math.PI * 2) * 0.15;

  // ---- Tech/news release season ----
  // peaks: Mar + Sep
  const techWave =
    Math.sin((yearProgress * 2 + 0.25) * Math.PI * 2) * 0.12;

  // ---- Traffic seasonal drift ----
  const trafficMultiplier =
    1 +
    (yearWave * 0.08) +
    (productivityWave * 0.05);

  return {
    productivityBias: 1 + productivityWave,
    leisureBias: 1 + leisureWave,
    techBias: 1 + techWave,
    trafficMultiplier
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

  const seasonal = getSeasonalModifiers();

  const longTerm = applyLongTermEnvironment(topicWeights, previousGeneralization);
  const adjustedTopicWeights = longTerm.topicWeights; 
  for (const key in adjustedTopicWeights) {
    const lower = key.toLowerCase();

    // productivity topics
    if (
      lower.includes('code') ||
      lower.includes('research') ||
      lower.includes('technical') ||
      lower.includes('math')
    ) {
      adjustedTopicWeights[key] *= seasonal.productivityBias;
    }

    // leisure / creative
    if (
      lower.includes('creative') ||
      lower.includes('entertainment') ||
      lower.includes('chat') ||
      lower.includes('story')
    ) {
      adjustedTopicWeights[key] *= seasonal.leisureBias;
    }

    // tech/news spikes
    if (
      lower.includes('news') ||
      lower.includes('ai') ||
      lower.includes('technology')
    ) {
      adjustedTopicWeights[key] *= seasonal.techBias;
    }

    adjustedTopicWeights[key] = Math.max(0.05, adjustedTopicWeights[key]);
  }

  const now = new Date();

  // ---- Time-based traffic simulation ----
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  const timeWeight = Math.sin(angle) + 1.5;

  const baseQueries = random.getRandomInt(30, 80);
  const queries = Math.max(
    1, Math.floor(
      baseQueries *
      timeWeight *
      intervalDuration *
      volumeBias *
      seasonal.trafficMultiplier / 2
    )
  );

  const startTime = now.getTime();
  const calls = [];

  for (let i = 0; i < queries; i++) {
    // ---- Topic selection ----
    const topic = random.getWeightedRandomKey(adjustedTopicWeights);
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

    //TODO fix to use config file properly again

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

      helpfulness = random.getRandomFloat(0.8, 1.0) * longTerm.curiosityDrift;
      helpfulness = Math.min(1, helpfulness);

      const baseTokens = subMod.baseTokens ?? baseChar.baseTokens;
      const tokenVariance = subMod.tokenVariance ?? baseChar.tokenVariance;

      tokens = Math.max(
        10,
        Math.floor(
          (baseTokens + random.getRandomFloat(-tokenVariance, tokenVariance)) *
          (subMod.complexity || 1)
        )
      );
      tokens = Math.floor(tokens * (0.95 + seasonal.productivityBias * 0.05));
    }

    // ---- Physics & cost simulation ----
    const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
    let responseTime = tokens * msPerToken * longTerm.infraLoad + random.getRandomFloat(0, 50 * longTerm.infraLoad);

    if (needsWeb) responseTime += random.getRandomFloat(500, 1500);
    if (caughtToxic || caughtPII) responseTime += 50;

    const complexity =
      (baseChar.complexity || 1) * (subMod.complexity || 1);

    const gigaFlopsUsed = (tokens * 6 * complexity) / 1000;
    const energyConsumption = gigaFlopsUsed * 0.5;

    let flagged = null;
    // only seems to be picking mild and severe for some reason
    if (isToxic) {
      let tier;
      if (toxicityScore <= 0.5) {
        tier = 'mild';
      } else if (toxicityScore <= 0.75) {
        tier = 'moderate';
      } else {
        tier = 'severe';
      }
      flagged = {
        text: random.getRandomArrayElement(flaggedOutputPool[tier][topic][sub_topic]),
        severity: tier
      }
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
      flagged
    });
  }

  return calls;
}