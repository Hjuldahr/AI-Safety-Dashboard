
const TOPIC_WEIGHTS = {
  "Customer Support": 40,  // The bulk of traffic
  "Sales & Inquiry": 30,
  "General Information": 25,
  "Unsupported Use": 5     // The rare, dangerous stuff
};

export function getRandomBool(threshold=0.5) {
  return Math.random() < threshold;
}
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
export function getRandomUserId(length = 16) {
    return Math.random().toString(36).slice(2, 2 + length);
}
export function getRandomCallId(length = 16) {
    return Date.now().toString(36).slice(2, 2 + length);
}

export async function dummyAI(modelName, oldResults, intervalDuration) {
    calls = []

    calls.push({
        'callId': getRandomCallId(),
        'userId': getRandomUserId(),
        'model': modelName,
        'time': getRandomInt(start_time, start_time + (intervalDuration * 1000)),
        'tokensUsed': tokens,
        'policyCompliance': compliance,
        'responseHelpfulness': helpfulness,
        'responseTime': responseTime,
        'topic': topic,
        'isWork': isWork,
        'intent': intention,
        'toxicityScore': toxicityScore,
        'piiDetected': piiScore,
        'isHostile': isHostile
    });

    return calls
}