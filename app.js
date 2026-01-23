import express from "express";
import scheduler from "./server_side_events/scheduler.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import initializePassport from "./config/passport-config.js";
import MongoStore from "connect-mongo";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import mainRouter from "./routers/router.js";
import { connectDB, seedDataBase, seedCharts } from "./config/database.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { broadcastMotd } from "./controllers/motdController.js";

dotenv.config();

// Passport initialization
initializePassport(passport);

// __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = __dirname;

const PORT = process.env.PORT || 2121;

let server;
let shuttingDown = false;

async function startServer() {
    const app = express();

    app.use((req, res, next) => {
        if (shuttingDown) {
            res.set("Connection", "close");
            return res.sendStatus(503);
        }
        next();
    });

    /* ---------- Static + Parsers ---------- */
    app.use(express.static(path.join(PROJECT_ROOT, "public")));
    app.use("/cms", express.static(path.join(process.cwd(), "cms")));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    /* ---------- Sessions ---------- */
    app.use(
        session({
            name: "dashboard.sid",
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({
                client: mongoose.connection.getClient(),
            }),
            cookie: {
                maxAge: 1000 * 60 * 60 * 24,
            },
        })
    );

    /* ---------- Auth ---------- */
    app.use(passport.initialize());
    app.use(passport.session());

    /* ---------- Views ---------- */
    app.set("views", path.join(PROJECT_ROOT, "views"));
    app.set("view engine", "ejs");

    /* ---------- Background Tasks ---------- */
    scheduler.setupScheduler();

    /* ---------- Routes ---------- */
    app.use("/", mainRouter);

    /* ---------- Swagger ---------- */
    const swaggerDocument = YAML.load(
        path.join(__dirname, "./documentation/openapi.yml")
    );
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    /* ---------- Server ---------- */
    server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

/* ---------- Graceful Shutdown ---------- */
const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`\n[${signal}] Shutting down...`);

    const forceExitTimer = setTimeout(() => {
        console.error("Force exit");
        process.exit(1);
    }, 10_000);

    try {
        await broadcastMotd({
            message: "The server will be shutting down for maintenance.",
            bground: "#b35d00",
            lock: true
        });

        scheduler.stopScheduler();   // stop background job

        await new Promise((resolve, reject) => {
            server.close(err => (err ? reject(err) : resolve()));
        });

        server.closeAllConnections?.();
        server.closeIdleConnections?.();

        await mongoose.disconnect();

        clearTimeout(forceExitTimer);
        process.exit(0);
    } catch (err) {
        console.error("Shutdown failed:", err);
        clearTimeout(forceExitTimer);
        process.exit(1);
    }
};

/* ---------- Signals ---------- */
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

/* ---------- Bootstrap ---------- */
(async () => {
    try {
        await connectDB();      
        await seedDataBase();
        await seedCharts();
        await startServer();
    } catch (err) {
        console.error("Startup failure:", err);
        process.exit(1);
    }
})();