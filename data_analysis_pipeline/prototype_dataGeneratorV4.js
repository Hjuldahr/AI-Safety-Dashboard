const TOPIC_WEIGHTS = {
  "Writing": 0.251,
  "Practical Guidance": 0.300,
  "Technical Help": 0.063,
  "Seeking Information": 0.256,
  "Self-Expression": 0.065,
  "Other": 0.064
};
const TOPICS = {
  "Writing": ["Nonfiction Writing","Fiction Writing","Proofreading","Translation","Summarization"],
  "Practical Guidance": ["How to advice","Academic Learning","Creative Ideation","Personal Wellness"],
  "Technical Help": ["Mathematics","Data Analysis","Troubleshooting","Computer Programming"],
  "Seeking Information": ["Focused Research","Product Comparison","Culinary Recipes"],
  "Self-Expression": ["Conversation","Introspection","Roleplay"],
  "Other": ["Meta Knowledge","Malicious Prompt","Unknown"]
};
const INTENTS = ["doing","asking","expressing"];



export function getRandomBool(threshold=0.5) {
  return Math.random() < threshold;
}
export function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
export function getRandomArrayElement(array) {
  return array[getRandomInt(0, array.length)];
}
export function getRandomKeyWeighted(dict) {
  const r = Math.random();
  let sum = 0;
  for (let key in dict) {
    sum += dict[key];
    if (r <= sum) return key;
  }
  return Object.keys(dict)[0];
}
export function getRandomUserId(length = 16) {
    return Math.random().toString(36).slice(2, 2 + length);
}
export function getRandomCallId(length = 16) {
    return Date.now().toString(36).slice(2, 2 + length);
}
function weightedRandom(weightMap) {
    const r = Math.random();
    let sum = 0;
    const total = Object.values(weightMap).reduce((a,b)=>a+b,0);
    for (let k in weightMap) {
        sum += weightMap[k]/total;
        if (r <= sum) return k;
    }
    return Object.keys(weightMap)[0];
}

