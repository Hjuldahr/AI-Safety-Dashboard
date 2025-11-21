import { modeFast, mean } from 'simple-statistics'

// data_generator/test_data_generator_v4.js
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
export function remap(value, low1, high1, low2, high2) {
  return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
}

export const topics = {
  "Customer Support": [
    "Troubleshooting",
    "Account Management",
    "Returns & Refunds"
  ],
  "Sales & Inquiry": [
    "Product Info",
    "Pricing & Quotes",
    "Comparison"
  ],
  "General Information": [
    "Logistics & Shipping",
    "Business Details"
  ],
  "Unsupported Use": [
    "Casual Chat",
    "Technical / Adversarial"
  ]
};

/**
 * pseudoAI v4
 * - Emits tokensUsed (single token field)
 * - Emits gigaFlopsUsed
 * - Emits operationsPerToken (per-call estimate)
 * - Emits webLookups, toxicityScore, piiDetected
 */
export async function pseudoAI(
  modelName,
  intervalDuration,      // seconds
  min_callrate,          // min queries per second
  max_callrate,          // max queries per second
  min_pc,                // min policyCompliance
  max_pc,                // max policyCompliance
  min_rh,                // min responseHelpfulness
  max_rh,                // max responseHelpfulness
  minToxic = 0.0,        // min toxicityScore
  maxToxic = 0.1,        // max toxicityScore
  minPII = 0.0,          // min piiDetected
  maxPII = 0.01,         // max piiDetected
  avgGFlopsPerToken = 6, // avg GFLOPs per token
  msPerToken = 2         // ms per token
) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  let timeWeight = Math.sin(angle) + 1.5; // ensures positive weight

  const queries = Math.max(0, Math.floor(getRandomInt(min_callrate, max_callrate + 1) * intervalDuration * timeWeight));

  const start_time = now.getTime();
  const end_time = start_time + intervalDuration * 1000;

  const calls = [];

  for (let i = 0; i < queries; i++) {
    const topic = getRandomKey(topics);
    const sub_topic = getRandomArrayElement(topics[topic]);

    // token distribution: mostly 20-400 with occasional long tails
    let tokensUsed = Math.max(1, Math.round(getRandomFloat(50, 501) * (getRandomFloat(0.9, 1.1))));
    if (getRandomFloat(0, 1) < 0.02) tokensUsed = getRandomInt(500, 2000); // 2% chance of long response

    // response time: ms per token with jitter; but floor at small value
    const responseTime = Math.max(1, tokensUsed * msPerToken + getRandomFloat(-10, 20));

    // web lookup: ~10% chance
    let webLookups = 0;
    if (getRandomFloat(0, 1) < 0.10) webLookups = getRandomInt(1, 6);

    // per-call operations per token can vary by topic or randomly
    const opsPerToken = getRandomFloat(avgGFlopsPerToken - 0.3, avgGFlopsPerToken + 0.3);

    // GFLOPs used (approx)
    const gigaFlopsUsed = tokensUsed * opsPerToken;

    // energy: loosely correlated to GFLOPs and response time (joules-ish proxy)
    // scale factor chosen to keep numbers reasonable for a mock dataset
    const energyConsumption = gigaFlopsUsed * 1e-6 + responseTime * 0.001 + getRandomFloat(0, 0.002);

    calls.push({
      model: modelName,
      time: getRandomInt(start_time, end_time + 1),
      tokensUsed: tokensUsed,
      gigaFlopsUsed: gigaFlopsUsed,
      policyCompliance: getRandomFloat(min_pc, max_pc),
      responseHelpfulness: getRandomFloat(min_rh, max_rh),
      responseTime: responseTime,
      energyConsumption: energyConsumption,
      webLookups: webLookups,
      topic: topic,
      sub_topic: sub_topic,
      toxicityScore: getRandomFloat(minToxic, maxToxic),
      piiDetected: getRandomFloat(minPII, maxPII)
    });
  }

  // sort by time so downstream summarizers can compute intervals correctly
  calls.sort((a, b) => a.time - b.time);
  return calls;
}

