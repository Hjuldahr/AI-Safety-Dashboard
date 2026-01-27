import flaggedOutputPool from '../flagged_output_pool/flagged_output_pool.json' with { type: 'json' };
import { selectTopic } from './topicSelector.js';
import { randBools } from '../core/random.js';

export function simulateCallVectorized({
  model,
  topicWeights,
  characteristicBias,
  queryCount,
  emitCalls
}) {
  const { TOPIC_CHARACTERISTICS, SUBTOPIC_CHARACTERISTICS_MODIFIERS, MODEL_PROFILE } = model;

  const chaos = randBools(queryCount, 0.01);

  const topicSelections = Array.from({ length: queryCount }, () => selectTopic(topicWeights));

  const calls = [];
  const breakdown = {};

  for (let i = 0; i < queryCount; i++) {
    const { topic, sub_topic } = topicSelections[i];
    const baseChar = TOPIC_CHARACTERISTICS[topic];
    const subMod = SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {};

    const isChaos = chaos[i];

    const toxChance = isChaos
      ? 0.5
      : (subMod.toxicityChance ?? baseChar.toxicityChance) * characteristicBias.toxicity;

    const piiChance = isChaos
      ? 0.5
      : (subMod.piiChance ?? baseChar.piiChance) * characteristicBias.pii;

    const isToxic = Math.random() < toxChance;
    const hasPII = Math.random() < piiChance;
    const needsWeb = Math.random() < (subMod.webLookupChance ?? baseChar.webLookupChance);

    const caughtToxic = isToxic && Math.random() < MODEL_PROFILE.filterStrength;
    const caughtPII = hasPII && Math.random() < MODEL_PROFILE.filterStrength;

    let t, c, h, tox, pii;

    if (caughtToxic || caughtPII) {
      c = 1;
      h = MODEL_PROFILE.helpfulnessWhenBlocked;
      t = MODEL_PROFILE.tokensWhenBlocked;
      tox = 0;
      pii = 0;
    } else {
      if (isToxic) {
        c = Math.random() * 0.2;
        tox = Math.random() * 0.2 + 0.8;
      } else {
        c = (1 - Math.random() * 0.1 + MODEL_PROFILE.complianceBase) / 2;
        tox = Math.random() * 0.1;
      }

      pii = hasPII ? Math.random() * 0.2 + 0.8 : 0;
      h = Math.random() * 0.2 + 0.8;

      t = Math.max(
        10,
        Math.floor(
          (baseChar.baseTokens + (Math.random() * baseChar.tokenVariance * 2 - baseChar.tokenVariance)) *
          (subMod.complexity || 1)
        )
      );
    }

    const msPerToken = 20 * MODEL_PROFILE.speedMultiplier;
    let rt = t * msPerToken + Math.random() * 50;

    if (needsWeb) rt += Math.random() * 1000 + 500;
    if (caughtToxic || caughtPII) rt += 50;

    const complexity = (baseChar.complexity || 1) * (subMod.complexity || 1);
    const gflopsUsed = (t * 6 * complexity) / 1000;
    const energyUsed = gflopsUsed * 0.5;

    const webLookups = needsWeb ? Math.floor(Math.random() * 3) + 1 : 0;

    const call = {
      topic,
      sub_topic,
      tokensUsed: t,
      gigaFlopsUsed: gflopsUsed,
      policyCompliance: c,
      responseHelpfulness: h,
      responseTime: rt,
      energyConsumption: energyUsed,
      webLookups,
      toxicityScore: tox,
      piiDetected: pii,
      aiOutput: isChaos && isToxic ? flaggedOutputPool[Math.floor(Math.random() * flaggedOutputPool.length)] : null,
      time: Date.now()
    };

    calls.push(call);

    const bucket = breakdown[topic] ??= { count: 0, toxicity: 0, pii: 0 };
    bucket.count++;
    bucket.toxicity += tox;
    bucket.pii += pii;
  }

  return { calls, breakdown: computeBreakdownFromCalls(calls) };
}

function mean(arr) {
  let sum = 0;
  for (const v of arr) sum += v;
  return sum / arr.length;
}

function computeBreakdownFromCalls(calls) {
  const buckets = {};
  for (const c of calls) {
    const topicKey = c.topic || "Unknown";
    if (!buckets[topicKey]) buckets[topicKey] = { type: 'topic', calls: [] };
    buckets[topicKey].calls.push(c);

    const subTopicKey = c.sub_topic || "Unknown";
    if (subTopicKey !== topicKey) {
      if (!buckets[subTopicKey]) buckets[subTopicKey] = { type: 'sub_topic', calls: [] };
      buckets[subTopicKey].calls.push(c);
    }
  }

  const breakdownData = {};
  for (const key of Object.keys(buckets)) {
    const bucketCalls = buckets[key].calls;
    breakdownData[key] = {
      type: buckets[key].type,
      queryCount: bucketCalls.length,
      responseTime: mean(bucketCalls.map(c => c.responseTime)),
      tokensUsed: mean(bucketCalls.map(c => c.tokensUsed)),
      energyConsumption: mean(bucketCalls.map(c => c.energyConsumption)) * 1000,
      responseHelpfulness: mean(bucketCalls.map(c => c.responseHelpfulness)) * 5,
      policyCompliance: mean(bucketCalls.map(c => c.policyCompliance)) * 100,
      toxicityScore: mean(bucketCalls.map(c => c.toxicityScore)),
      piiDetected: mean(bucketCalls.map(c => c.piiDetected)) * 100,
      gigaFlopsUsed: mean(bucketCalls.map(c => c.gigaFlopsUsed)),
      webLookups: mean(bucketCalls.map(c => c.webLookups))
    };
  }
  return breakdownData;
}