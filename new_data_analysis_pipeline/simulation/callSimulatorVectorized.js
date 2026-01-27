import flaggedOutputPool from '../flagged_output_pool/flagged_output_pool.json' with { type: 'json' };
import { selectTopic } from './topicSelector.js';
import { randFloats, randInts, randBools } from '../core/random.js'; //randFloats, randInts unused
import { applyHysteresis } from './hysteresis.js'; //unused

export function simulateCallVectorized({
  model,
  topicWeights,
  characteristicBias,
  queryCount,
  emitCalls,
  hysteresisThreshold
}) {
  const {
    TOPIC_CHARACTERISTICS,
    SUBTOPIC_CHARACTERISTICS_MODIFIERS,
    MODEL_PROFILE
  } = model;

  // vectorized RNG
  const chaos = randBools(queryCount, 0.01);

  // topic selection
  const topicSelections = Array.from({ length: queryCount }, () => selectTopic(topicWeights));

  const tokens = new Int32Array(queryCount);
  const responseTime = new Float64Array(queryCount);
  const compliance = new Float64Array(queryCount);
  const helpfulness = new Float64Array(queryCount);
  const toxicityScore = new Float64Array(queryCount);
  const piiDetected = new Float64Array(queryCount);
  const gflops = new Float64Array(queryCount);
  const energy = new Float64Array(queryCount);
  const webLookups = new Int32Array(queryCount);

  const calls = emitCalls ? [] : null;
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

    tokens[i] = t;
    compliance[i] = c;
    helpfulness[i] = h;
    toxicityScore[i] = tox;
    piiDetected[i] = pii;
    responseTime[i] = rt;
    gflops[i] = gflopsUsed;
    energy[i] = energyUsed;
    webLookups[i] = needsWeb ? Math.floor(Math.random() * 3) + 1 : 0;

    // breakdown
    const bucket = breakdown[topic] ??= { count: 0, toxicity: 0, pii: 0 };
    bucket.count++;
    bucket.toxicity += tox;
    bucket.pii += pii;

    if (emitCalls) {
      calls.push({
        topic,
        sub_topic,
        tokensUsed: t,
        gigaFlopsUsed: gflopsUsed,
        policyCompliance: c,
        responseHelpfulness: h,
        responseTime: rt,
        energyConsumption: energyUsed,
        webLookups: webLookups[i],
        toxicityScore: tox,
        piiDetected: pii,
        aiOutput: isChaos && isToxic ? flaggedOutputPool[Math.floor(Math.random() * flaggedOutputPool.length)] : null
      });
    }
  }

  // finalize stats
  const stats = {
    policyCompliance: mean(compliance),
    responseHelpfulness: mean(helpfulness),
    responseTime: mean(responseTime),
    energyConsumption: mean(energy),
    tokensUsed: mean(tokens),
    gigaFlopsUsed: mean(gflops),
    toxicityScore: mean(toxicityScore),
    piiDetected: mean(piiDetected)
  };

  const finalBreakdown = Object.fromEntries(
    Object.entries(breakdown).map(([k, v]) => [
      k,
      {
        queryCount: v.count,
        toxicityScore: v.toxicity / v.count,
        piiDetected: v.pii / v.count
      }
    ])
  );

  return { stats, breakdown: finalBreakdown, calls };
}

function mean(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  return sum / arr.length;
}