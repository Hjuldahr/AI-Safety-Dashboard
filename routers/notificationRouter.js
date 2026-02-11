import express from "express";
import controller from "../controllers/notificationController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/api/notifications/latest", isAuthenticated, controller.latest);
router.get("/api/notifications/history", isAuthenticated, controller.history);
router.get("/api/notifications/unread", isAuthenticated, controller.unread);
router.get("/api/notifications/mark-read", isAuthenticated, controller.markRead);

export default router;