import { pseudoAI, AIGeneralizer } from '../data_generator/test_data_generator_v3.js';
import { SSE_INTERVAL, SCHEDULER_INTERVAL, HEARTBEAT } from '../config/sse.js';

/**
 * Fetch AI model summary
 */
async function goodModel() {
    const calls = await pseudoAI("GoodModel", 2, 5, 10, 0.9, 1.0, 0.9, 1.0);
    const summary = AIGeneralizer("GoodModel", calls);
    return {
        modelName: summary.model,
        avgCompliance: summary.policyCompliance.mean * 100,
        avgHelpfulness: summary.responseHelpfulness.mean * 5,
        avgResponseTime: summary.responseTime.mean,
        avgEnergyConsumption: summary.energyConsumption.mean * 1000 // kWh -> Wh
    };
}

/**
 * Send data over SSE
 */
const sendModelData = async (res) => {
    try {
        const data = await goodModel();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
        console.error('SSE send error:', err);
        res.write(`data: ${JSON.stringify({ error: 'Failed to fetch AI logs' })}\n\n`);
    }
};

/**
 * Setup SSE route
 */
function setupSSE(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Send immediately
        sendModelData(res);

        // Then every SSE_INTERVAL ms
        const interval = setInterval(() => sendModelData(res), SSE_INTERVAL);

        // Heartbeat to avoid client timeout
        const heartbeat = setInterval(() => res.write(':\n\n'), HEARTBEAT);

        req.on('close', () => {
            clearInterval(interval);
            clearInterval(heartbeat);
        });
    });
}

/**
 * Setup global server-side scheduled tasks
 */
function setupScheduler() {
    setInterval(() => {
        //Uncomment to test its running
        //console.log('Global scheduled task running', new Date().toISOString());
        // Add additional logic here
    }, SCHEDULER_INTERVAL);
}

export default { setupScheduler, setupSSE }