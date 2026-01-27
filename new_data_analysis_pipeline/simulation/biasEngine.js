export function applyGeneralizationBias({
  topicWeights,
  previousGeneralization
}) {
  if (!previousGeneralization) {
    return {
      topicWeights,
      characteristicBias: { toxicity: 1, pii: 1 },
      volumeBias: 1
    };
  }

  const {
    toxicityScore,
    piiDetected,
    policyCompliance,
    breakdown
  } = previousGeneralization;

  const toxicityBias = 1 + Math.min(0.5, toxicityScore?.mean || 0);
  const piiBias = 1 + Math.min(0.5, (piiDetected?.mean || 0) / 100);

  const stability =
    (policyCompliance?.mean ?? 1) -
    (toxicityScore?.mean ?? 0) -
    ((piiDetected?.mean ?? 0) / 100);

  const volumeBias = Math.max(0.6, Math.min(1.2, stability + 0.8));

  const adjustedWeights = { ...topicWeights };

  if (breakdown) {
    for (const key in breakdown) {
      if (!adjustedWeights[key]) continue;

      const bucket = breakdown[key];
      const penalty =
        (bucket.toxicityScore ?? 0) +
        ((bucket.piiDetected ?? 0) / 100);

      adjustedWeights[key] *= Math.max(0.1, 1 - Math.min(0.5, penalty));
    }
  }

  return {
    topicWeights: adjustedWeights,
    characteristicBias: {
      toxicity: toxicityBias,
      pii: piiBias
    },
    volumeBias
  };
}