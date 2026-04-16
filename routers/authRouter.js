import express from "express";
import controller from "../controllers/authController.js";
import { isAuthenticated } from '../middleware/authMiddleware.js';

const router = express.Router();

// Viewing the login page
router.get("/login", controller.getPage);

// Sign in / up / logout methods:
router.post("/api/login", controller.login);
router.post("/api/signup", controller.signUp);
router.post("/api/logout", controller.logout);

// Force-reset password (after OTP login)
router.post("/api/reset-password", isAuthenticated, controller.resetPassword);

export default router;