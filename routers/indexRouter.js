import express from "express";
import controller from "../controllers/indexController.js";

const router = express.Router();

router.get("/", controller.getPage);

export default router;