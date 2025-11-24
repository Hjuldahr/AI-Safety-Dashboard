import express from "express";
import controller from "../controllers/alertController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", isAuthenticated, controller.getPage);
router.post("/create", isAuthenticated, controller.createAlert);
// Return live alerts as JSON
router.get("/live", isAuthenticated, controller.getLiveAlerts);
// Return full alert history (Paginated/Filtered)
router.get("/api/history", isAuthenticated, controller.getAlertHistory);
// Return unread count for current user
router.get('/unread-count', isAuthenticated, controller.getUnreadCount);
// Mark alerts as read for current user
router.post('/mark-read', isAuthenticated, controller.markAlertsRead);
// Delete an alert by id
router.delete("/:id", isAuthenticated, controller.removeAlertById);
// Update an alert by id
router.put("/:id", isAuthenticated, controller.updateAlertById);

export default router;