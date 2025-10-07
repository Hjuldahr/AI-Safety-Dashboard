function getTimestamp() {
    return new Date().toLocaleString('en-US', { 
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit" 
    });
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function pseudoAI(intervalDuration, min_callrate = 1, max_callrate = 10, min_pc = 0.6, max_pc = 1.0, min_rh = 0.6, max_rh = 1.0) {
    // Tweak min and max params to get Good / Bad / Neutral / Max-Chaos Archetypes
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60; // fractional hour

    // Sine-based weighting: peak at 15:00 (~3pm), minimum at 3:00am
    // Map hour 0-24 to angle 0-2pi, offset so peak aligns around 15:00
    const angle = ((hour - 3) / 24) * 2 * Math.PI;
    let timeWeight = Math.sin(angle); // -1 to 1
    timeWeight = Math.max(0, timeWeight); // clamp negative values to 0 (no traffic)
    // Scale to a realistic max factor (~1.2)
    timeWeight *= 1.2;

    // Compute queries with min/max callrate and interval duration
    const queries = Math.floor(getRandomInt(min_callrate, max_callrate) * intervalDuration * timeWeight);

    let calls = new Array(queries);
    const start_time = now.getTime();
    const end_time = start_time + intervalDuration * 1000;

    for (let i = 0; i < queries; i++) {
        const responseTime = getRandomInt(10, 25); // ms
        const energyConsumption = getRandomFloat(0.03, 0.06) + (responseTime - 10) * 0.001 + getRandomFloat(0, 0.002);

        calls[i] = {
            time: getRandomInt(start_time, end_time),
            policy_compliance: getRandomFloat(min_pc, max_pc),
            response_helpfulness: getRandomFloat(min_rh, max_rh),
            response_time: responseTime,
            energy_consumption: parseFloat(energyConsumption.toFixed(3))
        };
    }

    calls.sort((a, b) => a.time - b.time);

    await sleep(intervalDuration * 1000);

    return calls;
}