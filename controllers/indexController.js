import scheduler from '../server_side_events/scheduler.js';
import { schedulerState } from '../server_side_events/schedulerState.js';
import chartConstants from "../constants/charts.js";

const getPage = async (req, res) => {
    try {
        res.render("index", {
            user: req.user,
            permissions: res.locals.permissions || [],
            constants: chartConstants
        }); //renders the index.ejs 
    } catch (error) {
        console.error("Error fetching homepage content:", error);
    }
};

const getParams = (req, res) => {
    try {
        if (schedulerState) {
            res.json({ success: true, state: schedulerState })
        }
        else {
            throw new Error("Cannot find scheduler state.");
        }
    }
    catch (error) {
        console.error("Error fetching server state:", error);
        res.status(500).json({ message: "Error fetching server state." });
    }
}

const updateParams = (req, res) => {
    try {
        if (scheduler) {
            scheduler.updateSchedulerSettings(req.body, req.user);
            res.json({ success: true, state: req.body });
        }
        else {
            throw new Error("Cannot find scheduler.");
        }
    }
    catch (error) {
        console.error("Error updating server state:", error);
        res.status(500).json({ message: "Error updating server state." });
    }
};



export default { getPage, getParams, updateParams };