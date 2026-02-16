import { generateCalls } from './pseudoAI.js'

function nRound(value, n = 100) {
  return Math.round(value * n) / n
}

/**
 * Streaming stats accumulator
 * - Keeps min / max / sum / count
 * - Keeps a compact list ONLY for median
 */
function createStatsAccumulator() {
  return {
    min: Infinity,
    max: -Infinity,
    sum: 0,
    count: 0,
    values: [],

    push(v) {
      const value = typeof v === 'number' ? v : 0
      this.min = Math.min(this.min, value)
      this.max = Math.max(this.max, value)
      this.sum += value
      this.count++
      this.values.push(value)
    },

    finalize() {
      if (this.count === 0) {
        return { min: 0, max: 0, mean: 0, median: 0 }
      }

      const sorted = this.values
        .sort((a, b) => a - b)
        .map(v => nRound(v))

      const mid = Math.floor(sorted.length / 2)
      const median =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid]

      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: this.sum / this.count,
        median
      }
    }
  }
}

export function AIAnalyzer(modelName, intervalDuration, previousGeneralization = null) {
  const calls = generateCalls(modelName, intervalDuration, previousGeneralization)

  // ---- Global accumulators ----
  const stats = {
    time: createStatsAccumulator(),
    policyCompliance: createStatsAccumulator(),
    responseHelpfulness: createStatsAccumulator(),
    responseTime: createStatsAccumulator(),
    energyConsumption: createStatsAccumulator(),
    tokensUsed: createStatsAccumulator(),
    gigaFlopsUsed: createStatsAccumulator(),
    webLookups: createStatsAccumulator(),
    toxicityScore: createStatsAccumulator(),
    piiDetected: createStatsAccumulator(),
    aiOutput: []
  }

  // ---- Breakdown buckets ----
  const buckets = {}

  for (const c of calls) {
    stats.time.push(c.time)
    stats.policyCompliance.push(c.policyCompliance)
    stats.responseHelpfulness.push(c.responseHelpfulness)
    stats.responseTime.push(c.responseTime)
    stats.energyConsumption.push(c.energyConsumption)
    stats.tokensUsed.push(c.tokensUsed)
    stats.gigaFlopsUsed.push(c.gigaFlopsUsed)
    stats.webLookups.push(c.webLookups)
    stats.toxicityScore.push(c.toxicityScore)
    stats.piiDetected.push(c.piiDetected)
    stats.aiOutput.push(...c.aiOutput)

    const topicKey = c.topic || 'Unknown'
    if (!buckets[topicKey]) {
      buckets[topicKey] = {
        type: "topic",
        calls: []
      }
    }
    buckets[topicKey].calls.push(c)

    const subTopicKey = c.sub_topic || 'Unknown'
    if (subTopicKey !== topicKey) {
      if (!buckets[subTopicKey]) {
        buckets[subTopicKey] = {
          type: "sub_topic",
          calls: []
        }
      }
      buckets[subTopicKey].calls.push(c)
    }
  }

  // ---- Breakdown aggregation (single pass per bucket) ----
  const breakdown = {}

  for (const key in buckets) {
    const { type, calls: bucketCalls } = buckets[key]

    let rt = 0,
      tokens = 0,
      energy = 0,
      helpfulness = 0,
      compliance = 0,
      toxicity = 0,
      pii = 0,
      gflops = 0,
      web = 0,
      flaggedCount = 0

    for (const c of bucketCalls) {
      rt += c.responseTime || 0
      tokens += c.tokensUsed || 0
      energy += c.energyConsumption || 0
      helpfulness += c.responseHelpfulness || 0
      compliance += c.policyCompliance || 0
      toxicity += c.toxicityScore || 0
      pii += c.piiDetected || 0
      gflops += c.gigaFlopsUsed || 0
      web += c.webLookups || 0
      flaggedCount += (c.aiOutput) ? c.aiOutput.length : 0
    }

    const n = bucketCalls.length || 1

    breakdown[key] = {
      type,
      queryCount: n,
      responseTime: rt / n,
      tokensUsed: tokens / n,
      energyConsumption: (energy / n) * 1000,
      responseHelpfulness: (helpfulness / n) * 5,
      policyCompliance: (compliance / n) * 100,
      toxicityScore: toxicity / n,
      piiDetected: (pii / n) * 100,
      gigaFlopsUsed: gflops / n,
      webLookups: web / n,
      flaggedCount
    }
  }

  const now = Date.now()

  return {
    model: modelName,
    time: stats.time.finalize(),
    policyCompliance: stats.policyCompliance.finalize(),
    responseHelpfulness: stats.responseHelpfulness.finalize(),
    responseTime: stats.responseTime.finalize(),
    energyConsumption: stats.energyConsumption.finalize(),
    tokensUsed: stats.tokensUsed.finalize(),
    gigaFlopsUsed: stats.gigaFlopsUsed.finalize(),
    webLookups: stats.webLookups.finalize(),
    toxicityScore: stats.toxicityScore.finalize(),
    piiDetected: stats.piiDetected.finalize(),
    flaggedOutputs: stats.aiOutput,
    flaggedCount: stats.aiOutput.length,
    breakdown,
    queryCount: calls.length,
    responseTimestamp: now
  }
}