import scheduler from '../server_side_events/scheduler.js';
import { schedulerState } from '../server_side_events/schedulerState.js';
import ChartConfig from '../models/Chart_Config.js';
import User_Log from '../models/User_Log.js';

const getParams = (req, res) => {
    res.json({ success: true, state: schedulerState })
}

const updateParams = (req, res) => {
    scheduler.updateSchedulerSettings(req.body);
    res.json({ success: true, state: req.body });
};

const saveGraph = async (req, res) => {
    try {
        const { title, chartType, chartSize, yAxis, xAxis, category, splitBy, includedValues } = req.body;

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
            error: error.message
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
        const { id, newTitle, newSize } = req.body;

        const itemToUpdate = await ChartConfig.findById(id);
        if (!itemToUpdate) {
            return res.status(404).json({ message: 'Chart config not found.' });
        }

        itemToUpdate.title = newTitle;
        itemToUpdate.chartSize = newSize;

        await itemToUpdate.save();

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
        res.status(500).json({ error: 'Failed to update order' });
    }
};

export default {
    getParams,
    updateParams,
    saveGraph,
    deleteGraph,
    updateGraph,
    getChartConfig,
    reorderCharts
}