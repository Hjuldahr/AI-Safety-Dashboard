import express from "express";
import controller from "../controllers/alertController.js";
import { authorize } from '../middleware/authorization.js';


const router = express.Router();

router.get("/", authorize('view:alerts'), controller.getPage);
router.post("/", authorize('create:alert'), controller.createAlert);
// Return live alerts as JSON
router.get("/live", authorize('view:alerts'), controller.getLiveAlerts);
// Return full alert history (Paginated/Filtered)
router.get("/api/history", authorize('view:alerts'), controller.getAlertHistory);
// get just one alert log
router.get("/api/log/:id", authorize('view:alerts'), controller.getAlertLog);

// Fetch alerts for an AI Log
router.get("/api/aiLog/:id", authorize('view:alerts'), controller.getAIAlerts)

// View one specific alert log
router.get("/view/:id", authorize('view:alerts'), controller.getAlertLogView);

// Return dashboard stats
router.get("/api/stats", authorize('view:alerts'), controller.getAlertStats);
// Delete an alert by id
router.delete("/:id", authorize('delete:alert'), controller.removeAlertById);
// Update an alert by id
router.put("/:id", authorize('edit:alert'), controller.updateAlertById);
// Add a tag to a specific alert log
router.post('/api/logs/:id/tags', authorize('acknowledge:alert'), controller.addTagToAlertLog);
// Remove a tag from a specific alert log
router.delete('/api/logs/:id/tags/:tagId', authorize('acknowledge:alert'), controller.removeTagFromAlertLog);
// Replace tags on a specific alert log
router.put('/api/logs/:id/tags', authorize('acknowledge:alert'), controller.setTagsForAlertLog);

export default router;