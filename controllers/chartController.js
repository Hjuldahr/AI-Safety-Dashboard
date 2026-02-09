import AI_Log from "../models/AI_Log.js";
import AI_Summary from "../models/AI_Summary.js";
import ChartConfig from '../models/Chart_Config.js';
import User_Log from '../models/User_Log.js';
import { TIMEFRAME_CONFIG, KNOWN_MODELS, DATA_DICTIONARY } from "../config/constants.js";


const saveGraph = async (req, res) => {
    try {
        const { title, chartType, chartSize, yAxis, xAxis, category, splitBy, includedValues, timeframe } = req.body;

        // Basic validation
        if (!title || !chartType) {
            return res.status(400).json({
                success: false,
                message: 'Title and chartType are required.'
            });
        }

        // set values to null if they arent set (for charts that dont have these values)
        const newChartConfig = new ChartConfig({
            title,
            chartType,
            chartSize: chartSize || 'regular',
            chartTimeRange: timeframe,
            yAxis: yAxis || null,
            xAxis: xAxis || null,
            category: category || null,
            splitBy: splitBy || null,
            includedValues: includedValues
        });

        const savedChart = await newChartConfig.save();

        User_Log.addLog(req.user._id, 'Chart_Created', `User Created a new chart: ${title}`).catch(err => console.error('Failed to write log:', err));

        // Send a success response back to the client
        res.status(201).json({
            success: true,
            message: 'Chart saved successfully!',
            chart: savedChart
        });

    } catch (error) {
        console.error('Error saving chart config:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save chart config.',
        });
    }
};

const deleteGraph = async (req, res) => {
    try {
        const { id } = req.body;

        const chartToDelete = await ChartConfig.findById(id);

        if (!chartToDelete) {
            return res.status(404).json({ message: 'Chart not found.' });
        }

        await ChartConfig.findByIdAndDelete(id);

        User_Log.addLog(req.user._id, 'Chart_Deleted', `User Deleted a chart: ${chartToDelete.title}`).catch(err => console.error('Failed to write log:', err));

        res.status(200).json({ message: "Chart deleted successfully." })
    } catch (error) {
        console.error("Error deleting chart: " + error);
        res.status(500).send("Server error while deleting chart.")
    }
};

// Update only supports title and size for now
const updateGraph = async (req, res) => {
    try {
        const { id, newTitle, newSize, includedValues, timeframe } = req.body;

        const itemToUpdate = await ChartConfig.findById(id);
        if (!itemToUpdate) {
            return res.status(404).json({ message: 'Chart config not found.' });
        }

        itemToUpdate.title = newTitle;
        itemToUpdate.chartSize = newSize;

        if (includedValues !== undefined) {
            itemToUpdate.includedValues = includedValues;
        }

        if (timeframe !== undefined) {
            itemToUpdate.timeframe = timeframe;
        }

        await itemToUpdate.save();

        User_Log.addLog(req.user._id, 'Chart_Modified', `User Modified a chart: ${itemToUpdate.title}`).catch(err => console.error('Failed to write log:', err));

        res.status(200).json({ message: 'Chart config updated successfully!' });
    } catch (error) {
        console.error("Error updating chart: " + error);
        res.status(500).send("Server error while updating chart.")
    }
};

const patchGraph = async (req, res) => {
    try {
        const { id, ...updates } = req.body;

        const itemToUpdate = await ChartConfig.findById(id);
        if (!itemToUpdate) {
            return res.status(404).json({ message: 'Chart config not found.' });
        }

        // Does this work?
        await ChartConfig.findByIdAndUpdate(id, { ...updates });

        User_Log.addLog(req.user._id, 'Chart_Modified', `User Modified a chart: ${itemToUpdate.title}`).catch(err => console.error('Failed to write log:', err));

        res.status(200).json({ message: 'Chart config updated successfully!' });
    } catch (error) {
        console.error("Error updating chart: " + error);
        res.status(500).send("Server error while updating chart.")
    }
};

const getChartConfig = async (req, res) => {
    try {
        const id = req.params.id;

        const config = await ChartConfig.findById(id);

        if (!config) {
            return res.status(404).json({ success: false, message: 'Config not found.' });
        }

        res.json({ success: true, config: config })

    } catch (error) {
        console.error("Error fetching config: " + error);
        res.status(500).send("Server error while fetching config.");
    }
};

