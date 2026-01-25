// server_side_events/scheduler.js
import { AIAnalyzer } from '../data_analysis_pipeline/AIAnalyzer.js';
import { HEARTBEAT, MAX_RECORDS } from '../config/sse.js';
import { schedulerState } from './schedulerState.js';
import AI_Log from "../models/AI_Log.js";
import evaluateAlerts from "./alertEvaluator.js";

// ---------- SSE Clients ----------
let activeClients = [];
let nextClientId = 1;
let schedulerInterval = null;

const SCHEDULER_INTERVAL = 1000; // 1 second
const ALERTS_COOLDOWN = SCHEDULER_INTERVAL * 60; //Max speed which alerts can be triggered

// This determines which models the evaluator should run on / should be visible on the frontend.
// This list checks for js files with the same name in the ai_models folder.
const AI_MODELS = ["GoodModel", "BadModel"];
let previousGen = null;

// ---------- Shutdown Guard ----------
let shuttingDown = false;

// ---------- Model Simulation ----------
//One method for all models
async function generateModelData(modelName) {

    // Call the Data Evaluator, and ask it to evaluate data for this model, over the past second
    const summary = AIAnalyzer(modelName, SCHEDULER_INTERVAL / 1000, previousGen);
    previousGen = summary;

    // Format for DB/SSE
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
        piiDetected: summary.piiDetected.mean * 100, // Scale to %
        queryCount: summary.queryCount,
        responseTimestamp: summary.responseTimestamp,
        breakdown: summary.breakdown
    };
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
        res.write(':\n\n');
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

        // Keep only last MAX_RECORDS
        let count = await AI_Log.countDocuments();
        while (count > MAX_RECORDS) {
            await AI_Log.findOneAndDelete({}).sort({ responseTimestamp: 1 }); //ToDo: Refactor this to avoid sorting entire DB
            count--;
        }

        // Broadcast real-time update to clients
        broadcastEvent('update', data);

    } catch (err) {
        console.error('Scheduler tick error:', err);
        broadcastEvent('update', { error: 'Failed to fetch or save AI logs' });
    }
}

// ---------- Scheduler Control ----------
function startScheduler() {
    if (schedulerInterval) clearInterval(schedulerInterval);
    if (!schedulerState.isPaused) {
        schedulerInterval = setInterval(schedulerTick, SCHEDULER_INTERVAL);
        console.log('[Scheduler] Started with interval', SCHEDULER_INTERVAL, 'ms');
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

    if (restart) startScheduler();
}

function setupScheduler() {
    startScheduler();
}

export default { setupSSE, setupScheduler, updateSchedulerSettings, stopScheduler };
export { broadcastEvent };
