import express from "express";
import controller from "../controllers/indexController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/", isAuthenticated, authorize('view:dashboard'), controller.getPage);

router.get("/api/recentData", isAuthenticated, authorize('view:dashboard'), controller.getRecentData);

export default router;