// data_generator/AIGeneralizer_v2.js
export function AIGeneralizer(modelName, calls) {
  if (!calls || calls.length === 0) return {};

  const computeStats = (arr) => {
    if (!arr || arr.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const len = sorted.length;
    const sum = sorted.reduce((s, v) => s + v, 0);
    const mid = Math.floor(len / 2);
    return {
      min: sorted[0],
      max: sorted[len - 1],
      mean: sum / len,
      median: len % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
    };
  };

  const times = [], pc = [], rh = [], rt = [], ec = [], tokens = [], ops = [], gflops = [], web = [], toxic = [], pii = [], topics = [], sub_topics = [];

  const buckets = {};

  for (const c of calls) {
    times.push(c.time || 0);
    pc.push(typeof c.policyCompliance === 'number' ? c.policyCompliance : 0);
    rh.push(typeof c.responseHelpfulness === 'number' ? c.responseHelpfulness : 0);
    rt.push(typeof c.responseTime === 'number' ? c.responseTime : 0);
    ec.push(typeof c.energyConsumption === 'number' ? c.energyConsumption : 0);
    tokens.push(typeof c.tokensUsed === 'number' ? c.tokensUsed : 0);
    gflops.push(typeof c.gigaFlopsUsed === 'number' ? c.gigaFlopsUsed : 0);
    web.push(typeof c.webLookups === 'number' ? c.webLookups : 0);
    toxic.push(typeof c.toxicityScore === 'number' ? c.toxicityScore : 0);
    pii.push(typeof c.piiDetected === 'number' ? c.piiDetected : 0);
    // topics.push(typeof c.topic === 'string' ? c.topic : "No Topic");
    // sub_topics.push(typeof c.sub_topic === 'string' ? c.sub_topic : "No Sub Topic");

    // Populate Breakdown Buckets
    const topicKey = c.topic || "Unknown";
    if (!buckets[topicKey]) buckets[topicKey] = { type: 'topic', calls: [] };
    buckets[topicKey].calls.push(c);

    const subTopicKey = c.sub_topic || "Unknown";
    // Edge case prevention: if sub_topic has same name as topic, don't overwrite (unlikely but safe)
    if (subTopicKey !== topicKey) {
      if (!buckets[subTopicKey]) buckets[subTopicKey] = { type: 'sub_topic', calls: [] };
      buckets[subTopicKey].calls.push(c);
    }
  }

  const breakdownData = {};

  Object.keys(buckets).forEach(key => {
    const { type, calls: bucketCalls } = buckets[key];

    // Calculate the averages for this specific Topic/Sub-topic
    breakdownData[key] = {
      type: type,
      count: bucketCalls.length, // Useful to know volume per topic
      responseTime: mean(bucketCalls.map(c => c.responseTime)),
      tokensUsed: mean(bucketCalls.map(c => c.tokensUsed)),
      energyConsumption: mean(bucketCalls.map(c => c.energyConsumption)),
      responseHelpfulness: mean(bucketCalls.map(c => c.responseHelpfulness)),
      policyCompliance: mean(bucketCalls.map(c => c.policyCompliance)),
      toxicityScore: mean(bucketCalls.map(c => c.toxicityScore)),
      piiDetected: mean(bucketCalls.map(c => c.piiDetected)),
      gigaFlopsUsed: mean(bucketCalls.map(c => c.gigaFlopsUsed)),
      webLookups: mean(bucketCalls.map(c => c.webLookups))
    };
  });


  const now = Date.now();

  return {
    model: modelName,
    time: computeStats(times),
    policyCompliance: computeStats(pc),
    responseHelpfulness: computeStats(rh),
    responseTime: computeStats(rt),
    energyConsumption: computeStats(ec),
    tokensUsed: computeStats(tokens),
    gigaFlopsUsed: computeStats(gflops),
    webLookups: computeStats(web),
    toxicityScore: computeStats(toxic),
    piiDetected: computeStats(pii),
    breakdown: breakdownData,
    queryCount: calls.length,
    responseTimestamp: now
  };
}