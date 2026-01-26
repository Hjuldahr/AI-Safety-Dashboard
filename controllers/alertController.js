import Alert from "../models/alert_model.js";
import User_Log from "../models/User_Log.js";
import AlertLog from "../models/alert_log.js";
import User from "../models/user.js";
import AI_Log from "../models/AI_Log.js";
import Tag from "../models/tag.js";
import constants from "../config/constants.js";

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
      constants: constants,
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
      const tagId = req.query.tag;
      query.tags = tagId;
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

const getUnreadCount = async (req, res) => {
  try {
    if (!req.user) return res.status(200).json({ unread: 0 });
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    const lastSeen =
      user && user.alertsLastSeen ? new Date(user.alertsLastSeen) : new Date(0);
    const count = await AlertLog.countDocuments({
      timestamp: { $gt: lastSeen },
    });
    return res.status(200).json({ unread: count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return res.status(500).json({ unread: 0 });
  }
};

const markAlertsRead = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Not authenticated" });
    const userId = req.user._id;
    await User.findByIdAndUpdate(userId, { alertsLastSeen: new Date() });
    return res.status(200).json({ message: "Marked read" });
  } catch (error) {
    console.error("Error marking alerts read:", error);
    return res.status(500).json({ message: "Failed to mark read" });
  }
};

const addTagToAlertLog = async (req, res) => {
  try {
    const logId = req.params.id;
    const { tagId, name, color } = req.body;

    let tag = null;
    if (tagId) {
      tag = await Tag.findById(tagId).lean();
      if (!tag) return res.status(404).json({ message: "Tag not found." });
    } else if (name) {
      tag = await Tag.findOne({ name: name.trim() });
      if (!tag) {
        tag = await Tag.create({
          name: name.trim(),
          color: color || "#888888",
        });
      }
    } else {
      return res.status(400).json({ message: "Missing tagId or name." });
    }

    const existing = await AlertLog.findById(logId);
    if (!existing)
      return res.status(404).json({ message: "Alert log not found." });

    const tagObjectId = tag._id;
    if (!existing.tags) existing.tags = [];
    if (!existing.tags.find((t) => String(t) === String(tagObjectId))) {
      existing.tags.push(tagObjectId);
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

    existing.tags = tags.filter((t) => !!t);
    await existing.save();
    return res
      .status(200)
      .json({ message: "Tags updated.", tags: existing.tags });
  } catch (error) {
    console.error("Error setting tags:", error);
    return res.status(500).json({ message: "Failed to set tags." });
  }
};

export default {
  getPage,
  createAlert,
  getLiveAlerts,
  getAlertHistory,
  removeAlertById,
  updateAlertById,
  getUnreadCount,
  markAlertsRead,
  addTagToAlertLog,
  removeTagFromAlertLog,
  setTagsForAlertLog,
};
