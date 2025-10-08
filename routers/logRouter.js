import express from "express";
import controller from "../controllers/logController.js";

const router = express.Router();

router.get("/", controller.getPage);

export default router;