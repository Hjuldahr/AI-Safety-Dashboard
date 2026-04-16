import express from "express";
import controller from "../controllers/notificationController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/latest", isAuthenticated, authorize('view:notifications'), controller.latest);
router.get("/history", isAuthenticated, authorize('view:notifications'), controller.history);
router.get("/unread", isAuthenticated, authorize('view:notifications'), controller.unread);
router.post("/mark-read", isAuthenticated, authorize('view:notifications'), controller.markRead);

export default router;