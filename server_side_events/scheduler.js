// server_side_events/scheduler.js
import { AIGeneralizer } from '../data_evaluation/AIGeneralizer.js';
import { HEARTBEAT, SCHEDULER_INTERVAL, SUMMARY_INTERVAL, AI_LOG_CUTOFF, ALERTS_COOLDOWN, AI_MODELS } from '../constants/sse.js';
import { schedulerState } from './schedulerState.js';
import AI_Log from "../models/AI_Log.js";
import AI_Summary from "../models/AI_Summary.js";
import evaluateAlerts from "./alertEvaluator.js";

import { AIAnalyzer } from "../new_data_analysis_pipeline/analyzer/AIAnalyzer.js";
import { SUPPORTED_MODELS } from "../new_data_analysis_pipeline/simulation/modelRegistry.js";

// ---------- SSE Clients ----------
let activeClients = [];
let nextClientId = 1;
let schedulerInterval = null;

const SCHEDULER_INTERVAL = 1000; // 1 second
const ALERTS_COOLDOWN = SCHEDULER_INTERVAL * 60; // Max speed which alerts can be triggered

// previous generalization per model
const previousGens = {};

// ---------- Shutdown Guard ----------
let shuttingDown = false;
let summaryInterval = null;

// ---------- Model Simulation ----------
function generateModelData(modelName) {
  try {
    const summary = AIAnalyzer(
      modelName,
      SCHEDULER_INTERVAL / 1000,
      previousGens[modelName]
    );

    if (!summary || !summary.policyCompliance) {
      throw new Error(`Analyzer returned invalid data for ${modelName}`);
    }

    //console.log(`[Analyzer] ${modelName} summary`, summary);

    previousGens[modelName] = summary;

    return {
      modelName: modelName,
      policyCompliance: summary.policyCompliance.mean * 100,
      responseHelpfulness: summary.responseHelpfulness.mean * 5,
      responseTime: summary.responseTime.mean,
      energyConsumption: summary.energyConsumption.mean * 1000,
      tokensUsed: summary.tokensUsed.mean,
      gigaFlopsUsed: summary.gigaFlopsUsed.mean,
      webLookups: summary.webLookups.mean,
      toxicityScore: summary.toxicityScore.mean,
      piiDetected: summary.piiDetected.mean * 100,
      queryCount: summary.queryCount,
      responseTimestamp: summary.responseTimestamp,
      breakdown: summary.breakdown
    };
  } catch (e) {
    console.error(`[Scheduler] Failed to generate data for ${modelName}:`, e);
    return null;
  }
}

// Events now have their own router - schedulerRouter
export const setupSSE = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const client = {
        id: nextClientId++,
        res,
        userId: req.user ? (req.user._id ? String(req.user._id) : req.user._id) : null,
        connectedAt: Date.now()
    };
    activeClients.push(client);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(':\n\n'); } catch (e) { /* ignore */ }
    }, HEARTBEAT);

    req.on('close', () => {
        clearInterval(heartbeat);
        activeClients = activeClients.filter(c => c.res !== res);
    });
};

// ---------- Client Maintenance ----------
function pruneDeadClients() {
    activeClients = activeClients.filter(c => {
        try {
            if (!c.res || c.res.finished || c.res.writableEnded) return false;
            if (c.res.socket && c.res.socket.destroyed) return false;
            return true;
        } catch {
            return false;
        }
    });

    const MAX_CLIENTS = 500;
    if (activeClients.length > MAX_CLIENTS) {
        const excess = activeClients.length - MAX_CLIENTS;
        const toClose = activeClients.splice(0, excess);
        toClose.forEach(entry => {
            try { if (entry.res && !entry.res.writableEnded) entry.res.end(); } catch (e) { }
        });
    }
}

function safeWriteAll(sseData, targetUserId = null) {
    const toRemoveIds = new Set();
    for (const entry of activeClients) {
        if (targetUserId && entry.userId && String(entry.userId) !== String(targetUserId)) continue;
        try {
            if (!entry.res || entry.res.finished || entry.res.writableEnded || (entry.res.socket && entry.res.socket.destroyed)) {
                toRemoveIds.add(entry.id);
                continue;
            }
            const ok = entry.res.write(sseData);
            if (!ok) toRemoveIds.add(entry.id);
        } catch {
            toRemoveIds.add(entry.id);
        }
    }

    if (toRemoveIds.size) {
        const toClose = activeClients.filter(c => toRemoveIds.has(c.id));
        toClose.forEach(entry => { try { if (entry.res && !entry.res.writableEnded) entry.res.end(); } catch { } });
        activeClients = activeClients.filter(c => !toRemoveIds.has(c.id));
    }
}

