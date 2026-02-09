import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express from 'express';
import configurePassport from './config/passportConfigurator.js';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import path from 'path';
import rootRouter from './routers/rootRouter.js';
import session from 'express-session';
import { connectDB, initializeDB } from './config/database.js';
import { fileURLToPath } from 'url';
import broadcaster from './sse/broadcaster.js';

dotenv.config();
configurePassport(passport);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = __dirname;

const PORT = process.env.PORT || 8000;
const HOST = process.env.HOST || 'localhost';

let isShuttingDown = false;

const startServer = async () => {
    const app = express();

    // --- View engine ---
    app.set('view engine', 'ejs');
    app.set('views', path.join(PROJECT_ROOT, 'views'));

    // --- Static files ---
    app.use('/private', express.static(path.join(PROJECT_ROOT, 'private')));
    app.use(express.static(path.join(PROJECT_ROOT, 'public')));

    // --- Body parsing & cookies ---
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // --- Sessions ---
    app.use(session({
        name: 'opencord',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URL
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24, // 1 day
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        }
    }));

    // --- Passport ---
    app.use(passport.initialize());
    app.use(passport.session());

    // --- Routers ---
    app.use('/', rootRouter);

    // --- Start HTTP server ---
    const server = app.listen(PORT, () => {
        console.log(`[App] Server running at http://${HOST}:${PORT}`);
    });

    // --- Error handling ---
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
        if (isShuttingDown) {
            socket.destroy();
            console.log('[Shutdown] Client attempted to connect during shutdown');
        }
    });

    // --- Graceful shutdown ---
    const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.log(`\n[Process] Received ${signal}! Initiating shutdown.`);

        // Fallback timer to force exit
        const forceTimeout = setTimeout(() => {
            console.error('[Shutdown] Grace period expired. Killing remaining connections.');
            process.exit(0);
        }, 5000);

        // Close SSE connections
        broadcaster.shutdownSSE();

        // Close HTTP server
        server.close(async () => {
            clearTimeout(forceTimeout);
            console.log('[Shutdown] HTTP server closed.');

            // Disconnect from MongoDB
            await mongoose.disconnect();
            console.log('[Shutdown] MongoDB disconnected.');

            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

connectDB()
.then(async () => {
    await initializeDB();
    startServer();
})
.catch((err) => {
    console.error('[Startup Error] Failed to connect to database:', err);
    process.exit(1);
});