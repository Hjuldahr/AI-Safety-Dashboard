import express from "express";
import controller from "../controllers/alertController.js";

const router = express.Router();

router.get("/", controller.getPage);
router.post("/create", controller.createAlert);
// Return live alerts as JSON
router.get("/live", controller.getLiveAlerts);
// Return recent alert log entries
router.get("/recent", controller.getRecentAlertLogs);
// Return unread count for current user
router.get('/unread-count', controller.getUnreadCount);
// Mark alerts as read for current user
router.post('/mark-read', controller.markAlertsRead);
// Delete an alert by id
router.delete("/:id", controller.removeAlertById);
// Update an alert by id
router.put("/:id", controller.updateAlertById);

export default router;