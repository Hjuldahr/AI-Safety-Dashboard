import Alert from "../models/alert_model.js";
import User_Log from "../models/User_Log.js";
import AlertLog from "../models/alert_log.js";
import AI_Log from "../models/AI_Log.js";
import Tag from "../models/tag.js";
import HistTag from "../models/historicalTag.js";
import chartConstants from "../constants/charts.js";

const getPage = async (req, res) => {
  try {
    const alerts = await Alert.find();
    // Fetch distinct model names from AI logs to populate the UI
    let modelNames = [];
    try {
      modelNames = await AI_Log.distinct("modelName");
    } catch (mnErr) {
      console.error("Failed to fetch model names for alerts page:", mnErr);
      modelNames = [];
    }

    res.render("alerts", {
      user: req.user,
      alerts: alerts,
      alertLogs: [],
      models: modelNames,
      constants: chartConstants,
      deepLink: null,
    });
  } catch (error) {
    console.error("Error fetching alert page:", error);
  }
};

// GET /alerts/api/history - Paginated and Filtered History
const getAlertHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const modelName = req.query.modelName || req.query.model;
    const level = req.query.level;
    const start = req.query.startDate;
    const end = req.query.endDate;
    const skip = (page - 1) * limit;

    const query = {};

    if (level && level !== "all") {
      query["alertSnapshot.alertLevel"] = level;
    }

    if (modelName && modelName !== "all") {
      query["alertSnapshot.modelName"] = modelName;
    }

    if (req.query.tag && req.query.tag !== "all") {
      const activeTagId = req.query.tag;

      // Find every historical version that ever belonged to this Active Tag
      const relatedHistTags = await HistTag.find({ originalTagId: activeTagId }).select('_id');
      const histIds = relatedHistTags.map(ht => ht._id);

      // Search logs that have ANY of those historical versions
      query.tags = { $in: histIds };
    }

    if (start || end) query.timestamp = {};

    if (start) {
      const sd = new Date(start);
      if (!Number.isNaN(sd.getTime())) query.timestamp.$gte = sd;
    }

    if (end) {
      const ed = new Date(end);
      if (!Number.isNaN(ed.getTime())) {
        ed.setHours(23, 59, 59, 999);
        query.timestamp.$lte = ed;
      }
    }

    const total = await AlertLog.countDocuments(query);
    const rawLogs = await AlertLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate("alert")
      .populate("tags")
      .lean();

    const alertLogs = rawLogs.map((l) => {
      const a = l.alertSnapshot || l.alert || {};
      let humanRule = "";
      try {
        humanRule = Alert.convertToHumanFormat(a.alertRule);
      } catch (err) {
        humanRule = "";
      }
      return {
        _id: l._id,
        level: a.alertLevel || "Info",
        timestamp: l.timestamp,
        alertName: a.alertName || "",
        modelName: a.modelName || null,
        humanRule,
        tags: (l.tags || []).map((t) => ({
          _id: t._id || t,
          name: t.name || "",
          color: t.color || "#888888",
        })),
        created: l.timestamp,
      };
    });

    res.json({
      logs: alertLogs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching alert history:", error);
    res.status(500).json({ message: "Error fetching history." });
  }
};

const getAlertLog = async (req, res) => {
  try {
    const { id } = req.params;
    const alertLog = await AlertLog.findById(id);

    if (!alertLog) {
      return res.status(404).json({ message: "Alert Log not found." });
    }

    return res.status(201).json(alertLog);

  } catch (error) {
    console.error("Error fetching alert log:", error);
    res.status(500).json({ message: "Error fetching alert log." });
  }
}

const getAIAlerts = async (req, res) => {
  try {
    const id = req.params.id;

    const targetLog = await AI_Log.findById(id);
    if (!targetLog) {
      return res.status(404).json({ message: "AI Log not found." });
    }

    // find alerts associated with that Log
    const results = await AlertLog.find({ logs: id });

    return res.status(200).json(results);

  } catch (error) {
    console.error("Error fetching alerts for AI Log:", error);
    res.status(500).json({ message: "Error fetching alerts for AI Log." });
  }
};


