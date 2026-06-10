import express from "express";
import controller from "../controllers/notificationController.js";
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/latest", authorize('view:notifications'), controller.latest);
router.get("/history", authorize('view:notifications'), controller.history);
router.get("/unread", authorize('view:notifications'), controller.unread);
router.post("/mark-read", authorize('view:notifications'), controller.markRead);

export default router;