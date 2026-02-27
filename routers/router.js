import express from "express";
import authRouter from "./authRouter.js";
import indexRouter from "./indexRouter.js";
import alertRouter from "./alertRouter.js";
import logRouter from "./logRouter.js";
import reportRouter from "./reportRouter.js";
import controlPanelRouter from './controlPanelRouter.js';
import tagRouter from './tagRouter.js';
import schedulerRouter from "./schedulerRouter.js";
import adminRouter from "./adminRouter.js";
import demoRouter from "./demoRouter.js";
import docsRouter from "./docsRouter.js";
import profileRouter from "./profileRouter.js";

const router = express.Router();

router.use("/", authRouter);
router.use("/", indexRouter);
router.use("/alerts", alertRouter);
router.use("/logs", logRouter);
router.use("/reports", reportRouter);
router.use("/", controlPanelRouter);
router.use('/tags', tagRouter);
router.use("/", schedulerRouter);
router.use("/demo", demoRouter);
router.use("/", docsRouter);

// Profile routes
router.use('/', profileRouter);

// Admin user management
router.use('/admin', adminRouter);

export default router;