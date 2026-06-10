import express from "express";
import indexController from "../controllers/indexController.js";
import chartController from "../controllers/chartController.js";
import { authorize } from '../middleware/authorization.js';

const router = express.Router();

router.get("/", authorize('view:dashboard'), indexController.getPage);

router.get("/api/recentData", authorize('view:dashboard'), chartController.getRecentData);

export default router;