export async function dummyAI(modelName, intervalDuration, queries = 10, previousGeneralization = {}) {
    const calls = [];
    const now = new Date();
    const start_time = now.getTime();
    const hour = now.getHours() + now.getMinutes() / 60;

    // Work chance by time blocks
    let isWorkChance = 0.0;
    if (hour < 9) isWorkChance = 0.232; // early morning
    else if (hour > 17) isWorkChance = 0.348; // late afternoon
    else isWorkChance = 0.551; // normal work hours

    // Optional: use previous generalization to bias topic / intent
    const topicBias = previousGeneralization.topicCounts || {};
    const intentBias = previousGeneralization.intentCounts || {};

    for (let i = 0; i < queries; i++) {
        // Decide if this call is work-related
        const isWork = getRandomBool(isWorkChance);

        // Bias topic selection based on work and hour
        let mainTopic = getRandomKeyWeighted(TOPIC_WEIGHTS);

        // Use previous generalization to favor less frequent topics slightly
        if (Object.keys(topicBias).length > 0) {
            const rareTopics = Object.keys(TOPIC_WEIGHTS).filter(t => !topicBias[t] || topicBias[t] < (queries/6));
            if (rareTopics.length > 0 && getRandomBool(0.5)) {
                mainTopic = getRandomArrayElement(rareTopics);
            }
        }

        // Hour and work affects subtopic selection (e.g., practical guidance more during work hours)
        const subTopic = getRandomArrayElement(TOPICS[mainTopic]);

        // Intent influenced by topic, hour, and previous counts
        let intentWeights = { doing: 0.4, asking: 0.4, expressing: 0.2 };
        if (mainTopic === "Self-Expression") intentWeights = { doing: 0.2, asking: 0.2, expressing: 0.6 };
        if (mainTopic === "Technical Help") intentWeights = { doing: 0.5, asking: 0.4, expressing: 0.1 };
        if (intentBias && Object.keys(intentBias).length > 0) {
            // Slightly reduce chance of most frequent intent in previous calls
            const maxIntent = Object.entries(intentBias).sort((a,b)=>b[1]-a[1])[0][0];
            intentWeights[maxIntent] *= 0.7;
        }
        const intent = weightedRandom(intentWeights);

        // Token count affected by topic complexity, hour, previous mean token count
        let tokenBase;
        switch(mainTopic) {
            case "Writing": tokenBase = getRandomInt(300, 1500); break;
            case "Practical Guidance": tokenBase = getRandomInt(200, 1200); break;
            case "Technical Help": tokenBase = getRandomInt(400, 2000); break;
            case "Seeking Information": tokenBase = getRandomInt(100, 1000); break;
            case "Self-Expression": tokenBase = getRandomInt(50, 800); break;
            case "Other": tokenBase = getRandomInt(100, 1500); break;
        }
        if (previousGeneralization.meanTokens) tokenBase = Math.floor((tokenBase + previousGeneralization.meanTokens) / 2);
        const hourModifier = (hour >= 9 && hour <= 17) ? 1.2 : 0.8;
        const tokens = Math.floor(tokenBase * hourModifier);

        // PII score continuous 0–1, influenced by topic and previous mean
        let piiScore = getRandomFloat(0, 0.15); // low default
        if (mainTopic === "Practical Guidance" || mainTopic === "Writing") piiScore += getRandomFloat(0, 0.1);
        if (previousGeneralization.meanPII) piiScore = (piiScore + previousGeneralization.meanPII) / 2;

        // Toxicity score continuous 0–1
        let toxicityScore = getRandomFloat(0, 0.3);
        if (previousGeneralization.meanToxicity) toxicityScore = (toxicityScore + previousGeneralization.meanToxicity) / 2;

        // Compliance inversely related to toxicity + PII
        let complianceBase = 0.9;
        if (mainTopic === "Other") complianceBase = 0.75;
        const policyCompliance = Math.max(0, Math.min(1, complianceBase - 0.5*toxicityScore - 0.3*piiScore));

        // Helpfulness positively correlated with compliance
        const responseHelpfulness = Math.max(0, Math.min(1, 0.7 + (policyCompliance - 0.85)*0.5));

        // Response time correlated with tokens and inverse of helpfulness
        const responseTime = getRandomInt(50, 200) + Math.floor(tokens / 5) * (1 - responseHelpfulness);

        // GigaFlops scales with tokens and small random noise
        const gigaFlopsUsed = getRandomFloat(0.05, 0.1) + tokens / 10000;

        // Energy consumption scales with flops
        const energyConsumption = getRandomFloat(0.01, 0.02) + gigaFlopsUsed * 0.05;

        // Web lookups more likely for information topics
        let webLookups = 0;
        if(mainTopic === "Seeking Information") webLookups = getRandomInt(1, 5);
        else webLookups = getRandomInt(0, 2);

        // Hostility rare but more likely if toxicity is high
        const isHostile = getRandomBool(toxicityScore * 0.1 + 0.01);

        // Random timestamp within interval
        const timestamp = getRandomInt(start_time, start_time + intervalDuration * 1000);

        calls.push({
            callId: getRandomCallId(),
            userId: getRandomUserId(),
            model: modelName,
            time: timestamp,
            tokensUsed: tokens,
            policyCompliance: policyCompliance,
            responseHelpfulness: responseHelpfulness,
            responseTime: responseTime,
            topic: subTopic,
            mainTopic: mainTopic,
            isWork: isWork,
            intent: intent,
            toxicityScore: toxicityScore, 
            piiDetected: piiScore, 
            gigaFlopsUsed: gigaFlopsUsed,
            webLookups: webLookups,
            energyConsumption: energyConsumption,
            isHostile: isHostile
        });
    }

    return calls;
}
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

  const mean = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

  // Collect overall values
  const times=[], pc=[], rh=[], rt=[], ec=[], tokens=[], gflops=[], web=[], toxic=[], pii=[];
  const workFlags=[], hostileFlags=[], intents=[];

  // Efficient per-topic/sub-topic numeric summaries
  const breakdownBuckets = {};

  for (const c of calls) {
    // Push overall arrays
    times.push(c.time || 0);
    pc.push(c.policyCompliance || 0);
    rh.push(c.responseHelpfulness || 0);
    rt.push(c.responseTime || 0);
    ec.push(c.energyConsumption || 0);
    tokens.push(c.tokensUsed || 0);
    gflops.push(c.gigaFlopsUsed || 0);
    web.push(c.webLookups || 0);
    toxic.push(c.toxicityScore || 0);
    pii.push(c.piiDetected || 0);
    workFlags.push(c.isWork ? 1 : 0);
    hostileFlags.push(c.isHostile ? 1 : 0);
    intents.push(c.intent || "unknown");

    // Aggregate per mainTopic and topic
    const keys = [
      { key: c.mainTopic || "Unknown", type: "mainTopic" },
      { key: c.topic || "Unknown", type: "topic" }
    ];

    keys.forEach(({ key, type }) => {
      if (!breakdownBuckets[key]) {
        breakdownBuckets[key] = {
          type,
          queryCount: 0,
          tokens: [], policyCompliance: [], responseHelpfulness: [], responseTime: [],
          energyConsumption: [], gigaFlopsUsed: [], webLookups: [], toxicityScore: [], piiDetected: [],
          isWorkFlags: [], isHostileFlags: [], intentCounts: {}
        };
      }
      const b = breakdownBuckets[key];
      b.queryCount++;
      b.tokens.push(c.tokensUsed || 0);
      b.policyCompliance.push(c.policyCompliance || 0);
      b.responseHelpfulness.push(c.responseHelpfulness || 0);
      b.responseTime.push(c.responseTime || 0);
      b.energyConsumption.push(c.energyConsumption || 0);
      b.gigaFlopsUsed.push(c.gigaFlopsUsed || 0);
      b.webLookups.push(c.webLookups || 0);
      b.toxicityScore.push(c.toxicityScore || 0);
      b.piiDetected.push(c.piiDetected || 0);
      b.isWorkFlags.push(c.isWork ? 1 : 0);
      b.isHostileFlags.push(c.isHostile ? 1 : 0);
      b.intentCounts[c.intent] = (b.intentCounts[c.intent] || 0) + 1;
    });
  }

  // Convert arrays into numeric summaries
  const breakdownData = {};
  Object.keys(breakdownBuckets).forEach(key => {
    const b = breakdownBuckets[key];
    breakdownData[key] = {
      type: b.type,
      queryCount: b.queryCount,
      tokensUsed: computeStats(b.tokens),
      policyCompliance: computeStats(b.policyCompliance),
      responseHelpfulness: computeStats(b.responseHelpfulness),
      responseTime: computeStats(b.responseTime),
      energyConsumption: computeStats(b.energyConsumption),
      gigaFlopsUsed: computeStats(b.gigaFlopsUsed),
      webLookups: computeStats(b.webLookups),
      toxicityScore: computeStats(b.toxicityScore),
      piiDetected: computeStats(b.piiDetected),
      isWorkFraction: mean(b.isWorkFlags),
      isHostileFraction: mean(b.isHostileFlags),
      intentDistribution: b.intentCounts
    };
  });

  const now = Date.now();

  return {
    model: modelName,
    queryCount: calls.length,
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
    workFraction: mean(workFlags),
    hostileFraction: mean(hostileFlags),
    intentDistribution: intents.reduce((acc,i)=>{ acc[i]=(acc[i]||0)+1; return acc; }, {}),
    breakdown: breakdownData,
    responseTimestamp: now
  };
}