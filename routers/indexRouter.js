import express from "express";
import indexController from "../controllers/indexController.js";
import chartController from "../controllers/chartController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/", isAuthenticated, authorize('view:dashboard'), indexController.getPage);

router.get("/api/recentData", isAuthenticated, authorize('view:dashboard'), chartController.getRecentData);

export default router;