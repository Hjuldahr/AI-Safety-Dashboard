import express from "express";
import controller from "../controllers/motdController.js";

const router = express.Router();

router.get("/api/motd/pull", controller.pullMessage);
router.post("/api/motd/push", controller.pushMessage);

export default router;