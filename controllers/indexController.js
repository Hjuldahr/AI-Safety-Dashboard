import AI_Log from "../models/AI_Log.js";
import { schedulerState } from '../server_side_events/schedulerState.js';
import ChartConfig from '../models/Chart_Config.js';
import constants from "../config/constants.js";

// limits how many data points are sent to the frontend on reload (shouldn't be more than charts visible range)
const RECENT_DATA_LIMIT = 30;

const getPage = async (req, res) => {
    try {
        res.render("index", {
            user: req.user,
            constants: constants
        }); //renders the index.ejs 
    } catch (error) {
        console.error("Error fetching homepage content:", error);
    }
};

// Updated to send back recent data for all models in the database
const getRecentData = async (req, res) => {
    try {
        // Get list of distinct models
        const uniqueModels = await AI_Log.distinct("modelName");

        //  Run parallel queries - one limited query per model
        const logPromises = uniqueModels.map(async (model) => {
            const logs = await AI_Log.find({ modelName: model })
                .sort({ responseTimestamp: -1 })
                .limit(RECENT_DATA_LIMIT)
                .lean(); // .lean() makes it a plain JS object (faster)
            
            return {
                modelName: model,
                logs: logs.reverse() // Flip to oldest-first for the chart
            };
        });

        const results = await Promise.all(logPromises);

        // Convert array of results into your mapped object
        const logsByModel = {};
        results.forEach(result => {
            logsByModel[result.modelName] = result.logs;
        });

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