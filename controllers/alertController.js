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

export default { getPage, createAlert };