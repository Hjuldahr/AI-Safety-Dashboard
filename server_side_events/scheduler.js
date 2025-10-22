import express from 'express';
import {pseudoAI, AIGeneralizer} from './data_generator/test_data_generator_v3'
import { SSE_INTERVAL } from './config.js';

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

const sendModelData = async (res) => {
    try {
        const data = await goodModel();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
        console.error(err);
        res.write(`data: ${JSON.stringify({ error: 'Failed to fetch AI logs' })}\n\n`);
    }
};

function setupSSE(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        sendModelData(res); 
        const interval = setInterval(() => sendModelData(res), SSE_INTERVAL);

        req.on('close', () => {
            clearInterval(interval);
        });
    });
}

// Optional global scheduler
function setupScheduler() {
    setInterval(() => {
        // do background server-side tasks every 5s
    }, 5000);
}

export { setupSSE, setupScheduler };