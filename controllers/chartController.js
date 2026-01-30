import AI_Log from "../models/AI_Log.js";
import ChartConfig from '../models/Chart_Config.js';
import { TIMEFRAME_CONFIG, KNOWN_MODELS } from "../config/constants.js";


// Updated to send back recent data for all models in the database
const getRecentData = async (req, res) => {
    try {
        // get the chart configs
        const configs = await ChartConfig.find().sort({ order: 1 });

        // Get the unique timeranges used in the charts
        const activeTimeframes = [...new Set(configs.map(c => c.chartTimeRange || '10s'))];

        const logsByTimeframe = {};

        // Execute queries for every needed Timeframe + Model combination
        const timeframePromises = activeTimeframes.map(async (timeframe) => {
            const config = TIMEFRAME_CONFIG[timeframe];
            if (!config) return; // Skip invalid timeframes

            const startTime = Date.now() - config.timerange;

            // For each model in this timeframe...
            const modelPromises = KNOWN_MODELS.map(async (modelName) => {
                let data = [];
                
                // Stops mongo from returning older logs than we need
                const limit = Math.floor(config.timerange / config.bucket);

                if (config.model === 'AI_Log') {
                    // --- HIGH FIDELITY (AI_Logs) ---
                    const ai_logs = await AI_Log.find({
                        modelName: modelName,
                        responseTimestamp: { $gte: startTime }
                    })
                        .sort({ responseTimestamp: -1 }) // Newest first
                        .limit(limit)             // Cap results
                        .lean();

                    data = ai_logs.reverse(); // Flip to oldest-first for charting

                } else {
                    // --- LOW FIDELITY (Summaries) ---
                    data = await getDownsampledSummary(modelName, startTime, config.bucket);
                }

                return { modelName, data };
            });

            const modelResults = await Promise.all(modelPromises);

            logsByTimeframe[timeframe] = {};
            modelResults.forEach(res => {
                logsByTimeframe[timeframe][res.modelName] = res.data;
            });
        });

        await Promise.all(timeframePromises);

        res.status(200).json({
            // Structure: logs['1h'] = { GoodModel: [...], BadModel: [...] }
            logs: logsByTimeframe,
            configs: configs
        });

    } catch (error) {
        console.error("Error fetching recent data:", error);
        res.status(500).json({ error: "Failed to fetch recent data." });
    }
};

/**
 * @param {string} modelName - e.g. "GoodModel"
 * @param {number} startTime - Date.now() - 30 days
 * @param {number} bucketSizeMs - Size of one point in ms (e.g. 4 hours = 14400000)
 */
const getDownsampledSummary = async (modelName, startTime, bucketSizeMs) => {

    return await AI_Summary.aggregate([
        // FILTER: Cut down the dataset immediately
        {
            $match: {
                modelName: modelName,
                responseTimestamp: { $gte: startTime }
            }
        },

        // BUCKET: The Math
        // We subtract the remainder of (Time / Bucket) from Time.
        // This rounds every timestamp down to the nearest block.
        {
            $addFields: {
                // "bucketTime" will be our new ID for grouping
                bucketTime: {
                    $subtract: [
                        "$responseTimestamp",
                        { $mod: ["$responseTimestamp", bucketSizeMs] }
                    ]
                }
            }
        },

        // AGGREGATE: Re-calculate metrics for this new bigger chunk
        {
            $group: {
                _id: "$bucketTime", // Group by our 4-hour block

                // AVERAGES (Quality metrics)
                // Note: Averaging averages is technically slightly lossy mathematically, 
                // but for a dashboard trend line, it is perfectly acceptable.
                policyCompliance: { $avg: "$policyCompliance" },
                responseHelpfulness: { $avg: "$responseHelpfulness" },
                responseTime: { $avg: "$responseTime" },
                toxicityScore: { $avg: "$toxicityScore" },
                piiDetected: { $avg: "$piiDetected" },

                // SUMS (Volume metrics)
                // We sum the sums. (e.g. Total tokens in hour 1 + Total tokens in hour 2...)
                energyConsumption: { $sum: "$energyConsumption" },
                tokensUsed: { $sum: "$tokensUsed" },
                gigaFlopsUsed: { $sum: "$gigaFlopsUsed" },
                webLookups: { $sum: "$webLookups" },
                queryCount: { $sum: "$queryCount" }
            }
        },

        // FORMATTING: Clean up for the frontend
        {
            $project: {
                _id: 0,
                responseTimestamp: "$_id", // Rename bucketTime back to responseTimestamp
                modelName: { $literal: modelName }, // Put the name back

                // Pass through all fields
                policyCompliance: 1,
                responseHelpfulness: 1,
                responseTime: 1,
                energyConsumption: 1,
                tokensUsed: 1,
                gigaFlopsUsed: 1,
                webLookups: 1,
                toxicityScore: 1,
                piiDetected: 1,
                queryCount: 1
            }
        },

        // SORT: Ensure the line chart goes left-to-right
        { $sort: { responseTimestamp: 1 } }
    ]);
};

export default { getRecentData }