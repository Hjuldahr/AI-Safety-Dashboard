import express from "express";
import scheduler from './server_side_events/scheduler.js';
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import initializePassport from './config/passport-config.js';
import { setTemplatePermissions } from './middleware/authorization.js';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import mainRouter from "./routers/router.js";
import { connectDB, seedDataBase, seedCharts, seedReportTemplates } from './config/database.js';
import { sendNotification } from './controllers/notificationController.js';
import { SHUTDOWN_MESSAGE } from "./constants/notification.js";

let shuttingDown = false;

dotenv.config();

//passport initialization
initializePassport(passport);

// Helper to get __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = __dirname;

const PORT = process.env.PORT || 2121;

const startServer = async () => {
    const app = express();

    app.set('trust proxy', 1);

    // Serve all public files in the public folder (must be done before mounting main routes)
    app.use(express.static(path.join(PROJECT_ROOT, "public")));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(cookieParser());

    app.use(session({
        name: 'dashboard_v2.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URL, // MongoDB connection string
            touchAfter: 24 * 3600
        }),
        
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // Cookie expires in 1 week
            secure: process.env.NODE_ENV === 'production', //use https in production
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // Make computed permissions available to server-rendered views
    app.use(setTemplatePermissions);

    // View engine setup
    app.set("views", path.join(PROJECT_ROOT, "views"));
    app.set("view engine", "ejs");

    // Start background tasks
    scheduler.setupScheduler();

    // Connect to the database:
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('[App] MongoDB connected successfully.');
    } catch (error) {
        console.error('[App] MongoDB connection failed:', error.message);
        process.exit(1);
    }

    //Mount all of the routes to /
    app.use("/", mainRouter);

    const server = app.listen(PORT, () => {
        console.log(`[Server] Now running at [http://localhost:${PORT}/]`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[Server] Port ${PORT} is already in use.`);
        } else {
            console.error('[Server] Server Error', err);
        }
        process.exit(1);
    });

    // --- Reject new connections during shutdown ---
    server.on('connection', (socket) => {
        if (shuttingDown) {
            socket.destroy();
            console.log('[Server] Client attempted to connect during shutdown');
        }
    });

    const shutdown = async (signal) => {
        if (shuttingDown) return;
        shuttingDown = true;

        console.log(`\n[Shutdown] Received ${signal}! Shutting down...`);

        await sendNotification(SHUTDOWN_MESSAGE);

        new Promise(resolve => setTimeout(resolve, 5000));

        const forceExitTimer = setTimeout(() => {
            console.error("[Shutdown] Force exit");
            process.exit(1);
        }, 10_000);

        try {
            scheduler.stopScheduler();

            await new Promise((resolve, reject) => {
                server.close(err => (err ? reject(err) : resolve()));
            });

            server.closeAllConnections?.();
            server.closeIdleConnections?.();

            await mongoose.disconnect();

            clearTimeout(forceExitTimer);
            process.exit(0);
        } catch (err) {
            console.error("[Shutdown] Shutdown failed:", err);
            clearTimeout(forceExitTimer);
            process.exit(1);
        }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
}

connectDB()
.then(async () => {
    await seedDataBase();
    await seedCharts();
    await seedReportTemplates();
    startServer();
})
.catch((err) => {
    console.error('[Startup Error] Failed to connect to database:', err);
    process.exit(1);
});