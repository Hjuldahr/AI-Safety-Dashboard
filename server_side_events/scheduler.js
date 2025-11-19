// server_side_events/scheduler.js
import { pseudoAI, AIGeneralizer } from '../data_generator/test_data_generator_v3.js';
import { HEARTBEAT, MAX_RECORDS } from '../config/sse.js';
import { schedulerState } from './schedulerState.js';
import AI_Log from "../models/AI_Log.js";
import evaluateAlerts from './alertEvaluator.js';

// List of connected SSE clients
// List of connected SSE clients (array of { id, res, userId, connectedAt })
let activeClients = [];
let nextClientId = 1;

// Reference to the active scheduler interval
let schedulerInterval = null;

// ---------- Model Fetching ----------
async function badModel() {
    const calls = await pseudoAI("BadModel", 2, 1, 3, 0.4, 0.7, 0.3, 0.6);
    const summary = AIGeneralizer("BadModel", calls);
    return {
        modelName: summary.model,
        policyCompliance: summary.policyCompliance.mean * 100,
        responseHelpfulness: summary.responseHelpfulness.mean * 5,
        responseTime: summary.responseTime.mean,
        energyConsumption: summary.energyConsumption.mean * 1000,
        queryCount: summary.queryCount,
        responseTimestamp:  summary.responseTimestamp
    };
}

async function goodModel() {
    const calls = await pseudoAI("GoodModel", 2, 5, 10, 0.9, 1.0, 0.9, 1.0);
    const summary = AIGeneralizer("GoodModel", calls);
    return {
        modelName: summary.model,
        policyCompliance: summary.policyCompliance.mean * 100,
        responseHelpfulness: summary.responseHelpfulness.mean * 5,
        responseTime: summary.responseTime.mean,
        energyConsumption: summary.energyConsumption.mean * 1000,
        queryCount: summary.queryCount,
        responseTimestamp:  summary.responseTimestamp
    };
}

function nullModel() {
    return {
        modelName: "NullModel",
        avgCompliance: 0,
        avgHelpfulness: 0,
        avgResponseTime: 0,
        avgEnergyConsumption: 0,
        queryCount: 0
    };
}

// ---------- SSE Setup ----------
function setupSSE(app) {
    app.get('/events', (req, res) => {
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

        const heartbeat = setInterval(() => {
            res.write(':\n\n');
        }, HEARTBEAT);

        req.on('close', () => {
            clearInterval(heartbeat);
            activeClients = activeClients.filter(c => c.res !== res);
        });
    });
}

// Remove dead/closed clients from activeClients
function pruneDeadClients() {
    activeClients = activeClients.filter((c) => {
        const client = c.res;
        try {
            if (!client || client.finished) return false;
            if (client.writableEnded) return false;
            if (client.socket && client.socket.destroyed) return false;
            return true;
        } catch (e) {
            return false;
        }
    });

    // If too many clients are connected, trim oldest to avoid resource exhaustion
    const MAX_CLIENTS = 500;
    if (activeClients.length > MAX_CLIENTS) {
        const excess = activeClients.length - MAX_CLIENTS;
        const toDrop = activeClients.splice(0, excess);
        toDrop.forEach(entry => {
            try {
                if (entry && entry.res && !entry.res.writableEnded) {
                    entry.res.end();
                }
            } catch (e) { /* ignore */ }
        });
    }
}

// Safely write data to all clients; remove any client that errors or signals backpressure
function safeWriteAll(sseData, targetUserId = null) {
    const toRemoveIds = new Set();
    for (const entry of activeClients) {
        const client = entry.res;
        // if a targetUserId is specified, only send to matching clients
        if (targetUserId && entry.userId && String(entry.userId) !== String(targetUserId)) continue;
        try {
            if (!client || client.finished || client.writableEnded || (client.socket && client.socket.destroyed)) {
                toRemoveIds.add(entry.id);
                continue;
            }
            const ok = client.write(sseData);
            if (!ok) {
                // slow client: remove
                toRemoveIds.add(entry.id);
            }
        } catch (e) {
            toRemoveIds.add(entry.id);
        }
    }
    if (toRemoveIds.size) {
        const toClose = activeClients.filter(c => toRemoveIds.has(c.id));
        toClose.forEach(entry => {
            try { if (entry.res && !entry.res.writableEnded) entry.res.end(); } catch (e) { }
        });
        activeClients = activeClients.filter(c => !toRemoveIds.has(c.id));
    }
}

// Broadcast a named SSE event with JSON payload to all connected clients
function broadcastEvent(eventType, data) {
    try {
        const sseData = `event: ${eventType}\n` + `data: ${JSON.stringify(data)}\n\n`;
        pruneDeadClients();
        // Allow optional targeting by passing userId on data._targetUser
        const target = (data && data._targetUser) ? data._targetUser : null;
        safeWriteAll(sseData, target);
    } catch (e) {
        console.error('[SSE] Failed to broadcast event', e);
    }
}

// ---------- Scheduler Tick ----------
async function schedulerTick() {
    if (schedulerState.isPaused) return;

    try {
        const goodData = await goodModel();
        const badData = await badModel();

        // Structured payload for alerts + SSE
        const dataToSave = {
            GoodModel: goodData,
            BadModel: badData
        };

        // Persist logs
        await AI_Log.addLog(goodData);
        await AI_Log.addLog(badData);

        // Evaluate alerts with the combined payload (cooldown 60s)
        try {
            await evaluateAlerts(dataToSave, { cooldownMs: 60 * 1000 });
        } catch (alertErr) {
            console.error('Error evaluating alerts:', alertErr);
        }

        // Keep only last MAX_RECORDS
        let count = await AI_Log.countDocuments();
        while (count > MAX_RECORDS) {
            // remove the oldest record(s)
            await AI_Log.findOneAndDelete({}).sort({ responseTimestamp: 1 });
            count--;
        }

        // Broadcast to all clients using safe writer
        const sseData = `data: ${JSON.stringify(dataToSave)}\n\n`;
        pruneDeadClients();
        safeWriteAll(sseData);
    } catch (err) {
        console.error('Scheduler tick error:', err);
        const errorData = `data: ${JSON.stringify({ error: 'Failed to fetch or save AI logs' })}\n\n`;
        pruneDeadClients();
        safeWriteAll(errorData);
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
export { broadcastEvent };
