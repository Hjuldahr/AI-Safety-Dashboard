import AI_Log_Model from "../models/AI_Log_Model.js";
import AI_Model from "../models/AI_Model.js";

// === Render logs page ===
const getPage = async (req, res) => {
    try {
        res.render("logs", { user: req.user });
    } catch (error) {
        console.error("Error fetching logs page:", error);
        res.status(500).send("Internal Server Error");
    }
};

// === Get paginated logs for current user ===
const getUserLog = async (req, res) => {
    try {
        const userID = req.user._id;
        const page = parseInt(req.query.page) || 1; // default page 1
        const limit = 100;
        const skip = (page - 1) * limit;

        // Find all models for the user
        const userModels = await AI_Model.find({ userID }, { _id: 1 });
        const modelIDs = userModels.map(m => m._id);

        // Get logs for all user's models
        const logs = await AI_Log_Model.find({ modelID: { $in: modelIDs } })
            .sort({ responseTimestamp: -1 })
            .skip(skip)
            .limit(limit);

        res.json({ logs, page });
    } catch (error) {
        console.error("Error fetching user logs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// === Get paginated logs for a specific AI model ===
const getAILog = async (req, res) => {
    try {
        const modelID = req.query.modelID;
        const page = parseInt(req.query.page) || 1;
        const limit = 100;
        const skip = (page - 1) * limit;

        if (!modelID) return res.status(400).json({ error: "modelID is required" });

        const logs = await AI_Log_Model.find({ modelID })
            .sort({ responseTimestamp: -1 })
            .skip(skip)
            .limit(limit);

        res.json({ logs, page });
    } catch (error) {
        console.error("Error fetching AI model logs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export default { getPage, getUserLog, getAILog };
