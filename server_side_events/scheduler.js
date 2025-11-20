// server_side_events/scheduler.js
import { pseudoAI, AIGeneralizer } from '../data_generator/test_data_generator_v3.js';
import { HEARTBEAT, MAX_RECORDS } from '../config/sse.js';
import { schedulerState } from './schedulerState.js';
import AI_Log from "../models/AI_Log.js";

// List of connected SSE clients
let activeClients = [];

// Reference to the active scheduler interval
let schedulerInterval = null;

// ---------- Model Fetching ----------
async function badModel() {
  const calls = await pseudoAI(
    "BadModel",  // model name
    2,           // intervalDuration in seconds
    1, 3,        // min_callrate, max_callrate
    0.4, 0.7,    // min_pc, max_pc
    0.3, 0.6,    // min_rh, max_rh
    0.1, 0.5,    // minToxic, maxToxic
    0.0, 0.05,   // minPII, maxPII
    6,           // avgGFlopsPerToken
    2            // msPerToken
  );
  const summary = AIGeneralizer("BadModel", calls);

  const tokensMean = summary.tokensUsed.mean || 0;
  const gflopsMean = summary.gigaFlopsUsed.mean || 0;
  const opsPerToken = tokensMean > 0 ? (gflopsMean / tokensMean) : 0;

  return {
    modelName: summary.model,
    policyCompliance: summary.policyCompliance.mean * 100,
    responseHelpfulness: summary.responseHelpfulness.mean * 5,
    responseTime: summary.responseTime.mean,
    energyConsumption: summary.energyConsumption.mean * 1000,
    tokensUsed: summary.tokensUsed,           // full stats
    operationsPerToken: opsPerToken,
    gigaFlopsUsed: summary.gigaFlopsUsed,    // full stats
    webLookups: summary.webLookups,          // full stats
    toxicityScore: summary.toxicityScore,
    piiDetected: summary.piiDetected,
    queryCount: summary.queryCount,
    responseTimestamp: summary.responseTimestamp
  };
}

async function goodModel() {
  const calls = await pseudoAI(
    "GoodModel",  // model name
    2,            // intervalDuration in seconds
    5, 10,        // min_callrate, max_callrate (more frequent queries)
    0.9, 1.0,     // min_pc, max_pc (high policy compliance)
    0.9, 1.0,     // min_rh, max_rh (high helpfulness)
    0.0, 0.05,    // minToxic, maxToxic (very low toxicity)
    0.0, 0.0,     // minPII, maxPII (no PII exposure)
    6,            // avgGFlopsPerToken (normal compute usage)
    2             // msPerToken (normal response speed)
  );
  const summary = AIGeneralizer("GoodModel", calls);

  const tokensMean = summary.tokensUsed.mean || 0;
  const gflopsMean = summary.gigaFlopsUsed.mean || 0;
  const opsPerToken = tokensMean > 0 ? (gflopsMean / tokensMean) : 0;

  return {
    modelName: summary.model,
    policyCompliance: summary.policyCompliance.mean * 100,
    responseHelpfulness: summary.responseHelpfulness.mean * 5,
    responseTime: summary.responseTime.mean,
    energyConsumption: summary.energyConsumption.mean * 1000,
    tokensUsed: summary.tokensUsed,
    operationsPerToken: opsPerToken,
    gigaFlopsUsed: summary.gigaFlopsUsed,
    webLookups: summary.webLookups,
    toxicityScore: summary.toxicityScore,
    piiDetected: summary.piiDetected,
    queryCount: summary.queryCount,
    responseTimestamp: summary.responseTimestamp
  };
}

// ---------- SSE Setup ----------
function setupSSE(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        activeClients.push(res);

        const heartbeat = setInterval(() => {
            res.write(':\n\n');
        }, HEARTBEAT);

        req.on('close', () => {
            clearInterval(heartbeat);
            activeClients = activeClients.filter(client => client !== res);
        });
    });
}

// ---------- Scheduler Tick ----------
async function schedulerTick() {
    if (schedulerState.isPaused) return;

    let goodData = await goodModel();
    let badData = await badModel();

    try {
        await AI_Log.addLog(goodData);
        await AI_Log.addLog(badData);

        // Keep only last MAX_RECORDS
        const count = await AI_Log.countDocuments();
        if (count > MAX_RECORDS) {
            // ToDo: refactor this lol
            await AI_Log.findOneAndDelete({}).sort({ responseTimestamp: 1 });
            await AI_Log.findOneAndDelete({}).sort({ responseTimestamp: 1 });
        }

        const dataToSend = {
            GoodModel: goodData,
            BadModel: badData
        };

        // Broadcast to all clients
        const sseData = `data: ${JSON.stringify(dataToSend)}\n\n`;
        activeClients.forEach(client => client.write(sseData));
    } catch (err) {
        console.error('Scheduler tick error:', err);
        const errorData = `data: ${JSON.stringify({ error: 'Failed to fetch or save AI logs' })}\n\n`;
        activeClients.forEach(client => client.write(errorData));
    }
}

// ---------- Scheduler Control ----------
function startScheduler() {
    if (schedulerInterval) clearInterval(schedulerInterval);
    if (!schedulerState.isPaused) {
        schedulerInterval = setInterval(schedulerTick, schedulerState.interval);
        console.log('[Scheduler] Started with interval', schedulerState.interval, 'ms');
    }
}

function updateSchedulerSettings({ isPaused, activeModel, interval }) {
    let restart = false;

    if (typeof isPaused === 'boolean' && isPaused !== schedulerState.isPaused) {
        schedulerState.isPaused = isPaused;
        console.log(`[Scheduler] ${isPaused ? 'isPaused' : 'Resumed'}`);
        restart = true;
    }

    if (activeModel) {
        schedulerState.activeModel = activeModel;
        console.log('[Scheduler] Active model changed to', activeModel);
    }

    if (interval && interval !== schedulerState.interval) {
        schedulerState.interval = interval;
        console.log('[Scheduler] Interval updated to', interval, 'ms');
        restart = true;
    }

    if (restart) startScheduler();
}

// ---------- Initialize Scheduler ----------
function setupScheduler() {
    startScheduler();
}

export default { setupSSE, setupScheduler, updateSchedulerSettings };
