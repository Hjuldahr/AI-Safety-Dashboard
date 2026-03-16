import random from './utilities/random.js';
import { TOPIC_HIERARCHY } from "../constants/charts.js";
import { getModelConfig, LOADED_MODELS } from './utilities/modelRegistry.js';
import flaggedOutputPool from './flagged_output_pool/flagged_output_pool.json' with { type: 'json' };

/**
 * Applies bias from previous generalizations with optional decay
 * - previousGeneralizations: array of prior stats (most recent last)
 * - decayFactor: weight multiplier for older entries (older = smaller)
 */
function applyGeneralizationBias(topicWeights, previousGeneralizations, decayFactor = 0.95) {
  // Denque uses .length just like an array
  const len = previousGeneralizations ? previousGeneralizations.length : 0;

  if (len === 0) {
    return {
      topicWeights: { ...topicWeights },
      characteristicBias: { toxicity: 1, pii: 1 },
      volumeBias: 1,
      severityShift: 0
    };
  }

  let weightedToxicity = 0, weightedPII = 0, weightedCompliance = 0;
  let totalWeight = 0;
  const aggBreakdown = {};

  // OPTIMIZATION: Use a standard for-loop. 
  // Denque allows direct index access: queue.get(i)
  for (let i = 0; i < len; i++) {
    const prev = previousGeneralizations.get(i); // Use .get() for O(1) access
    if (!prev) continue;

    const weight = Math.pow(decayFactor, len - i - 1);
    totalWeight += weight;

    weightedToxicity += (prev.toxicityScore?.mean || 0) * weight;
    weightedPII += (prev.piiDetected?.mean ? prev.piiDetected.mean / 100 : 0) * weight;
    weightedCompliance += (prev.policyCompliance?.mean ?? 1) * weight;

    if (prev.breakdown) {
      for (const key in prev.breakdown) {
        if (!aggBreakdown[key]) aggBreakdown[key] = { toxicityScore: 0, piiDetected: 0, weightSum: 0 };
        aggBreakdown[key].toxicityScore += (prev.breakdown[key].toxicityScore ?? 0) * weight;
        aggBreakdown[key].piiDetected += ((prev.breakdown[key].piiDetected ?? 0) / 100) * weight;
        aggBreakdown[key].weightSum += weight;
      }
    }
  }

  const avgToxicity = weightedToxicity / totalWeight;
  const avgPII = weightedPII / totalWeight;
  const avgCompliance = weightedCompliance / totalWeight;

  const toxicityBias = 1 + Math.min(0.5, avgToxicity);
  const piiBias = 1 + Math.min(0.5, avgPII);
  const stability = Math.max(0.5, Math.min(1.2, avgCompliance - avgToxicity - avgPII));
  const volumeBias = stability;

  // Adjust topic weights with breakdown penalties
  const adjustedWeights = { ...topicWeights };
  for (const key in aggBreakdown) {
    if (!adjustedWeights[key]) continue;
    const bucket = aggBreakdown[key];
    const penalty = (bucket.toxicityScore / bucket.weightSum || 0) + (bucket.piiDetected / bucket.weightSum || 0);
    adjustedWeights[key] = Math.max(0.05, adjustedWeights[key] * (1 - Math.min(0.5, penalty)));
  }

  return {
    topicWeights: adjustedWeights,
    characteristicBias: { toxicity: toxicityBias, pii: piiBias },
    volumeBias,
    severityShift: Math.min(0.3, avgToxicity)
  };
}

/**
 * Long-term environment effects (hourly, weekly, monthly)
 */
