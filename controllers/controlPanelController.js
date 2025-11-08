import scheduler from '../server_side_events/scheduler.js';
import { schedulerState } from '../server_side_events/schedulerState.js';
import ChartConfig from '../models/Chart_Config.js';

const getParams = (req, res) => {
    res.json({ success: true, state: schedulerState })
}

const updateParams = (req, res) => {
    scheduler.updateSchedulerSettings(req.body);
    res.json({ success: true, state: req.body });
};

const saveGraph = async (req, res) => {
    try {
        const { title, chartType, yAxis, xAxis, category, splitBy } = req.body;

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
            yAxis: yAxis || null,
            xAxis: xAxis || null,
            category: category || null,
            splitBy: splitBy || null
        });

        const savedChart = await newChartConfig.save();

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
            error: error.message
        });
    }
};

const deleteGraph = async (req, res) => {
    // ToDo: implement this method
};

const updateGraph = async (req, res) => {
    // ToDo: implement this method
};

export default {
    getParams,
    updateParams,
    saveGraph,
    deleteGraph,
    updateGraph
}