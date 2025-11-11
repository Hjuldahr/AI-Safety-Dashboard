// server_side_events/scheduler.js
import { pseudoAI, AIGeneralizer } from '../data_generator/test_data_generator_v3.js';
import { HEARTBEAT, MAX_RECORDS } from '../config/sse.js';
import { schedulerState } from './schedulerState.js';
import AI_Log from "../models/AI_Log.js";
import evaluateAlerts from './alertEvaluator.js';

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
        avgCompliance: summary.policyCompliance.mean * 100,
        avgHelpfulness: summary.responseHelpfulness.mean * 5,
        avgResponseTime: summary.responseTime.mean,
        avgEnergyConsumption: summary.energyConsumption.mean * 1000
    };
}

async function goodModel() {
    const calls = await pseudoAI("GoodModel", 2, 5, 10, 0.9, 1.0, 0.9, 1.0);
    const summary = AIGeneralizer("GoodModel", calls);
    return {
        modelName: summary.model,
        avgCompliance: summary.policyCompliance.mean * 100,
        avgHelpfulness: summary.responseHelpfulness.mean * 5,
        avgResponseTime: summary.responseTime.mean,
        avgEnergyConsumption: summary.energyConsumption.mean * 1000
    };
}

function nullModel() {
    return {
        modelName: "NullModel",
        avgCompliance: 0,
        avgHelpfulness: 0,
        avgResponseTime: 0,
        avgEnergyConsumption: 0
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

    let data;
    switch (schedulerState.activeModel) {
        case "GoodModel":
            data = await goodModel();
            break;
        case "BadModel":
            data = await badModel();
            break;
        default:
            data = nullModel();
            break;
    }

    // Save to DB
    const dataToSave = {
        modelName: data.modelName,
        policyCompliance: data.avgCompliance,
        responseHelpfulness: data.avgHelpfulness,
        responseTime: data.avgResponseTime,
        energyConsumption: data.avgEnergyConsumption
    };

    try {
        await AI_Log.addLog(dataToSave);

        // Evaluate alerts
        try {
            await evaluateAlerts(dataToSave, { cooldownMs: 60 * 1000 }); // default cooldown 60s
        } catch (alertErr) {
            console.error('Error evaluating alerts:', alertErr);
        }

        // Keep only last MAX_RECORDS
        const count = await AI_Log.countDocuments();
        if (count > MAX_RECORDS) {
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

    if (activeModel && activeModel !== schedulerState.activeModel) {
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
