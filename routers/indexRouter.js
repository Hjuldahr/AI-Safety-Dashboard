import express from "express";
import controller from "../controllers/indexController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", controller.getPage);

router.get("/api/recentData", controller.getRecentData);

export default router;