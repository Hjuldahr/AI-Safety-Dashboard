import AI_Log from "../models/AI_Log.js";
import { schedulerState } from '../server_side_events/schedulerState.js';
import ChartConfig from '../models/Chart_Config.js';

// limits how many data points are sent to the frontend on reload (shouldn't be more than charts visible range)
const RECENT_DATA_LIMIT = 30;

const getPage = async (req, res) => {
    try {
        res.render("index", {
            user: req.user,
        }); //renders the index.ejs 
    } catch (error) {
        console.error("Error fetching homepage content:", error);
    }
};

// Updated to send back recent data for all models in the database
const getRecentData = async (req, res) => {
    try {
        // Run an aggregation pipeline to get logs *per model*
        const aggregatedLogs = await AI_Log.aggregate([
            { $sort: { responseTimestamp: -1 } },
            {
                $group: {
                    _id: "$modelName",
                    logs: { $push: "$$ROOT" }
                }
            },

            // Reshape the output
            {
                $project: {
                    _id: 0, // We don't need the default _id
                    modelName: "$_id", // Rename _id to modelName
                    recentLogs: { $slice: ["$logs", RECENT_DATA_LIMIT] }
                }
            }
        ]);

        const logsByModel = {};
        for (const group of aggregatedLogs) {
            const modelKey = group.modelName;
            const oldestFirstLogs = group.recentLogs.reverse();
            logsByModel[modelKey] = oldestFirstLogs;
        }

        const configs = await ChartConfig.find().sort({ order: 1 });

        res.status(200).json({
            logs: logsByModel,
            configs: configs
        });
    } catch (error) {
        console.error("Error fetching recent data:", error);
        res.status(500).json({ error: "Failed to fetch recent data" });
    }
};

export default { getPage, getRecentData };