const reorderCharts = async (req, res) => {
    const { newOrder } = req.body;

    try {
        // Normalize all orders based on the order in the list - sends one bulk update
        const operations = newOrder.map((item, index) => {
            return {
                updateOne: {
                    filter: { _id: item.id },
                    update: { $set: { order: index } }
                }
            };
        });

        // Execute all operations in one go
        await ChartConfig.bulkWrite(operations);
    } catch (err) {
        console.error('Error updating chart order:', err);
        res.status(500).json({ error: 'Failed to update order.' });
    }
};

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
                // const limit = Math.floor(config.timerange / config.bucket);

                if (config.model === 'AI_Log') {
                    // Fetch enough RAW logs to fill the time range.
                    // We assume logs are ~1 per second.
                    const rawLimit = Math.ceil((config.timerange / 1000) * KNOWN_MODELS.length);

                    // --- HIGH FIDELITY (AI_Logs) ---
                    const ai_logs = await AI_Log.find({
                        modelName: modelName,
                        responseTimestamp: { $gte: startTime }
                    })
                        .sort({ responseTimestamp: -1 }) // Newest first
                        .limit(rawLimit)             // Cap results
                        .lean();

                    const sortedLogs = ai_logs.reverse(); // Flip to oldest-first for charting

                    data = downsampleLogs(sortedLogs, config.bucket);
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
 * JS Helper to downsample Raw Logs while preserving Breakdown structure.
 * This mimics the Frontend SSE merging logic to ensure charts look identical.
 */
function downsampleLogs(rawLogs, bucketSize) {
    if (!rawLogs || rawLogs.length === 0) return [];

    const buckets = [];
    let currentBucket = null;
    let currentBucketTime = null;

    rawLogs.forEach(log => {
        // Calculate which bucket this log belongs to
        const logBucketTime = Math.floor(log.responseTimestamp / bucketSize) * bucketSize;

        if (currentBucketTime !== logBucketTime) {
            // Push finished bucket
            if (currentBucket) buckets.push(currentBucket);

            // Start new bucket (Clone the first log as the base)
            currentBucket = structuredClone(log);
            currentBucket.responseTimestamp = logBucketTime; // Snap to grid
            currentBucketTime = logBucketTime;
        } else {
            // Merge into current bucket
            mergeLogData(currentBucket, log);
        }
    });

    // Push the final bucket
    if (currentBucket) buckets.push(currentBucket);

    return buckets;
}

/**
 * Merges 'source' log into 'target' log (Accumulator).
 * Handles weighted averages for Rates and sums for Volumes.
 * Updated to use the summarize field from DATA_DICTIONARY to
 * decide whether to sum or avg
 */
function mergeLogData(target, source) {
    const countA = target.queryCount || 1;
    const countB = source.queryCount || 1;
    const total = countA + countB;

    // Iterate through the dictionary once
    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
        // Skip metadata/categorical fields
        if (config.summarize === "remove" || config.dataType === "timestamp" || key === "modelName") return;

        if (config.summarize === "avg") {
            if (target[key] !== undefined && source[key] !== undefined) {
                target[key] = ((target[key] * countA) + (source[key] * countB)) / total;
            }
        } else if (config.summarize === "sum") {
            target[key] = (target[key] || 0) + (source[key] || 0);
        }
    });

    target.queryCount = total;

    // Handle Breakdown (Nested logic)
    if (source.breakdown) {
        if (!target.breakdown) target.breakdown = {};
        Object.keys(source.breakdown).forEach(topicKey => {
            if (!target.breakdown[topicKey]) {
                target.breakdown[topicKey] = { ...source.breakdown[topicKey] };
            } else {
                // Recursively call a similar logic or repeat the loop for the sub-object
                const tgtMetric = target.breakdown[topicKey];
                const srcMetric = source.breakdown[topicKey];
                const subCountA = tgtMetric.queryCount || 0;
                const subCountB = srcMetric.queryCount || 0;
                const subTotal = subCountA + subCountB;

                Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
                    if (config.summarize === "avg" && tgtMetric[key] !== undefined) {
                        tgtMetric[key] = ((tgtMetric[key] * subCountA) + (srcMetric[key] * subCountB)) / subTotal;
                    } else if (config.summarize === "sum") {
                        tgtMetric[key] = (tgtMetric[key] || 0) + (srcMetric[key] || 0);
                    }
                });
                tgtMetric.queryCount = subTotal;
            }
        });
    }
}

/**
 * Averages down summary objects for large timeframes (e.g., 1 day - doesnt need points every minute)
 * This function take in the modelname, startTime, and the amount of time per point on the chart.
 * Then it grabs that data from AI_Summaries.
 * @param {string} modelName - e.g. "GoodModel"
 * @param {number} startTime - Date.now() - 30 days
 * @param {number} bucketSizeMs - Size of one point in ms (e.g. 4 hours = 14400000)
 * Updated to use the summarize field from DATA_DICTIONARY to
 * decide whether to sum or avg
 */
const getDownsampledSummary = async (modelName, startTime, bucketSizeMs) => {
    // 1. Build Group Stage
    const groupStage = { _id: "$bucketTime" };
    // 2. Build Project Stage
    const projectStage = {
        _id: 0,
        responseTimestamp: "$_id",
        modelName: { $literal: modelName }
    };

    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
        // Do not average or sum these fields
        if (config.summarize === "remove" || config.dataType === "timestamp" || key === "modelName") return;

        // Map "avg" -> "$avg", "sum" -> "$sum"
        groupStage[key] = { [`$${config.summarize}`]: `$${key}` };
        projectStage[key] = 1;
    });

    return await AI_Summary.aggregate([
        { $match: { modelName, responseTimestamp: { $gte: startTime } } },
        {
            $addFields: {
                bucketTime: {
                    $subtract: ["$responseTimestamp", { $mod: ["$responseTimestamp", bucketSizeMs] }]
                }
            }
        },
        { $group: groupStage },
        { $project: projectStage },
        { $sort: { responseTimestamp: 1 } }
    ]);
};




export default {
    getRecentData,
    saveGraph,
    deleteGraph,
    updateGraph,
    patchGraph,
    getChartConfig,
    reorderCharts
}