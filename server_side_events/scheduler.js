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
    const calls = await pseudoAI("BadModel", 2, 1, 3, 0.4, 0.7, 0.3, 0.6);
    const summary = AIGeneralizer("BadModel", calls);
    return {
        modelName: summary.model,
        policyCompliance: summary.policyCompliance.mean * 100,
        responseHelpfulness: summary.responseHelpfulness.mean * 5,
        responseTime: summary.responseTime.mean,
        energyConsumption: summary.energyConsumption.mean * 1000,
        queryCount: summary.queryCount
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
        queryCount: summary.queryCount
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

    let data;
    switch (schedulerState.activeModel) {
        case "GoodModel":
            data = goodData;
            break;
        case "BadModel":
            data = badData;
            break;
        default:
            data = nullModel();
            break;
    }

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

        // Broadcast to all clients
        const sseData = `data: ${JSON.stringify(data)}\n\n`;
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
