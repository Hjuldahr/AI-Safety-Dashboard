# Students Guide

This guide is written for students inheriting this project who need to understand how it works under the hood. It covers the architectural patterns and technologies that power the AI Safety Dashboard, with explanations tied to the actual files in this codebase. If you're already comfortable with MVC, MongoDB, SSE, Chart.js, and Puppeteer, you probably don't need this — the [documentation folder](documentation/) has more technical reference material. This guide is for everyone else.

> **Prerequisites**: You should know basic JavaScript, HTML/CSS, and have Node.js and MongoDB installed. See the [README](README.md) for setup instructions.

---

## Table of Contents

1. [MVC & Router Architecture](#1-mvc--router-architecture)
2. [MongoDB & Mongoose](#2-mongodb--mongoose)
3. [Server-Sent Events (Real-Time Data)](#3-server-sent-events-real-time-data)
4. [Chart.js Chart Rendering](#4-chartjs-chart-rendering)
5. [PDF Generation with Puppeteer](#5-pdf-generation-with-puppeteer)
6. [Quick Reference: Where Things Live](#6-quick-reference-where-things-live)

---

## 1. MVC & Router Architecture

### What is MVC?

MVC stands for **Model-View-Controller**. It's a way of organizing code so that different concerns are separated into their own files:

- **Model** — Defines the shape of data and how to interact with the database. _"What does an Alert look like? How do I save one?"_
- **View** — The HTML templates that the user sees. _"What does the Alerts page look like?"_
- **Controller** — The logic that connects models and views. It receives a request, fetches or modifies data using models, and sends a response (either a rendered page or JSON). _"When someone visits /alerts, what data do I need and which template do I render?"_

### How it works in this project

When a user visits a page, the request flows through several layers:

```
Browser Request: GET /alerts
       |
       v
  app.js  (Express app — sets up middleware, mounts the main router)
       |
       v
  routers/router.js  (main router — delegates to sub-routers by path)
       |
       v
  routers/alertRouter.js  (handles all /alerts/* routes)
       |
       v
  middleware/authMiddleware.js  (checks if user is logged in)
  middleware/authorization.js   (checks if user has the right permission)
       |
       v
  controllers/alertController.js  (fetches alert data from database)
       |
       v
  models/alert_model.js  (Mongoose schema — queries MongoDB)
       |
       v
  views/alerts.ejs  (EJS template — renders the HTML page)
       |
       v
  Browser receives the rendered HTML
```

### The entry point: `app.js`

This is where everything starts. Open `app.js` and you'll see it:

1. Creates an Express application
2. Sets up middleware (JSON parsing, sessions, authentication)
3. Serves static files from the `public/` folder (CSS, JS, images)
4. Mounts the main router

The key line is where it mounts the router — after that, Express hands every incoming request off to the router system.

### Routers: The traffic directors

Open `routers/router.js`. This is the **main router** that mounts all the sub-routers:

- `/alerts` requests go to `alertRouter.js`
- `/logs` requests go to `logRouter.js`
- `/reports` requests go to `reportRouter.js`
- `/admin` requests go to `adminRouter.js`
- etc.

Each sub-router defines the specific routes for its section. For example, in `routers/alertRouter.js`:

```javascript
// When someone visits /alerts in their browser:
router.get('/', isAuthenticated, authorize('view:alerts'), controller.getPage);

// When the frontend JS calls the API to create a new alert:
router.post('/', isAuthenticated, authorize('create:alert'), controller.createAlert);
```

Notice the middleware chain: `isAuthenticated` runs first (redirects to login if not logged in), then `authorize('view:alerts')` checks the user's role has that permission, and only then does the controller function run.

### Controllers: The brain

Controllers live in `controllers/`. Each one handles the logic for a section of the app. For example, `alertController.js` has functions like:

- `getPage()` — Fetches all alerts from the database, then renders the `alerts.ejs` template with that data
- `createAlert()` — Validates the request body, creates a new Alert document in MongoDB, and returns JSON
- `getAlertHistory()` — Builds a filtered/paginated query and returns alert logs as JSON

A typical controller function looks like:

```javascript
export const getPage = async (req, res) => {
    // 1. Get data from the database (using Models)
    const alerts = await Alert.find();

    // 2. Render a template (View), passing the data in
    res.render('alerts', { alerts, user: req.user });
};
```

### Views: The templates

Views live in `views/` and use **EJS** (Embedded JavaScript) — it's basically HTML with `<%= %>` tags that let you insert dynamic data. For example:

```html
<h2>Welcome, <%= user.username %></h2>

<% alerts.forEach(alert => { %>
    <div class="alert-card">
        <h3><%= alert.alertName %></h3>
    </div>
<% }) %>
```

Reusable parts (header, nav, modals) live in `views/components/` and get included with `<%- include('components/header') %>`.

### Middleware: The gatekeepers

Middleware functions run before the controller on every request. The two most important ones:

- **`middleware/authMiddleware.js`** (`isAuthenticated`) — Checks if the user is logged in. If not, redirects to `/login`.
- **`middleware/authorization.js`** (`authorize('permission')`) — Checks if the logged-in user's role includes a specific permission (like `view:alerts` or `manage:users`). If not, returns a 403 error.

Permissions are defined in `constants/permissions.js` and assigned to roles in the database.

### Adding a new page (example walkthrough)

If you needed to add a new page at `/analytics`, you would:

1. Create `models/Analytics.js` (if you need a new data type)
2. Create `controllers/analyticsController.js` with your page logic
3. Create `routers/analyticsRouter.js` to define your routes
4. Mount it in `routers/router.js`: `router.use('/analytics', analyticsRouter)`
5. Create `views/analytics.ejs` for the HTML template
6. Add a nav link in `views/components/nav.ejs`

---

## 2. MongoDB & Mongoose

### What is MongoDB?

MongoDB is a **document database** — instead of tables with rows and columns (like SQL), it stores data as JSON-like documents in collections. A document looks like:

```json
{
    "_id": "abc123",
    "alertName": "High Token Usage",
    "alertLevel": "Critical",
    "disabled": false
}
```

### What is Mongoose?

Mongoose is a library that sits between your Node.js code and MongoDB. It lets you:

- **Define schemas** — What fields a document should have, what types they are, and what's required
- **Validate data** — Automatically reject documents that don't match the schema
- **Query the database** — Find, create, update, and delete documents with a clean API

### How this project uses it

#### Database connection

The connection is set up in `config/database.js`. It reads the MongoDB URL from the `.env` file and connects when the app starts. It also **seeds** default data (admin user, default roles, default charts) if they don't exist yet.

#### Schemas and Models

Every data type has a model file in `models/`. Here's a simplified example from `models/alert_model.js`:

```javascript
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
    alertName:  { type: String, required: true },
    alertLevel: { type: String, enum: ['Critical', 'High', 'Medium', 'Info'] },
    alertRule:  { type: Object },
    disabled:   { type: Boolean, default: false },
    muted:      { type: Boolean, default: false },
    tags:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }]
});

export default mongoose.model('Alert', alertSchema);
```

Key concepts:

- **`type`** — The data type (`String`, `Number`, `Boolean`, `Date`, `Object`, `[Array]`)
- **`required: true`** — The document can't be saved without this field
- **`enum: [...]`** — Only these specific values are allowed
- **`default: false`** — If not provided, defaults to this value
- **`ref: 'Tag'`** — This is a reference (like a foreign key) to another collection. Mongoose can automatically load the referenced document with `.populate('tags')`

#### Common operations you'll see in the codebase

```javascript
// Find all alerts
const alerts = await Alert.find();

// Find one by ID
const alert = await Alert.findById(id);

// Find with filters
const criticalAlerts = await Alert.find({ alertLevel: 'Critical', disabled: false });

// Create a new document
const newAlert = await Alert.create({ alertName: 'My Alert', alertLevel: 'High' });

// Update a document
await Alert.findByIdAndUpdate(id, { disabled: true });

// Delete a document
await Alert.deleteOne({ _id: id });

// .lean() — Returns plain JS objects instead of Mongoose documents (faster for read-only)
const alerts = await Alert.find().lean();

// .populate() — Replaces ObjectId references with the actual referenced documents
const alertLog = await AlertLog.findById(id).populate('alert').populate('tags');
```

#### Static methods

Some models define custom query methods. For example, `models/AI_Log.js` has:

- `AI_Log.addLogs(logsArray)` — Bulk insert multiple logs
- `AI_Log.generateSixtySecondSummary()` — Runs a MongoDB aggregation pipeline to average the last 60 seconds of logs per model

These are defined on the schema with `schema.statics.methodName = function() { ... }`.

#### Key models to know

| Model | File | What it stores |
|-------|------|----------------|
| `AI_Log` | `models/AI_Log.js` | Raw AI metrics, 1 document per second per model |
| `AI_Summary` | `models/AI_Summary.js` | Averaged metrics, 1 document per minute per model |
| `Alert` | `models/alert_model.js` | Alert rule definitions (what to watch for) |
| `AlertLog` | `models/alert_log.js` | Records of when alerts fired |
| `User` | `models/user.js` | User accounts (username, email, hashed password, roles) |
| `Chart_Config` | `models/Chart_Config.js` | Dashboard chart configurations |
| `SystemSetting` | `models/SystemSetting.js` | Key-value system settings (log retention, default theme) |

---

## 3. Server-Sent Events (Real-Time Data)

### The problem

The dashboard shows live AI metrics that update every second. Without real-time updates, the browser would have to keep refreshing or polling the server ("do you have new data yet? how about now?"). That's wasteful.

### What are Server-Sent Events (SSE)?

SSE is a browser API that lets the server **push** data to the browser over a persistent HTTP connection. Unlike WebSockets (which are bidirectional), SSE is one-way: server → browser. That's all we need here — the server generates new AI data every second and pushes it to all connected browsers.

### How data flows in this project

```
Every 1 second:
  scheduler.js generates simulated AI data for each model
       |
       v
  Data is saved to MongoDB (AI_Log collection)
       |
       v
  broadcastEvent('update', data) sends it to all connected browsers
       |
       v
  Browser's EventSource receives the data
       |
       v
  chartDataManager.js merges it into in-memory logs
       |
       v
  Charts re-render with the new data point
```

### Server side: `server_side_events/scheduler.js`

This is the heart of the real-time system. It does three things:

**1. Manages SSE client connections**

When a browser connects to `GET /events`, the `setupSSE()` function:
- Sets the response headers for SSE (`Content-Type: text/event-stream`)
- Adds the client to an `activeClients` array
- Starts a heartbeat (empty comment sent every 30 seconds to keep the connection alive)
- Removes the client when they disconnect

**2. Runs the scheduler tick (every 1 second)**

The `schedulerTick()` function:
- Generates simulated AI data using `AIAnalyzer` (in `data_analysis_pipeline/`)
- Evaluates alert rules against the new data
- Saves the logs to MongoDB
- Broadcasts the data to all SSE clients

**3. Creates summaries (every 60 seconds)**

The `createSummary()` function:
- Averages the last 60 seconds of AI_Log documents into AI_Summary documents
- Deletes AI_Logs older than the retention cutoff
- Broadcasts a `'summary'` event to clients

**Broadcasting data:**

```javascript
function broadcastEvent(eventType, data) {
    // Format as SSE protocol: "event: update\ndata: {...}\n\n"
    const sseData = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    // Send to every connected client
    for (const client of activeClients) {
        client.res.write(sseData);
    }
}
```

### Client side: `public/js/sseManager.js`

This file creates a shared SSE connection. It uses a **SharedWorker** so that if you have multiple tabs open, they all share one connection instead of each opening their own.

Usage in other client-side files:

```javascript
const evtSource = window.__sseManager.getSharedEventSource();

evtSource.addEventListener('update', (event) => {
    const data = JSON.parse(event.data);
    // data contains the latest AI metrics for all models
});
```

### Event types the server sends

| Event | When | Data |
|-------|------|------|
| `update` | Every 1 second | Latest AI_Log data for all models |
| `summary` | Every 60 seconds | Averaged AI_Summary documents |
| `alert` | When an alert fires | Alert details and severity |
| `notification` | Various | User-facing notification messages |
| `user_log_update` | On user actions | Audit log entries (login, settings change, etc.) |

### How `chartDataManager.js` processes updates

When an `update` event arrives, the chart data manager:

1. Parses the JSON data
2. Figures out which time bucket it belongs to (e.g., for a 10-second chart, the bucket is `Math.floor(timestamp / 10000) * 10000`)
3. If a bucket already exists for that time: merges the new data in (weighted average for avg fields, sum for count fields)
4. If it's a new bucket: adds it and drops the oldest bucket if over the limit
5. Triggers a re-render of affected charts

This is done using `requestAnimationFrame()` to batch multiple updates and avoid unnecessary re-renders.

---

## 4. Chart.js Chart Rendering

### What is Chart.js?

Chart.js is a JavaScript library for rendering charts (line, bar, pie, etc.) on HTML `<canvas>` elements. You give it data and configuration, and it draws the chart.

### How charts work in this project

Charts are **configurable** — users with admin permissions can add, remove, resize, reorder, and edit charts from the dashboard. Each chart's configuration is stored in the database.

#### Chart configuration: `models/Chart_Config.js`

Each chart is defined by:

```javascript
{
    title: "Response Time",           // Display title
    chartType: "line",                // 'line', 'bar', 'pie', or 'measure'
    chartSize: "regular",             // 'tiny', 'regular', 'large', 'massive'
    chartTimeRange: "1min",           // How far back to show data
    yAxis: "responseTime",            // Which data field to plot
    splitBy: "modelName",             // Split into multiple lines/bars by this field
    order: 0                          // Position on dashboard
}
```

#### The data dictionary: `constants/charts.js`

This file maps field keys (like `responseTime`) to their metadata:

```javascript
export const DATA_DICTIONARY = {
    responseTime: {
        label: 'Response Time (ms)',
        dbPath: 'responseTime',        // Path in the MongoDB document
        dataType: 'numeric',
        summarize: 'avg',              // How to aggregate: 'avg' or 'sum'
        color: '#1f77b4'
    },
    modelName: {
        label: 'Model',
        dbPath: 'modelName',
        dataType: 'categorical'
    }
};
```

It also defines `TIMEFRAME_CONFIG` — how many data points to show for each time range, what bucket size to use, and whether to read from AI_Log (high fidelity) or AI_Summary (low fidelity).

#### Rendering: `public/js/charts/chartRenderer.js`

This file creates Chart.js instances and maps data into the format Chart.js expects. The key functions:

- **`createChartFromConfig(config, canvasContext)`** — Creates a new Chart.js instance with the right options for the chart type
- **`mapLineData(logs, config)`** — Transforms raw log arrays into `{ labels: [timestamps], datasets: [{ data: [values] }] }` format for line charts
- **`mapBarData(logs, config)`** — Groups data by category for bar charts
- **`mapPieData(logs, config)`** — Calculates proportions for pie/doughnut charts
- **`mapMeasureData(logs, config)`** — Extracts a single KPI value for measure cards

#### Data management: `public/js/charts/chartDataManager.js`

This is the orchestrator. It:

1. **On page load**: Fetches chart configs and initial log data from the server via `GET /api/charts/recent-data`
2. **Builds the DOM**: Creates card elements for each chart, with edit/delete buttons for admins
3. **Creates Chart.js instances**: One per config, stored in `window.DashboardApp.charts`
4. **Listens for SSE updates**: Merges new data into the in-memory log store and re-renders affected charts
5. **Handles drag-and-drop**: Uses Sortable.js to let admins reorder charts, then saves the new order to the database

#### Chart admin: `public/js/charts/chartAdmin.js`

Handles the UI for creating and editing charts — the modal form where you pick chart type, data field, time range, etc.

#### Updating a chart with new data (simplified flow)

```
SSE 'update' event arrives with new AI log data
    |
    v
chartDataManager.processPendingUpdates()
    |  For each timeframe the dashboard is using:
    |    - Calculate bucket timestamp
    |    - Merge into existing bucket OR create new bucket
    v
callChartRenderer(chartId)
    |  - Gets the Chart.js instance
    |  - Gets the config (type, yAxis, splitBy, etc.)
    |  - Gets the logs for this chart's timeframe
    |  - Calls the right mapper (mapLineData, mapBarData, etc.)
    v
chart.data = mappedData;
chart.update();  // Chart.js re-draws the canvas
```

---

## 5. PDF Generation with Puppeteer

### What is Puppeteer?

Puppeteer is a library that controls a headless (invisible) Chrome browser. This project uses it to generate PDF reports — it renders an HTML page in the headless browser, then tells Chrome to "print" it as a PDF.

### Why use a browser to make PDFs?

Because the reports contain charts (rendered by Chart.js) and complex layouts. Instead of using a PDF library that can't handle CSS and JavaScript, Puppeteer renders the full page exactly as a browser would, then exports it. The charts are pre-rendered as PNG images (base64-encoded) and embedded in the HTML, so the PDF looks identical to what you'd see on screen.

### The report generation flow

The entire flow lives in `controllers/reportController.js`:

```
User fills out the report form (model, date range, fields)
    |
    v
1. GATHER STATS — getAggregatedStats()
    |  - Runs MongoDB aggregation: min, max, avg for each selected field
    |  - Finds the actual log documents that had the min/max values
    |  - Checks if those min/max logs triggered any alerts
    |
    v
2. GATHER TIME SERIES — getTimeSeriesData()
    |  - Buckets log data into evenly-spaced time intervals
    |  - Returns arrays of { timestamp, field1Value, field2Value, ... }
    |
    v
3. GENERATE CHART IMAGES — generateChartImage()
    |  - For each field, creates a Chart.js line chart config
    |  - Uses chartjs-node-canvas to render the chart to a PNG
    |  - Returns base64-encoded image strings (data:image/png;base64,...)
    |
    v
4. GATHER APPENDIX DATA — getAppendixData()
    |  - Fetches flagged outputs, raw logs, summaries, user logs, alert logs
    |  - Based on which appendix sections the user selected
    |
    v
5. RENDER HTML — ejs.renderFile('views/reportTemplate.ejs', allTheData)
    |  - EJS template receives stats, chart images, appendix data
    |  - Produces a complete HTML string with embedded base64 images
    |
    v
6. RENDER PDF — renderPdfFromTemplate()
    |  - Launches headless Chrome via Puppeteer
    |  - Sets the page content to the rendered HTML
    |  - Waits for all images to load (waitUntil: 'networkidle0')
    |  - Calls page.pdf() to generate the PDF buffer
    |  - Closes the browser
    |
    v
7. SAVE & SEND
    - Saves PDF to disk at storage/reports/{id}.pdf
    - Creates a ReportRecord in the database
    - Sends the PDF buffer directly to the browser for download
```

### Key function: `renderPdfFromTemplate()`

```javascript
const renderPdfFromTemplate = async (templateName, templateData) => {
    // Render EJS template to HTML string
    const html = await ejs.renderFile(templatePath, templateData);

    // Launch headless Chrome
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']  // Required for Docker
    });

    // Load the HTML into a browser page
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate the PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,   // Include background colors
        margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
    });

    await browser.close();
    return pdfBuffer;
};
```

### Important details

- **`waitUntil: 'networkidle0'`** — This tells Puppeteer to wait until there are zero network requests for 500ms. Since all images are base64-encoded inline, this mainly ensures the HTML is fully parsed.
- **`printBackground: true`** — Without this, chart backgrounds would be white even if they have colored fills.
- **Docker considerations** — The `--no-sandbox` flag is needed when running in Docker. The `PUPPETEER_EXECUTABLE_PATH` env var lets you point to a custom Chrome installation.
- **Chart images are server-rendered** — Unlike the dashboard (where Chart.js runs in the browser), report charts are rendered on the server using `chartjs-node-canvas`. This means they don't need a browser to be displayed — they're just PNG images embedded in the HTML.

### Report storage

Generated PDFs are stored as files in `storage/reports/` with the filename `{reportRecordId}.pdf`. The `ReportRecord` model in `models/ReportRecord.js` tracks metadata (title, date range, fields, creation date) so users can view and re-download past reports from the history page.

---

## 6. Quick Reference: Where Things Live

### Directory structure at a glance

```
project root/
|-- app.js                  # Express entry point
|-- routers/                # Route definitions (URL -> controller mapping)
|-- controllers/            # Request handling logic
|-- models/                 # MongoDB schemas and data access
|-- views/                  # EJS templates (HTML pages)
|   |-- components/         # Reusable template parts (header, nav, modal)
|-- middleware/             # Auth checks, permission gates
|-- public/                 # Static files served to the browser
|   |-- css/
|   |   |-- themes/         # Color theme files (light + dark mode variables)
|   |   |-- layouts/        # Layout CSS (default, compact)
|   |   |-- pages/          # Page-specific styles
|   |   |-- components/     # Reusable component styles
|   |-- js/
|       |-- charts/         # Chart rendering and data management
|       |-- components/     # Modal and UI component controllers
|-- server_side_events/     # SSE scheduler, alert evaluation
|-- models/                 # Mongoose schemas
|-- config/                 # Database connection, auth setup, seed data
|-- constants/              # Shared constants (permissions, chart config, etc.)
|-- helpers/                # Utility functions
|-- documentation/          # Docsify markdown docs + OpenAPI spec
|-- tests/
|   |-- unit/               # Jest unit tests
|   |-- e2e/                # Playwright end-to-end tests
|-- storage/reports/        # Generated PDF reports
```

### Key files by feature

| Feature | Key Files |
|---------|-----------|
| **Authentication** | `middleware/authMiddleware.js`, `config/passport-config.js`, `controllers/authController.js` |
| **Permissions** | `middleware/authorization.js`, `constants/permissions.js`, `models/role.js` |
| **Dashboard charts** | `public/js/charts/chartDataManager.js`, `public/js/charts/chartRenderer.js`, `models/Chart_Config.js`, `controllers/chartController.js` |
| **Real-time updates** | `server_side_events/scheduler.js`, `public/js/sseManager.js` |
| **Alerts** | `controllers/alertController.js`, `models/alert_model.js`, `server_side_events/alertEvaluator.js` |
| **AI Logs** | `controllers/logController.js`, `models/AI_Log.js`, `models/AI_Summary.js` |
| **Reports / PDF** | `controllers/reportController.js`, `views/reportTemplate.ejs`, `models/ReportRecord.js` |
| **User management** | `controllers/adminController.js`, `views/admin/users.ejs`, `public/js/adminUsers.js` |
| **Theming / Dark mode** | `public/css/themes/colors-default.css`, `public/js/themeManager.js`, `views/components/header.ejs` |
| **Data simulation** | `data_analysis_pipeline/AIAnalyzer.js`, `constants/sse.js` |

### Team & project context

This project was developed for CST8414 / CST8515 (Applied Research Project) at Algonquin College by Daniel Bierman, Michael Dagher, Nicholas Jacques, and Robert Ohly. If you need to contact the original team or have questions about design decisions, commit history (`git log`) and the [documentation folder](documentation/) are your best starting points.
