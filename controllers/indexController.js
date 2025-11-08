import AI_Log from "../models/AI_Log.js";
import {schedulerState} from '../server_side_events/schedulerState.js';
import ChartConfig from '../models/Chart_Config.js';

// limits how many data points are sent to the frontend on reload (shouldn't be more than charts visible range)
const RECENT_DATA_LIMIT = 15;

const getPage = async (req, res) => {
    try {
        res.render("index", {
            user: req.user,
        }); //renders the index.ejs 
    } catch (error) {
        console.error("Error fetching homepage content:", error);
    }
};

const getRecentData = async (req, res) => {
    try {
        const recentLogs = await AI_Log.find({modelName: schedulerState.activeModel}).sort({ responseTimestamp: -1 }).limit(RECENT_DATA_LIMIT);
        const configs = await ChartConfig.find();

        // Reverse the array to be oldest-first for the chart
        const logs = recentLogs.reverse();

        // Send as JSON
        res.status(200).json({
            logs: logs,
            configs: configs
        });
    } catch (error) {
        console.error("Error fetching recent data:", error);
        res.status(500).json({ error: "Failed to fetch recent data" });
    }
};

export default { getPage, getRecentData };