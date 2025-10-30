import express from "express";
import controller from "../controllers/alertController.js";

const router = express.Router();

router.get("/", controller.getPage);
router.post("/create", controller.createAlert);

export default router;