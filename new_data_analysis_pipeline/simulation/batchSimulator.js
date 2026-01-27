import { getModelConfig } from './modelRegistry.js';
import { applyGeneralizationBias } from './biasEngine.js';
import { simulateCall } from './callSimulator.js';

function computeQueryVolume(intervalDuration, volumeBias) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const angle = ((hour - 3) / 24) * 2 * Math.PI;
  const timeWeight = Math.sin(angle) + 1.5;

  const baseQueries = Math.floor(Math.random() * 50) + 30;
  return Math.max(
    1,
    Math.floor(baseQueries * timeWeight * intervalDuration * volumeBias / 2)
  );
}

export function simulateBatch(
  modelName,
  intervalDuration,
  previousGeneralization = null,
  { emitCalls = false } = {}
) {
  const model = getModelConfig(modelName);

  const {
    topicWeights,
    characteristicBias,
    volumeBias
  } = applyGeneralizationBias({
    topicWeights: model.TOPIC_WEIGHTS,
    previousGeneralization
  });

  const queryCount = computeQueryVolume(intervalDuration, volumeBias);

  const stats = {
    toxicitySum: 0,
    piiSum: 0,
    complianceSum: 0
  };

  const breakdown = {};
  const calls = emitCalls ? [] : null;

  for (let i = 0; i < queryCount; i++) {
    const call = simulateCall({
      model,
      topicWeights,
      characteristicBias
    });

    stats.toxicitySum += call.toxicityScore;
    stats.piiSum += call.piiDetected;
    stats.complianceSum += call.policyCompliance;

    const bucket = breakdown[call.topic] ??= {
      count: 0,
      toxicity: 0,
      pii: 0
    };

    bucket.count++;
    bucket.toxicity += call.toxicityScore;
    bucket.pii += call.piiDetected;

    if (emitCalls) calls.push(call);
  }

  return {
    model: modelName,
    queryCount,
    toxicityScore: { mean: stats.toxicitySum / queryCount },
    piiDetected: { mean: stats.piiSum / queryCount },
    policyCompliance: { mean: stats.complianceSum / queryCount },
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([k, v]) => [
        k,
        {
          queryCount: v.count,
          toxicityScore: v.toxicity / v.count,
          piiDetected: v.pii / v.count
        }
      ])
    ),
    calls
  };
}