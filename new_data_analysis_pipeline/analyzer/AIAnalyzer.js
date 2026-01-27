import { simulateBatch } from '../simulation/batchSimulator.js';

export function AIAnalyzer(
  modelName,
  intervalDuration,
  previousGeneralization = null
) {
  const result = simulateBatch(
    modelName,
    intervalDuration,
    previousGeneralization
  );

  return {
    ...result,
    responseTimestamp: Date.now()
  };
}