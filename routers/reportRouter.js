import express from "express";
import controller from "../controllers/reportController.js";

const router = express.Router();

router.get("/", controller.getPage);

export default router;