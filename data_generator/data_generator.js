// utils
function clamp(v, min = 0, max = 1) {
  return Math.min(Math.max(v, min), max);
}

function randomGaussian(mean = 0, stddev = 1) {
  // Box-Muller transform
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stddev + mean;
}

// Drift
function getDrift(previousDrift, avgDrift = 0.01, driftDev = 0.001, spikeDriftDev = 0.005, spikeRate = 0.01, retrainChance = 0.001) {
  if (Math.random() < retrainChance) return avgDrift;
  let newDrift;
  if (Math.random() <= spikeRate) {
    newDrift = previousDrift + randomGaussian(avgDrift, spikeDriftDev);
  } else {
    newDrift = previousDrift + randomGaussian(avgDrift, driftDev);
  }
  return clamp(newDrift);
}

// Bias
function getBias(drift, low = 0.05, high = 0.2, spike = 0.4, spikeRate = 0.01) {
  const baseBias = Math.random() * (high - low) + low;
  const correlatedBias = baseBias + 0.5 * drift;
  if (Math.random() <= spikeRate) {
    return clamp(Math.random() * (spike - high) + high);
  }
  return clamp(correlatedBias);
}

// Accuracy
function getAccuracy(drift, bias, base = 0.85, variation = 0.02) {
  const reduction = 0.3 * drift + 0.2 * bias;
  return clamp(base - reduction + Math.random() * 2 * variation - variation);
}

// Precision
function getPrecision(accuracy, variation = 0.03) {
  return clamp(accuracy + Math.random() * 2 * variation - variation);
}

// Error rate
function getErrorRate(accuracy, noise = 0.01) {
  return clamp(1 - accuracy + Math.random() * 2 * noise - noise);
}

// Risk
function getRisk(errorRate, bias, wError = 0.6, wBias = 0.4, interaction = 0.5) {
  const risk = wError * errorRate + wBias * bias + interaction * (errorRate * bias);
  return clamp(risk);
}

// Usage
function getUsage(hour = null, avgCalls = 50, dailyAmplitude = 30) {
  if (hour === null) hour = Math.floor(Math.random() * 24);
  const pattern = avgCalls + dailyAmplitude * Math.sin((hour / 24) * 2 * Math.PI);
  return Math.max(0, Math.round(pattern + randomGaussian(0, 5)));
}

// Response times
function getResponseTimes(numCalls, base = 150, jitter = 20, spikeChance = 0.05, spikeFactor = [1.5, 3.0]) {
  const times = [];
  for (let i = 0; i < numCalls; i++) {
    let rt = randomGaussian(base, jitter);
    if (Math.random() < spikeChance) {
      rt *= Math.random() * (spikeFactor[1] - spikeFactor[0]) + spikeFactor[0];
    }
    times.push(Math.max(0, rt));
  }
  return times;
}

// Power usage
function getPowerUsage(numCalls, responseTimes, basePower = 20, usageFactor = 0.05, responseFactor = 0.1, noise = 2) {
  const totalResponsePower = responseTimes.reduce((sum, rt) => sum + responseFactor * rt, 0);
  let power = basePower + usageFactor * numCalls + totalResponsePower;
  power += Math.random() * 2 * noise - noise; // small jitter
  return Math.max(0, power);
}

// Generate metrics
function generateMetrics(previousMetrics = null, hour = null) {
  const metrics = {};
  const prevDrift = previousMetrics ? previousMetrics.drift : 0;

  metrics.drift = getDrift(prevDrift);
  metrics.bias = getBias(metrics.drift);

  metrics.accuracy = getAccuracy(metrics.drift, metrics.bias);
  metrics.precision = getPrecision(metrics.accuracy);
  metrics.errorRate = getErrorRate(metrics.accuracy);

  metrics.riskPercentage = getRisk(metrics.errorRate, metrics.bias);

  metrics.apiUsage = getUsage(hour);
  metrics.responseTimes = getResponseTimes(metrics.apiUsage);
  metrics.powerUsage = getPowerUsage(metrics.apiUsage, metrics.responseTimes);

  return metrics;
}

// Example usage
let previous = null;
for (let hour = 0; hour < 24; hour++) {
  const metrics = generateMetrics(previous, hour);
  previous = metrics;
  console.log(`Hour ${hour}:`, metrics);
}