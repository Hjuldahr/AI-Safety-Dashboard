import { getModelConfig } from './modelRegistry.js';
import { applyGeneralizationBias } from './biasEngine.js';
import { simulateCallVectorized } from './callSimulatorVectorized.js';
import { PID } from './pid.js';

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

  const pidTarget = model.PID_TARGETS?.policyCompliance ?? 0.95;
  const pid = new PID(pidParams.kp, pidParams.ki, pidParams.kd);

  const measured = previousGeneralization?.policyCompliance?.mean ?? pidTarget;
  const correction = pid.update(pidTarget, measured);

  const {
    topicWeights,
    characteristicBias,
    volumeBias: initialVolumeBias
  } = applyGeneralizationBias({
    topicWeights: model.TOPIC_WEIGHTS,
    previousGeneralization,
    hysteresisThreshold
  });

  const volumeBias = Math.max(0.5, Math.min(1.5, initialVolumeBias + correction));
  const queryCount = computeQueryVolume(intervalDuration, volumeBias);

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
    volumeBias,
    stats,
    breakdown,
    calls
  };
}