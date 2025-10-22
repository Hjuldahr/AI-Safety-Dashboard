import { pseudoAI, AIGeneralizer } from '../data_generator/test_data_generator_v3.js';
import { SSE_INTERVAL, SCHEDULER_INTERVAL, HEARTBEAT } from '../config/sse.js';
import AI_Log from "../models/AI_Log.js";

// Max records to keep in the DB
const MAX_RECORDS = 100;
// List of all connected SSE clients (response objects)
let activeClients = [];

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
 * Setup SSE route
 */
function setupSSE(app) {
    app.get('/events', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Add this client to the active list
        activeClients.push(res);

        // Heartbeat to avoid client timeout
        const heartbeat = setInterval(() => {
            res.write(':\n\n');
        }, HEARTBEAT);

        req.on('close', () => {
            clearInterval(heartbeat);
            // Remove this client from the active list
            activeClients = activeClients.filter(client => client !== res);
        });
    });
}

/**
 * Setup global server-side scheduled tasks
 */
function setupScheduler() {
    // This one interval runs for the entire server
    setInterval(async () => {
        try {
            const data = await goodModel();

            const dataToSave = {
                modelName: data.modelName,
                policyCompliance: data.avgCompliance,
                responseHelpfulness: data.avgHelpfulness,
                responseTime: data.avgResponseTime,
                energyConsumption: data.avgEnergyConsumption
            };

            //Save to database
            await AI_Log.addLog(dataToSave);

            // Keep only the last 100 records
            const count = await AI_Log.countDocuments();
            if (count > MAX_RECORDS) {
                // Find the oldest document (sort by timestamp ascending) and delete it
                await AI_Log.findOneAndDelete({}).sort({ responseTimestamp: 1 });
            }

            // Format data and broadcast to ALL active clients
            const sseData = `data: ${JSON.stringify(data)}\n\n`;

            // Loop over all connected clients and send them the new data
            activeClients.forEach(client => client.write(sseData));

        } catch (err) {
            console.error('Global scheduler tick error:', err);

            // Optionally, broadcast the error to clients
            const errorData = `data: ${JSON.stringify({ error: 'Failed to fetch or save AI logs' })}\n\n`;
            activeClients.forEach(client => client.write(errorData));
        }
    }, SSE_INTERVAL); // Use the data-sending interval
}

export default { setupScheduler, setupSSE }