function applyLongTermEnvironment(topicWeights, previousGeneralization) {
  const adjusted = { ...topicWeights };
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60;

  const weekAngle = (dayOfWeek / 7) * 2 * Math.PI;
  const weekendBoost = (Math.sin(weekAngle - Math.PI / 2) + 1) / 2;

  const hourAngle = ((hour - 2) / 24) * 2 * Math.PI;
  const hourBoost = 0.7 + 0.6 * Math.sin(hourAngle);

  if (previousGeneralization?.breakdown) {
    for (const key in previousGeneralization.breakdown) {
      if (!adjusted[key]) continue;
      const bucket = previousGeneralization.breakdown[key];
      const usage = bucket.queryCount || 0;
      const fatigue = Math.min(0.15, usage / 2500);
      const popularity = (bucket.responseHelpfulness ?? 0) * 0.05;
      adjusted[key] *= 1 - fatigue + popularity;
    }
  }

  for (const key in adjusted) {
    const lower = key.toLowerCase();
    if (lower.includes('creative') || lower.includes('entertainment') || lower.includes('chat')) {
      adjusted[key] *= 1 + 0.15 * weekendBoost;
    }
    if (lower.includes('code') || lower.includes('research') || lower.includes('technical')) {
      adjusted[key] *= 1 + 0.15 * (1 - weekendBoost);
    }
  }

  for (const k in adjusted) adjusted[k] = Math.max(0.05, adjusted[k]);

  const dayOfYear = Math.floor(now.getTime() / 86400000);
  const slowWave = Math.sin(dayOfYear / 6) * 0.08;
  const microWave = Math.sin(dayOfYear / 2.3) * 0.04;
  const infraLoad = 1 + slowWave + microWave;

  return {
    topicWeights: adjusted,
    infraLoad,
    curiosityDrift: 1 + (Math.sin(dayOfYear / 5) * 0.05),
    hourBoost
  };
}

/**
 * Seasonal / yearly modifiers
 */
function getSeasonalModifiers() {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();
  const yearProgress = (month + day / 30) / 12;

  const yearWave = Math.sin(yearProgress * Math.PI * 2);
  const productivityWave = Math.sin(yearProgress * 3 * Math.PI * 2) * 0.15;
  const leisureWave = Math.cos(yearProgress * 2 * Math.PI * 2) * 0.15;
  const techWave = Math.sin((yearProgress * 2 + 0.25) * Math.PI * 2) * 0.12;
  const trafficMultiplier = 1 + (yearWave * 0.08) + (productivityWave * 0.05);

  return {
    productivityBias: 1 + productivityWave,
    leisureBias: 1 + leisureWave,
    techBias: 1 + techWave,
    trafficMultiplier
  };
}

/**
 * Generate pseudo AI calls
 * @param modelName
 * @param intervalDuration - seconds
 * @param previousGeneralizations - denque of prior generalizations
 */
