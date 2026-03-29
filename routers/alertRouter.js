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
// get just one alert log
router.get("/api/log/:id", isAuthenticated, authorize('view:alerts'), controller.getAlertLog);

// Fetch alerts for an AI Log
router.get("/api/aiLog/:id", isAuthenticated, authorize('view:alerts'), controller.getAIAlerts)

// View one specific alert log
router.get("/view/:id", isAuthenticated, authorize('view:alerts'), controller.getAlertLogView);

// Return dashboard stats
router.get("/api/stats", isAuthenticated, controller.getAlertStats);
// Delete an alert by id
router.delete("/:id", isAuthenticated, authorize('delete:alert'), controller.removeAlertById);
// Update an alert by id
router.put("/:id", isAuthenticated, authorize('edit:alert'), controller.updateAlertById);
// Add a tag to a specific alert log
router.post('/api/logs/:id/tags', isAuthenticated, authorize('acknowledge:alert'), controller.addTagToAlertLog);
// Remove a tag from a specific alert log
router.delete('/api/logs/:id/tags/:tagId', authorize('acknowledge:alert'), isAuthenticated, controller.removeTagFromAlertLog);
// Replace tags on a specific alert log
router.put('/api/logs/:id/tags', authorize('acknowledge:alert'), isAuthenticated, controller.setTagsForAlertLog);

export default router;