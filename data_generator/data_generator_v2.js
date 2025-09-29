const fs = require('fs').promises;
const path = require('path');
const { randomUUID } = require('crypto');

// --- Helpers --- //

// mimics a single API call
function generateCall(offsetTime, model = "GPT-n") {
  const policyCompliance = Math.random();
  const responseHelpfulness = Math.min(Math.max(betaRandom(2, 1.5), 0), 1);
  const responseTime = 0.2 + Math.random() * (3.0 - 0.2);
  const energyConsumption = Math.pow(responseTime, 1.3) * (0.7 + Math.random() * 0.6);
  const responseTimestamp = offsetTime - responseTime;

  return {
    timestamp: responseTimestamp,
    model,
    "policy compliance": policyCompliance,
    "response helpfulness": responseHelpfulness,
    "response time": responseTime,
    "energy consumption": energyConsumption
  };
}

// beta distribution helper
function betaRandom(alpha, beta) {
  const x = Math.pow(Math.random(), 1 / alpha);
  const y = Math.pow(Math.random(), 1 / beta);
  return x / (x + y);
}

// Gaussian helper
function gaussianRandom(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev;
}

// generate calls over an interval
function generateInterval(intervalLength, frequency, mean, stdDev) {
  const currentTime = Date.now() / 1000;
  const calls = [];
  let t = 0;
  const dt = 1 / frequency;

  while (t <= intervalLength) {
    const prob = Math.min(Math.max(gaussianRandom(mean, stdDev), 0), 1);
    if (Math.random() < prob) {
      calls.push(generateCall(currentTime - (intervalLength - t)));
    }
    t += dt;
  }

  return calls;
}

// summarize calls
function summarizeInterval(calls) {
  const stats = { meta: { timestamp: new Date().toISOString() } };
  if (calls.length === 0) return stats;

  const keys = ["policy compliance", "response helpfulness", "response time", "energy consumption"];
  for (const key of keys) {
    const values = calls.map(call => call[key]);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    stats[key] = mean
  }

  return stats;
}

// --- Main async function --- //
async function main() {
  results = summarizeInterval(generateInterval(5, 3, 0.5, 0.125));
}

main().catch(console.error);