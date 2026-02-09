import express from "express";
import controller from "../controllers/alertController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/", isAuthenticated, authorize('view:alerts'), controller.getPage);
router.post("/", isAuthenticated, authorize('create:alert'), controller.createAlert);
// Return live alerts as JSON
router.get("/live", isAuthenticated, authorize('view:alerts'), controller.getLiveAlerts);
// Return full alert history (Paginated/Filtered)
router.get("/api/history", isAuthenticated, authorize('view:alerts'), controller.getAlertHistory);
// Return dashboard stats
roter.get("/api/stats", isAuuthenticated, controller.getAlertStats);
// Return unread count for current user
router.get('/unread-count', isAuthenticated, authorize('view:alerts'), controller.getUnreadCount);
// Mark alerts as read for current user
router.post('/mark-read', isAuthenticated, authorize('acknowledge:alert'), controller.markAlertsRead);
// Delete an alert by id
router.delete("/:id", isAuthenticated, authorize('delete:alert'), controller.removeAlertById);
// Update an alert by id
router.put("/:id", isAuthenticated, authorize('edit:alert'), controller.updateAlertById);
// Add a tag to a specific alert log
router.post('/api/logs/:id/tags', isAuthenticated, authorize('acknowledge:alert'), controller.addTagToAlertLog);
// Remove a tag from a specific alert log
router.delete('/api/logs/:id/tags/:tagId', isAuthenticated, authorize('acknowledge:alert'), controller.removeTagFromAlertLog);
// Replace tags on a specific alert log
router.put('/api/logs/:id/tags', isAuthenticated, authorize('acknowledge:alert'), controller.setTagsForAlertLog);

export default router;