const createAlert = async (req, res) => {
  try {
    const { alertName, alertLevel, alertRule, created, modelName, tags } =
      req.body;

    let normalizedRule;
    try {
      normalizedRule = Alert.convertToJSONFormat(alertRule);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Invalid alert rule: " + err.message });
    }

    const newAlert = new Alert({
      alertName,
      alertLevel,
      alertRule: normalizedRule,
      created,
      modelName: modelName || null,
      tags: Array.isArray(tags) ? tags : [],
    });
    await newAlert.save();

    const humanRule = Alert.convertToHumanFormat(normalizedRule);
    try {
      await User_Log.addLog(
        req.user ? req.user._id : null,
        "Alert_Created",
        `Alert "${alertName}" created. Rule: ${humanRule}`,
      );
    } catch (logErr) {
      console.error("Failed to write user log for alert creation:", logErr);
    }
    res
      .status(201)
      .json({
        message: "Alert created successfully.",
        alert: newAlert,
        humanRule,
      });
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({ message: "An internal server error occurred." });
  }
};

const getLiveAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find()
      .sort({ created: -1 })
      .populate("tags")
      .lean();
    return res.status(200).json({ alerts });
  } catch (error) {
    console.error("Error fetching live alerts:", error);
    return res.status(500).json({ message: "Failed to fetch alerts." });
  }
};

const removeAlertById = async (req, res) => {
  try {
    const alertId = req.params.id;
    if (!alertId) return res.status(400).json({ message: "Missing alert id." });
    const alert = await Alert.findById(alertId).lean();
    if (!alert) return res.status(404).json({ message: "Alert not found." });
    await Alert.findByIdAndDelete(alertId);
    try {
      const name = alert.alertName || `ID:${alertId}`;
      await User_Log.addLog(
        req.user ? req.user._id : null,
        "Alert_Deleted",
        `Alert "${name}" deleted.`,
      );
    } catch (logErr) {
      console.error("Failed to write user log for alert deletion:", logErr);
    }
    return res.status(200).json({ message: "Alert removed." });
  } catch (error) {
    console.error("Error removing alert:", error);
    return res.status(500).json({ message: "Failed to remove alert." });
  }
};

const updateAlertById = async (req, res) => {
  try {
    const alertId = req.params.id;
    const update = req.body;
    if (!alertId) return res.status(400).json({ message: "Missing alert id." });
    delete update._id;

    const existing = await Alert.findById(alertId).lean();
    if (!existing) return res.status(404).json({ message: "Alert not found." });
    const oldName = existing.alertName || `ID:${alertId}`;

    if (update.alertRule) {
      try {
        update.alertRule = Alert.convertToJSONFormat(update.alertRule);
      } catch (err) {
        return res
          .status(400)
          .json({ message: "Invalid alert rule: " + err.message });
      }
    }

    const updated = await Alert.findByIdAndUpdate(alertId, update, {
      new: true,
    });

    try {
      const fieldsToCheck = [
        "alertName",
        "alertLevel",
        "alertRule",
        "modelName",
      ];

      await User_Log.addLog(
        req.user ? req.user._id : null,
        "Alert_Modified",
        `Alert "${oldName}" updated.`,
      );
    } catch (logErr) {
      console.error("Failed to write user log for alert update:", logErr);
    }

    return res.status(200).json({ message: "Alert updated.", alert: updated });
  } catch (error) {
    console.error("Error updating alert:", error);
    return res.status(500).json({ message: "Failed to update alert." });
  }
};

const addTagToAlertLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { tagId, name, color } = req.body;

    let sourceTag = null;
    // Get the source data (either from an existing Tag or raw input)
    if (tagId) {
      sourceTag = await Tag.findById(tagId).lean();
      if (!sourceTag) return res.status(404).json({ message: "Tag not found." });
    } else if (name) {
      // Logic for ad-hoc tag creation - I don't think we allow this yet, but it was in the old version, so ill keep it.
      sourceTag = { name: name.trim(), color: color || "#888888" };
    }

    const historicalTag = await HistTag.addOrFindTag(sourceTag)

    const existing = await AlertLog.findById(logId);
    if (!existing)
      return res.status(404).json({ message: "Alert log not found." });

    // Store the historical tag
    if (!existing.tags.includes(historicalTag._id)) {
      existing.tags.push(historicalTag._id);
    }

    await existing.save();
    return res
      .status(200)
      .json({
        message: "Tag added to alert log.",
        tag: { _id: tag._id, name: tag.name, color: tag.color },
      });
  } catch (error) {
    console.error("Error adding tag to alert log:", error);
    return res.status(500).json({ message: "Failed to add tag." });
  }
};

const removeTagFromAlertLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const tagId = req.params.tagId;
    const existing = await AlertLog.findById(logId);

    if (!existing)
      return res.status(404).json({ message: "Alert log not found." });
    existing.tags = (existing.tags || []).filter(
      (t) => String(t) !== String(tagId),
    );
    await existing.save();
    return res.status(200).json({ message: "Tag removed from alert log." });
  } catch (error) {
    console.error("Error removing tag from alert log:", error);
    return res.status(500).json({ message: "Failed to remove tag." });
  }
};

const setTagsForAlertLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { tags } = req.body;
    const existing = await AlertLog.findById(logId);
    if (!existing)
      return res.status(404).json({ message: "Alert log not found." });

    const historicalTagPromises = tags.map(async (id) => {
      const source = await Tag.findById(id).lean();
      return source ? (await HistTag.addOrFindTag(source))._id : null;
    });

    const histIds = (await Promise.all(historicalTagPromises)).filter(id => id != null);
    existing.tags = histIds;

    await existing.save();
    return res
      .status(200)
      .json({ message: "Tags updated.", tags: existing.tags });
  } catch (error) {
    console.error("Error setting tags:", error);
    return res.status(500).json({ message: "Failed to set tags." });
  }
};

const getAlertStats = async (req, res) => {
  try {
    const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const start = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    // Ensure valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: "Invalid date range" });
    }

    // Set end of day if only date part provided/consistent with history
    if (req.query.endDate) end.setHours(23, 59, 59, 999);

    const matchStage = {
      timestamp: { $gte: start, $lte: end },
    };

    // 1. Level Distribution (Pie/Bar)
    const levelStats = await AlertLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$alertSnapshot.alertLevel",
          count: { $sum: 1 },
        },
      },
    ]);

    const levelDistribution = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Info: 0,
    };
    levelStats.forEach((s) => {
      if (s._id) levelDistribution[s._id] = s.count;
    });

    // 2. Time Series (Line Chart) - Group by Level and Hour
    // We'll format time as "YYYY-MM-DD HH:00" for grouping
    const timeStats = await AlertLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            level: "$alertSnapshot.alertLevel",
            year: { $year: "$timestamp" },
            month: { $month: "$timestamp" },
            day: { $dayOfMonth: "$timestamp" },
            hour: { $hour: "$timestamp" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    // Structure for frontend: { Critical: [{t: ISO, y: count}, ...], High: ... }
    const timeSeries = {
      Critical: [],
      High: [],
      Medium: [],
      Info: [],
    };

    // Helper to generate all hours in range to fill gaps (optional but good for charts)
    // For simplicity, we just return the data points we have, frontend can handle gaps or we fill them.
    // Let's just return raw points for now, or maybe simplified "Label: Count"

    timeStats.forEach((t) => {
      const level = t._id.level || "Info";
      // Create a date object for the bucket
      const d = new Date(
        t._id.year,
        t._id.month - 1,
        t._id.day,
        t._id.hour,
        0,
        0,
      );
      if (timeSeries[level]) {
        timeSeries[level].push({ x: d.toISOString(), y: t.count });
      }
    });

    res.json({
      levelDistribution,
      timeSeries,
    });
  } catch (error) {
    console.error("Error fetching alert stats:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};

// Gets a specific Alert log and returns its page number so we can open the alerts page to view it
const getAlertLogView = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = 10; // Keep consistent with your history limit

    // Find the target alert log
    const targetLog = await AlertLog.findById(id);
    if (!targetLog) {
      return res.redirect('/alerts?error=LogNotFound');
    }

    // Calculate which page it is on based on your history sort (timestamp: -1)
    const countBefore = await AlertLog.countDocuments({
      timestamp: { $gt: targetLog.timestamp }
    });

    const targetPage = Math.floor(countBefore / limit) + 1;

    // Fetch standard required data for the alerts page
    const alerts = await Alert.find();
    let modelNames = [];
    try {
      modelNames = await AI_Log.distinct("modelName");
    } catch (mnErr) {
      console.error("Failed to fetch model names for alerts page:", mnErr);
    }

    // Render the page with the Deep Link instructions
    res.render("alerts", {
      user: req.user,
      alerts: alerts,
      alertLogs: [], // Initial empty array, frontend will fetch the specific page
      models: modelNames,
      constants: chartConstants,
      deepLink: {
        view: 'alert',
        id: id,
        page: targetPage
      }
    });
  } catch (error) {
    console.error("Error redirecting to Alert log:", error);
    res.redirect('/alerts');
  }
}

export default {
  getPage,
  createAlert,
  getLiveAlerts,
  getAlertHistory,
  getAlertLog,
  getAIAlerts,
  getAlertStats,
  removeAlertById,
  updateAlertById,
  addTagToAlertLog,
  removeTagFromAlertLog,
  setTagsForAlertLog,
  getAlertLogView
};
