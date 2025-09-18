import express from "express";
import controller from "../controllers/authController.js";

const router = express.Router();

// Viewing the login page
router.get("/login", controller.getPage);

// Sign in / up / logout methods:
router.post("/api/login", controller.login);
router.post("/api/signup", controller.signUp);
router.post("/api/logout", controller.logout);

export default router;