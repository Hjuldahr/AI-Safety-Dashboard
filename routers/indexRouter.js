import express from "express";
import indexController from "../controllers/indexController.js";
import chartController from "../controllers/chartController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", indexController.getPage);

router.get("/api/recentData", chartController.getRecentData);

export default router;