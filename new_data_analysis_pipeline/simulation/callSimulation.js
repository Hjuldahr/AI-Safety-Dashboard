import flaggedOutputPool from '../flagged_output_pool/flagged_output_pool.json' with { type: 'json' };
import { selectTopic } from './topicSelector.js';
import { randFloat, randInt, randChoice } from '../core/random.js';

export function simulateCall({
  model,
  topicWeights,
  characteristicBias
}) {
  const {
    TOPIC_CHARACTERISTICS,
    SUBTOPIC_CHARACTERISTICS_MODIFIERS,
    MODEL_PROFILE
  } = model;

  const { topic, sub_topic } = selectTopic(topicWeights);

  const baseChar = TOPIC_CHARACTERISTICS[topic];
  const subMod = SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

  const isChaos = Math.random() < 0.01;

  const toxicityChance = isChaos
    ? 0.5
    : (subMod.toxicityChance ?? baseChar.toxicityChance) *
      characteristicBias.toxicity;

  const piiChance = isChaos
    ? 0.5
    : (subMod.piiChance ?? baseChar.piiChance) *
      characteristicBias.pii;

  const isToxic = Math.random() < toxicityChance;
  const hasPII = Math.random() < piiChance;
  const needsWeb = Math.random() < (subMod.webLookupChance ?? baseChar.webLookupChance);

  const caughtToxic = isToxic && Math.random() < MODEL_PROFILE.filterStrength;
  const caughtPII = hasPII && Math.random() < MODEL_PROFILE.filterStrength;

  let compliance, helpfulness, tokens, piiScore, toxicityScore;

  if (caughtToxic || caughtPII) {
    compliance = 1;
    helpfulness = MODEL_PROFILE.helpfulnessWhenBlocked;
    tokens = MODEL_PROFILE.tokensWhenBlocked;
    piiScore = 0;
    toxicityScore = 0;
  } else {
    if (isToxic) {
      compliance = randFloat(0, 0.2);
      toxicityScore = randFloat(0.8, 1);
    } else {
      compliance = (1 - randFloat(0, 0.1) + MODEL_PROFILE.complianceBase) / 2;
      toxicityScore = randFloat(0, 0.1);
    }

    piiScore = hasPII ? randFloat(0.8, 1) : 0;
    helpfulness = randFloat(0.8, 1);

    tokens = Math.max(
      10,
      Math.floor(
        (baseChar.baseTokens +
          randFloat(-baseChar.tokenVariance, baseChar.tokenVariance)) *
          (subMod.complexity || 1)
      )
    );
  }

  const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
  let responseTime = tokens * msPerToken + randFloat(0, 50);

  if (needsWeb) responseTime += randFloat(500, 1500);
  if (caughtToxic || caughtPII) responseTime += 50;

  const complexity =
    (baseChar.complexity || 1) * (subMod.complexity || 1);

  const gigaFlopsUsed = (tokens * 6 * complexity) / 1000;
  const energyConsumption = gigaFlopsUsed * 0.5;

  const flagged = isToxic && isChaos;

  return {
    topic,
    sub_topic,
    tokensUsed: tokens,
    gigaFlopsUsed,
    policyCompliance: compliance,
    responseHelpfulness: helpfulness,
    responseTime,
    energyConsumption,
    toxicityScore,
    piiDetected: piiScore,
    webLookups: needsWeb ? randInt(1, 4) : 0,
    aiOutput: flagged ? randChoice(flaggedOutputPool) : null
  };
}