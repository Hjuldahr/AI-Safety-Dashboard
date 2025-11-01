import Alert from "../models/alert_model.js";
import User_Log from "../models/User_Log.js";

const getPage = async (req, res) => {
    try{
        const alerts = await Alert.find();
        res.render("alerts", {
            user: req.user,
            alerts: alerts
        }); 
    }catch (error){
        console.error("Error fetching alert page:", error);
    }
};

const createAlert = async (req, res) => {
    console.log("called createAlert");
    try {
        const { alertName, alertLevel, alertRule, created, lastTrigger, isActive } = req.body;

        const newAlert = new Alert({ alertName, alertLevel, alertRule, created, lastTrigger, isActive });
        await newAlert.save();
        await User_Log.addLog(req.user._id, 'Alert_Created', `Alert "${alertName}" created.`);
        res.status(201).json({ message: 'Alert created successfully.', alert: newAlert });
    } catch (error) {
        console.error("Error creating alert:", error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

// GET /alerts/live - return alerts as JSON (optionally filter active=true)
const getLiveAlerts = async (req, res) => {
    try {
        const filter = {};
        if (req.query.active === 'true') filter.isActive = true;
        const alerts = await Alert.find(filter).sort({ created: -1 }).lean();
        return res.status(200).json({ alerts });
    } catch (error) {
        console.error('Error fetching live alerts:', error);
        return res.status(500).json({ message: 'Failed to fetch alerts.' });
    }
};

// DELETE /alerts/:id - remove alert by id
const removeAlertById = async (req, res) => {
    try {
        const alertId = req.params.id;
        if (!alertId) return res.status(400).json({ message: 'Missing alert id.' });
        await Alert.findByIdAndDelete(alertId);
        return res.status(200).json({ message: 'Alert removed.' });
    } catch (error) {
        console.error('Error removing alert:', error);
        return res.status(500).json({ message: 'Failed to remove alert.' });
    }
};

export default { getPage, createAlert, getLiveAlerts, removeAlertById };