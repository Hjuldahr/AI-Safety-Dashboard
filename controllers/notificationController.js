// notificationsController.js
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { broadcastEvent } from "../server_side_events/scheduler.js";

/**
 * GET /api/notifications/latest
 * Fetch the most recent unseen notification for the user
 */
const latest = async (req, res) => {
    try {
        if (!req.user?._id) return res.status(200).json({});

        const user = await User.findById(req.user._id)
            .select("notificationsLastSeen")
            .lean();

        if (!user) return res.status(200).json({});

        const lastSeen = user.notificationsLastSeen ? new Date(user.notificationsLastSeen) : new Date(0);

        // Find newest notification created after lastSeen
        const notif = await Notification.findOne({ createdAt: { $gt: lastSeen } })
            .sort({ createdAt: -1 })
            .populate("tags")
            .lean();

        if (!notif) return res.status(200).json({});

        // Map DB fields to frontend-friendly format
        const response = {
            message: notif.message,
            redirectUrl: notif.redirectUrl || null,
            timeout: notif.timeout ?? 10,
            dismissible: notif.dismissible ?? true,
            background: notif.background || "#ffffff",
            tags: notif.tags || []
        };

        return res.status(200).json(response);

    } catch (error) {
        console.error("Error fetching latest notification:", error);
        return res.status(500).json({});
    }
};

/**
 * GET /api/notifications/unread
 * Count number of unseen notifications
 */
const unread = async (req, res) => {
    try {
        if (!req.user?._id) return res.status(200).json({ unread: 0 });

        const user = await User.findById(req.user._id)
            .select("notificationsLastSeen")
            .lean();

        const lastSeen = user?.notificationsLastSeen ? new Date(user.notificationsLastSeen) : new Date(0);

        const count = await Notification.countDocuments({
            createdAt: { $gt: lastSeen }
        });

        return res.status(200).json({ unread: count });

    } catch (error) {
        console.error("Error fetching unread count:", error);
        return res.status(500).json({ unread: 0 });
    }
};

/**
 * GET /api/notifications/history
 * Paginated history of notifications with optional filters
 * Query params:
 *  - page, limit
 *  - category
 *  - tag
 *  - startDate, endDate
 */
const history = async (req, res) => {
    try {
        // Pagination
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
        const skip = (page - 1) * limit;

        // Build query filters
        const query = {};

        if (req.query.category && req.query.category !== "any") query.category = req.query.category;
        if (req.query.tag && req.query.tag !== "all") query.tags = req.query.tag;

        if (req.query.startDate || req.query.endDate) {
            query.createdAt = {};
            if (req.query.startDate) {
                const sd = new Date(req.query.startDate);
                if (!Number.isNaN(sd.getTime())) query.createdAt.$gte = sd;
            }
            if (req.query.endDate) {
                const ed = new Date(req.query.endDate);
                if (!Number.isNaN(ed.getTime())) {
                    ed.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = ed;
                }
            }
            if (!Object.keys(query.createdAt).length) delete query.createdAt;
        }

        // Run queries in parallel
        const [total, notifications] = await Promise.all([
            Notification.countDocuments(query),
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("tags")
                .lean()
        ]);

        // Map to frontend-friendly format
        const mapped = notifications.map(n => ({
            message: n.message,
            redirectUrl: n.redirectUrl || null,
            timeout: n.timeout ?? 10,
            dismissible: n.dismissible ?? true,
            background: n.background || "#ffffff",
            tags: n.tags || [],
            createdAt: n.createdAt
        }));

        return res.status(200).json({
            notifications: mapped,
            total,
            page,
            pages: Math.ceil(total / limit),
            limit
        });

    } catch (error) {
        console.error("Error fetching notification history:", error);
        return res.status(500).json({ message: "Error fetching history." });
    }
};

//doesnt seem to be marking as read correctly.
const markRead = async (req, res) => {
    try {
        if (!req.user?._id) 
            return res.status(401).json({ message: "Not authenticated" });

        // Fetch the user as a Mongoose document
        await User.findByIdAndUpdate(req.user._id, { $set: { notificationsLastSeen: new Date() } });

        return res.status(200).json({
            message: "Marked read"
        });

    } catch (error) {
        console.error("Error marking notifications read:", error);
        return res.status(500).json({ message: "Failed to mark read" });
    }
};

export async function sendNotification(json) {
    if ('message' in json) {
        const notification = new Notification(json);
        await notification.save();

        broadcastEvent("notification", json);
    }
};

export default {
    markRead,
    unread,
    history,
    latest
}