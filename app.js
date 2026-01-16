import express from "express";
import scheduler from './server_side_events/scheduler.js';
import dotenv from 'dotenv';
import path from "path";
import { fileURLToPath } from 'url';
import session from 'express-session';
import passport from 'passport';
import initializePassport from './config/passport-config.js';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import mainRouter from "./routers/router.js";
import { connectDB, seedDataBase, seedCharts } from './config/database.js';
// import { swaggerSpec } from "./config/swaggerConfig.js";
import swaggerUi from "swagger-ui-express";
import YAML from 'yamljs';

dotenv.config();

//passport initialization
initializePassport(passport);

// Helper to get __dirname in ES module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = __dirname;

const domain = process.env.DOMAIN || "http://localhost:2121/";
const publicURL = process.env.PUBLIC_URL || "/";
const PORT = process.env.PORT || 2121;


const startServer = async () => {
    const app = express();

    // Serve all public files in the public folder (must be done before mounting main routes)
    app.use(express.static(path.join(PROJECT_ROOT, "public")));

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use(cookieParser());

    app.use(session({
        name: 'dashboard.sid',
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl: process.env.MONGO_URL // MongoDB connection string
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 1, // Cookie expires in 1 day
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // View engine setup
    app.set("views", path.join(PROJECT_ROOT, "views"));
    app.set("view engine", "ejs");

    // Hook up SSE routes
    scheduler.setupSSE(app);
    // Start background tasks
    scheduler.setupScheduler();

    // Connect to the database:
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log('MongoDB connected successfully.');
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    }

    //Mount all of the routes to /
    app.use("/", mainRouter);

    const swaggerDocument = YAML.load(path.join(__dirname, './documentation/openapi.yml'));

    // Serve the Swagger API documentation at /docs
    // app.use(`/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    app.use('/docs', (req, res, next) => {
        // If the request is from /docs redirect to /docs/
        // console.log("Original URL" + req.originalUrl);
        if (!req.originalUrl.endsWith('/')) {
            // console.log(`Redirecting to ${publicURL}docs/`);
            let redirectPath = `docs/`;
            return res.redirect(301, redirectPath);
        }
        // If slash exists, proceed to Swagger
        next();
    }, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    app.listen(PORT, () => {
        //console.log(`Server running on port ${PORT}`);
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Connect to the database and then start the server
connectDB().then(async () => {
    await seedDataBase();
    await seedCharts();
    startServer();
});
