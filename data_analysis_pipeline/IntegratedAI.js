import random from './random.js'
import { TOPIC_HIERARCHY } from '../config/constants.js'
import { getModelConfig, LOADED_MODELS } from './modelRegistry.js'
import flaggedOutputPool from './flagged_output_pool/flagged_output_pool.json' with { type: 'json' }

function createAccumulator() {
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
      if (!this.count) {
        return { min: 0, max: 0, mean: 0, median: 0 }
      }

      const sorted = this.values.sort((a, b) => a - b)
      const mid = Math.floor(sorted.length / 2)

      return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        mean: this.sum / this.count,
        median:
          sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid]
      }
    }
  }
}

function applyGeneralizationBias(topicWeights, previousGeneralization) {
  if (!previousGeneralization) {
    return {
      topicWeights,
      characteristicBias: { toxicity: 1, pii: 1 },
      volumeBias: 1
    }
  }

  const { toxicityScore, piiDetected, policyCompliance, breakdown } =
    previousGeneralization

  const toxicityBias = 1 + Math.min(0.5, toxicityScore?.mean || 0)
  const piiBias = 1 + Math.min(0.5, (piiDetected?.mean || 0) / 100)

  const stability =
    (policyCompliance?.mean ?? 1) -
    (toxicityScore?.mean ?? 0) -
    ((piiDetected?.mean ?? 0) / 100)

  const volumeBias = Math.max(0.6, Math.min(1.2, stability + 0.8))

  const adjustedWeights = { ...topicWeights }

  if (breakdown) {
    for (const key in breakdown) {
      if (!adjustedWeights[key]) continue

      const penalty =
        (breakdown[key].toxicityScore ?? 0) +
        ((breakdown[key].piiDetected ?? 0) / 100)

      adjustedWeights[key] *= 1 - Math.min(0.5, penalty)
    }
  }

  return {
    topicWeights: adjustedWeights,
    characteristicBias: { toxicity: toxicityBias, pii: piiBias },
    volumeBias
  }
}

/**
 * pseudoAI v8 — generalized output
 */
export function generateAggregates(modelName, intervalDuration, previousGeneralization = null) {
  if (!LOADED_MODELS.includes(modelName)) {
    throw new Error(`Model has no configuration file loaded: ${modelName}`)
  }

  const modelConfig = getModelConfig(modelName)
  const { MODEL_PROFILE } = modelConfig

  const { topicWeights, characteristicBias, volumeBias } =
    applyGeneralizationBias(modelConfig.TOPIC_WEIGHTS, previousGeneralization)

  const now = new Date()
  const hour = now.getHours() + now.getMinutes() / 60
  const angle = ((hour - 3) / 24) * 2 * Math.PI
  const timeWeight = Math.sin(angle) + 1.5

  const baseQueries = random.getRandomInt(30, 80)
  const queries = Math.max(
    1,
    Math.floor(baseQueries * timeWeight * intervalDuration * volumeBias / 2)
  )

  const stats = {
    time: createAccumulator(),
    policyCompliance: createAccumulator(),
    responseHelpfulness: createAccumulator(),
    responseTime: createAccumulator(),
    energyConsumption: createAccumulator(),
    tokensUsed: createAccumulator(),
    gigaFlopsUsed: createAccumulator(),
    webLookups: createAccumulator(),
    toxicityScore: createAccumulator(),
    piiDetected: createAccumulator()
  }

  const breakdown = {}
  const startTime = now.getTime()

  let flaggedOutputs = []

  for (let i = 0; i < queries; i++) {
    const topic = random.getWeightedRandomKey(topicWeights)
    const sub_topic = random.getRandomArrayElement(TOPIC_HIERARCHY[topic])

    const baseChar = modelConfig.TOPIC_CHARACTERISTICS[topic]
    const subMod = modelConfig.SUBTOPIC_CHARACTERISTICS_MODIFIERS[sub_topic] || {}

    const isChaos = random.getRandomBool(0.01)

    const toxicityChance = isChaos
      ? 0.5
      : (subMod.toxicityChance ?? baseChar.toxicityChance) *
        characteristicBias.toxicity

    const piiChance = isChaos
      ? 0.5
      : (subMod.piiChance ?? baseChar.piiChance) * characteristicBias.pii

    const webLookupChance = isChaos
      ? 0.8
      : subMod.webLookupChance ?? baseChar.webLookupChance ?? 0

    const isToxic = random.getRandomBool(toxicityChance)
    const hasPII = random.getRandomBool(piiChance)
    const needsWeb = random.getRandomBool(webLookupChance)

    const caught =
      (isToxic || hasPII) &&
      random.getRandomBool(MODEL_PROFILE.filterStrength)

    const flagged = isToxic && isChaos
    if (flagged && flaggedOutputs.length < 3) {
      flaggedOutputs.push(random.getRandomArrayElement(flaggedOutputPool))
    }

    let compliance, helpfulness, tokens, piiScore, toxicityScore

    if (caught) {
      compliance = 1
      helpfulness = MODEL_PROFILE.helpfulnessWhenBlocked
      tokens = MODEL_PROFILE.tokensWhenBlocked
      piiScore = 0
      toxicityScore = 0
    } else {
      toxicityScore = isToxic ? random.getRandomFloat(0.8, 1) : random.getRandomFloat(0, 0.1)
      piiScore = hasPII ? random.getRandomFloat(0.8, 1) : 0
      compliance = isToxic
        ? random.getRandomFloat(0, 0.2)
        : (1 - random.getRandomFloat(0, 0.1) + MODEL_PROFILE.complianceBase) / 2
      helpfulness = random.getRandomFloat(0.8, 1)

      const baseTokens = subMod.baseTokens ?? baseChar.baseTokens
      const variance = subMod.tokenVariance ?? baseChar.tokenVariance

      tokens = Math.max(
        10,
        Math.floor(
          (baseTokens + random.getRandomFloat(-variance, variance)) *
            (subMod.complexity || 1)
        )
      )
    }

    const responseTime =
      tokens * 20 * MODEL_PROFILE.speedMultiplier +
      random.getRandomFloat(0, 50) +
      (needsWeb ? random.getRandomFloat(500, 1500) : 0)

    const complexity =
      (baseChar.complexity || 1) * (subMod.complexity || 1)

    const gflops = (tokens * 6 * complexity) / 1000
    const energy = gflops * 0.5

    stats.time.push(random.getRandomInt(startTime, startTime + intervalDuration * 1000))
    stats.policyCompliance.push(compliance)
    stats.responseHelpfulness.push(helpfulness)
    stats.responseTime.push(responseTime)
    stats.energyConsumption.push(energy)
    stats.tokensUsed.push(tokens)
    stats.gigaFlopsUsed.push(gflops)
    stats.webLookups.push(needsWeb ? random.getRandomInt(1, 4) : 0)
    stats.toxicityScore.push(toxicityScore)
    stats.piiDetected.push(piiScore)

    const key = sub_topic !== topic ? sub_topic : topic
    breakdown[key] ??= {
      type: sub_topic !== topic ? 'sub_topic' : 'topic',
      calls: 0,
      toxicity: 0,
      pii: 0
    }

    breakdown[key].calls++
    breakdown[key].toxicity += toxicityScore
    breakdown[key].pii += piiScore
  }

  return {
    model: modelName,
    queryCount: queries,
    responseTimestamp: Date.now(),
    flaggedOutputs,
    ...Object.fromEntries(
      Object.entries(stats).map(([k, acc]) => [k, acc.finalize()])
    ),
    breakdown
  }
}