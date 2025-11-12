import express from "express";
import controller from "../controllers/reportController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get("/", isAuthenticated, controller.getPage);

export default router;