function broadcastEvent(eventType, data) {
    try {
        if (shuttingDown) return;

        const sseData = `event: ${eventType}\n` + `data: ${JSON.stringify(data)}\n\n`;
        pruneDeadClients();
        const target = data?._targetUser || null;
        safeWriteAll(sseData, target);
    } catch (e) {
        console.error('[SSE] Failed to broadcast event', e);
    }
}

// ---------- Scheduler Tick ----------
async function schedulerTick() {
  if (schedulerState.isPaused || shuttingDown) return;

  //console.log("[Scheduler] Tick at", new Date().toISOString());

  try {
    const data = {};
    const logsToAdd = [];

    for (const model of SUPPORTED_MODELS) {
      try {
        const val = generateModelData(model);
        data[val.modelName] = val;
        logsToAdd.push(val);
      } catch (err) {
        console.error(`[Scheduler] Failed to generate data for ${model}:`, err);
      }
    }

    //console.log("[Scheduler] Saving logs:", logsToAdd.length);

    if (logsToAdd.length > 0) {
      try {
        if (typeof AI_Log.insertMany === 'function') {
          await AI_Log.insertMany(logsToAdd);
        } else if (typeof AI_Log.addLogs === 'function') {
          await AI_Log.addLogs(logsToAdd);
        } else {
          for (const doc of logsToAdd) await AI_Log.create(doc);
        }
      } catch (dbErr) {
        console.error('Error saving AI logs (bulk):', dbErr);
      }
    }

    await evaluateAlerts(data, { cooldownMs: ALERTS_COOLDOWN });

    // Trim DB
    const count = await AI_Log.countDocuments();
    const excess = count - MAX_RECORDS;
    if (excess > 0) {
      const oldest = await AI_Log.find({}).sort({ responseTimestamp: 1 }).limit(excess).select('_id');
      const ids = oldest.map(d => d._id).filter(Boolean);
      if (ids.length) await AI_Log.deleteMany({ _id: { $in: ids } });
    }

    broadcastEvent('update', data);
    try {
        const data = {};

        // Generate data for all of the models in the AI_MODELS list.
        for (const model of AI_MODELS) {
            data[model] = await generateModelData(model);
        }

        // Add all the logs to the DB
        await AI_Log.addLogs(Object.values(data));

        // Evaluate alerts
        try {
            await evaluateAlerts(data, { cooldownMs: ALERTS_COOLDOWN });
        } catch (alertErr) {
            console.error('Error evaluating alerts:', alertErr);
        }

        // Broadcast real-time update to clients
        broadcastEvent('update', data);

    } catch (err) {
        console.error('Scheduler tick error:', err);
        broadcastEvent('update', { error: 'Failed to fetch or save AI logs' });
    }
}

// ---------- Create Summary ----------
async function createSummary() {
    // Takes the last 60 seconds of logs for both models and averages them
    try {
        const summaries = await AI_Log.generateSixtySecondSummary();

        if (summaries.length > 0) {
            // Save to the summary collection
            await AI_Summary.insertMany(summaries);

            // Delete extra
            const cutoff = Date.now() - AI_LOG_CUTOFF;
            await AI_Log.deleteMany({ responseTimestamp: { $lt: cutoff } });
        }
    } catch (err) {
        console.error('Summary Generation Error:', err);
    }
}

// ---------- Scheduler Control ----------
function startScheduler() {
    if (schedulerInterval) clearInterval(schedulerInterval);
    if (summaryInterval) clearInterval(summaryInterval);

    if (!schedulerState.isPaused) {
        schedulerInterval = setInterval(schedulerTick, SCHEDULER_INTERVAL);
        summaryInterval = setInterval(createSummary, SUMMARY_INTERVAL);

        console.log('[Scheduler] Started with interval', SCHEDULER_INTERVAL, 'ms');
        console.log('[Summary] Started with interval', SUMMARY_INTERVAL, 'ms');
    }
}

function stopScheduler() {
    shuttingDown = true;
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }
}

function updateSchedulerSettings({ isPaused, activeModel, interval }) {
    let restart = false;

    if (typeof isPaused === 'boolean' && isPaused !== schedulerState.isPaused) {
        schedulerState.isPaused = isPaused;
        console.log(`[Scheduler] ${isPaused ? 'Paused' : 'Resumed'}`);
        restart = true;
    }

    if (activeModel) {
        schedulerState.activeModel = activeModel;
        console.log('[Scheduler] Active model changed to', activeModel);
    }

    if (interval && typeof interval === 'number' && interval > 0 && interval !== SCHEDULER_INTERVAL) {
        // Note: SCHEDULER_INTERVAL is const - if you want runtime changes, store it in schedulerState instead
        console.log('[Scheduler] Interval change requested but not applied (SCHEDULER_INTERVAL is constant).');
    }

    if (restart) startScheduler();
}

function setupScheduler() {
    startScheduler();
}

export default { setupSSE, setupScheduler, updateSchedulerSettings, stopScheduler };
export { broadcastEvent };