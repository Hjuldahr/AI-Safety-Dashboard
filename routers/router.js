import express from "express";
import authRouter from "./authRouter.js";
import indexRouter from "./indexRouter.js";

const router = express.Router();

router.use("/", authRouter);
router.use("/", indexRouter);

export default router;