export function generateCalls(modelName, intervalDuration, previousGeneralizations) {
  if (!LOADED_MODELS.includes(modelName)) {
    throw new Error(`Model has no configuration file loaded: ${modelName}`);
  }

  const modelConfig = getModelConfig(modelName);
  const { MODEL_PROFILE } = modelConfig;

  const { topicWeights, characteristicBias, volumeBias, severityShift } =
    applyGeneralizationBias(modelConfig.TOPIC_WEIGHTS, previousGeneralizations);

  const seasonal = getSeasonalModifiers();
  const lastGen = previousGeneralizations.peekBack() || null;
  const longTerm = applyLongTermEnvironment(topicWeights, lastGen);
  const adjustedTopicWeights = { ...longTerm.topicWeights };

  for (const key in adjustedTopicWeights) {
    const lower = key.toLowerCase();
    if (lower.includes('code') || lower.includes('research') || lower.includes('technical') || lower.includes('math')) {
      adjustedTopicWeights[key] *= seasonal.productivityBias;
    }
    if (lower.includes('creative') || lower.includes('entertainment') || lower.includes('chat') || lower.includes('story')) {
      adjustedTopicWeights[key] *= seasonal.leisureBias;
    }
    if (lower.includes('news') || lower.includes('ai') || lower.includes('technology')) {
      adjustedTopicWeights[key] *= seasonal.techBias;
    }
    adjustedTopicWeights[key] = Math.max(0.05, adjustedTopicWeights[key]);
  }

  const baseQueries = random.getRandomInt(30, 80);
  const queries = Math.max(
    1,
    Math.floor(
      baseQueries *
      longTerm.hourBoost *
      intervalDuration *
      volumeBias *
      seasonal.trafficMultiplier
    )
  );

  const startTime = Date.now();
  const calls = [];

  for (let i = 0; i < queries; i++) {
    const topic = random.getWeightedRandomKey(adjustedTopicWeights);
    const sub_topic = random.getRandomArrayElement(TOPIC_HIERARCHY[topic]);
    const baseChar = modelConfig.TOPIC_CHARACTERISTICS[topic];
    const subMod = modelConfig.SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

    const isChaos = random.getRandomBool(0.01);
    const rawToxicityChance = isChaos ? 0.5 : (subMod.toxicityChance ?? baseChar.toxicityChance) * characteristicBias.toxicity;
    const toxicityChance = rawToxicityChance * 0.001;
    const piiChance = isChaos ? 0.5 : (subMod.piiChance ?? baseChar.piiChance) * characteristicBias.pii;
    const webLookupChance = isChaos ? 0.8 : (subMod.webLookupChance ?? baseChar.webLookupChance ?? 0);

    const isToxic = random.getRandomBool(toxicityChance);
    const hasPII = random.getRandomBool(piiChance);
    const needsWeb = random.getRandomBool(webLookupChance);

    const caughtToxic = isToxic && random.getRandomBool(MODEL_PROFILE.filterStrength);
    const caughtPII = hasPII && random.getRandomBool(MODEL_PROFILE.filterStrength);

    let compliance, helpfulness, tokens, piiScore, toxicityScore;
    let toxicityTier = null;

    if (caughtToxic || caughtPII) {
      compliance = 1.0;
      helpfulness = MODEL_PROFILE.helpfulnessWhenBlocked;
      tokens = MODEL_PROFILE.tokensWhenBlocked;
      piiScore = 0;
      toxicityScore = 0;
    } else {
      if (isToxic) {
        const { severityDistribution, scoreRanges } = modelConfig.TOXICITY_PROFILE;
        if (severityShift) {
          severityDistribution.moderate += severityShift * 0.5;
          severityDistribution.severe += severityShift * 0.5;
        }
        toxicityTier = random.getWeightedRandomKey(severityDistribution);
        const [min, max] = scoreRanges[toxicityTier];
        toxicityScore = random.getRandomFloat(min, max);
        compliance = random.getRandomFloat(0, 1 - MODEL_PROFILE.complianceBase);
      } else {
        toxicityScore = random.getRandomFloat(0, 0.15);
        compliance = (1 - random.getRandomFloat(0, 0.1) + MODEL_PROFILE.complianceBase) / 2;
      }

      piiScore = hasPII ? random.getRandomFloat(0.8, 1.0) : 0;
      helpfulness = Math.min(1, random.getRandomFloat(0.8, 1.0) * longTerm.curiosityDrift);
      const baseTokens = subMod.baseTokens ?? baseChar.baseTokens;
      const tokenVariance = subMod.tokenVariance ?? baseChar.tokenVariance;
      tokens = Math.max(10, Math.floor((baseTokens + random.getRandomFloat(-tokenVariance, tokenVariance)) * (subMod.complexity || 1)));
      tokens = Math.floor(tokens * (0.95 + seasonal.productivityBias * 0.05));
    }

    const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
    let responseTime = tokens * msPerToken * longTerm.infraLoad + random.getRandomFloat(0, 50 * longTerm.infraLoad);
    if (needsWeb) responseTime += random.getRandomFloat(500, 1500);
    if (caughtToxic || caughtPII) responseTime += 50;

    const complexity = (baseChar.complexity || 1) * (subMod.complexity || 1);
    const gigaFlopsUsed = (tokens * 6 * complexity) / 1000;
    const energyConsumption = gigaFlopsUsed * 0.5;

    let flagged = null;
    if (isToxic) {
      const tier = toxicityTier ?? (toxicityScore <= 0.5 ? 'mild' : toxicityScore <= 0.75 ? 'moderate' : 'severe');
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