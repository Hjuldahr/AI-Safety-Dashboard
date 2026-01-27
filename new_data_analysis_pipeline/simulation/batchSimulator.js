import { getModelConfig } from './modelRegistry.js';
import { applyGeneralizationBias } from './biasEngine.js';
import { simulateCallVectorized } from './callSimulatorVectorized.js';
import { PID } from './pid.js';

function computeStats(arr) {
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
}

function computeBreakdown(calls) {
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

export function simulateBatch(
  modelName,
  intervalDuration,
  previousGeneralization = null,
  {
    emitCalls = false,
    pidParams = { kp: 0.3, ki: 0.05, kd: 0.01 },
    hysteresisThreshold = 0.05
  } = {}
) {
  const model = getModelConfig(modelName);

  // PID
  const pidTarget = model.PID_TARGETS?.policyCompliance ?? 0.95;
  const pid = new PID(pidParams.kp, pidParams.ki, pidParams.kd);

  const measured = previousGeneralization?.policyCompliance?.mean ?? pidTarget;
  const correction = pid.update(pidTarget, measured);

  // Bias
  const { topicWeights, characteristicBias, volumeBias } =
    applyGeneralizationBias({
      topicWeights: model.TOPIC_WEIGHTS,
      previousGeneralization,
      hysteresisThreshold
    });

  const adjustedVolumeBias = Math.max(0.5, Math.min(1.5, volumeBias + correction));

  // query volume
  const queryCount = Math.max(1, Math.floor(intervalDuration * model.QUERY_RATE * adjustedVolumeBias));

  // Simulate
  const { stats, breakdown, calls } = simulateCallVectorized({
    model,
    topicWeights,
    characteristicBias,
    queryCount,
    emitCalls
  });

  return {
    model: modelName,
    queryCount,
    volumeBias: adjustedVolumeBias,
    time: computeStats(calls.map(c => c.time || 0)),
    policyCompliance: computeStats(calls.map(c => c.policyCompliance)),
    responseHelpfulness: computeStats(calls.map(c => c.responseHelpfulness)),
    responseTime: computeStats(calls.map(c => c.responseTime)),
    energyConsumption: computeStats(calls.map(c => c.energyConsumption)),
    tokensUsed: computeStats(calls.map(c => c.tokensUsed)),
    gigaFlopsUsed: computeStats(calls.map(c => c.gigaFlopsUsed)),
    webLookups: computeStats(calls.map(c => c.webLookups)),
    toxicityScore: computeStats(calls.map(c => c.toxicityScore)),
    piiDetected: computeStats(calls.map(c => c.piiDetected)),
    breakdown,
    calls
  };
}