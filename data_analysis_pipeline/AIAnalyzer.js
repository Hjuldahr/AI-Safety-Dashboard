import { mean } from 'simple-statistics'
import { generateCalls } from './pseudoAI.js'


function nRound(value, n=100) {
  return Math.round(value * n) / n;
}

export function AIAnalyzer(modelName, intervalDuration, previousGeneralization = null) {
  const calls = generateCalls(modelName, intervalDuration, previousGeneralization)

  //if (!calls || calls.length === 0) return {};

  const computeStats = (arr) => {
    if (!arr || arr.length === 0) return { min: 0, max: 0, mean: 0, median: 0 };
    // round after sorting to preserve precision
    const sorted = [...arr].sort((a, b) => a - b).map((x) => nRound(x));
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
      queryCount: bucketCalls.length, // Useful to know volume per topic
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