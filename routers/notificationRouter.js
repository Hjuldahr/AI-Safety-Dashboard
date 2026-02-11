import express from "express";
import controller from "../controllers/notificationController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/latest", isAuthenticated, controller.latest);
router.get("/history", isAuthenticated, controller.history);
router.get("/unread", isAuthenticated, controller.unread);
router.post("/mark-read", isAuthenticated, controller.markRead);

export default router;