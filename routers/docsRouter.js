import express from "express";
import path from "path";
import { fileURLToPath } from 'url';
import swaggerUi from "swagger-ui-express";
import YAML from 'yamljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const swaggerDocument = YAML.load(path.join(__dirname, '../documentation/openapi.yml'));

// Serve the Docsify Docs at /docs
router.use("/docs/", express.static('documentation'));

// Serve the Swagger API documentation at /api/docs
router.use("/api/docs/", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
