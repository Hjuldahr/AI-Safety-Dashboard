// A map of data fields, their types, and human-readable labels
// (Provided by you, used for generating chart labels)
const DATA_FIELDS = {
    // Categorical
    modelName: {
        type: 'CATEGORICAL',
        label: 'Model Name'
    },
    // topic: { type: 'CATEGORICAL', label: 'Topic' },

    // Numeric
    responseTime: {
        type: 'NUMERIC',
        label: 'Response Time (ms)',
        suffix: 'ms'
    },
    energyConsumption: {
        type: 'NUMERIC',
        label: 'Energy Consumption',
        suffix: 'W'
    },
    responseHelpfulness: {
        type: 'NUMERIC',
        label: 'Response Helpfulness (1-5)'
    },
    policyCompliance: {
        type: 'NUMERIC',
        label: 'Policy Compliance (0 through 100%)',
        suffix: '%'
    },
    // toxicityScore: { 
    //     type: 'NUMERIC', 
    //     label: 'Toxicity Score (0-1)', 
    // },

    // Special: Numeric fields that can ALSO be treated as categories
    // piiDetected: { 
    //     type: 'NUMERIC', 
    //     label: 'PII Detected (0 through 100%)', 
    //     useAs: ['CATEGORICAL', 'NUMERIC'],
    //     suffix: '%'
    // },

    // Timestamp
    responseTimestamp: {
        type: 'TIMESTAMP',
        label: 'Timestamp'
    }
};

// --- Constants & Global State ---

// IDs for the static (hardcoded) charts
const STATIC_CHART_IDS = [
    'responseTimeChart',
    'energyConsumptionChart',
    'complianceChart',
    'helpfulnessChart'
];

// Re-usable color utilities
const Utils = {
    CHART_COLORS: {
        coral: 'rgb(244, 91, 105)',
        blue: 'rgb(0, 122, 204)',
        teal: 'rgb(44, 165, 141)',
        amber: 'rgb(255, 179, 0)',
        purple: 'rgb(142, 68, 173)',
        green: 'rgb(40, 167, 69)',
        red: 'rgb(220, 53, 69)',
        yellow: 'rgb(255, 193, 7)',
        cyan: 'rgb(23, 162, 184)',
        orange: 'rgb(253, 126, 20)',
    },
    transparentize(color, opacity) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    },
    /**
     * Gets a color from the CHART_COLORS palette by index, wrapping around.
     * @param {number} index - The index of the color.
     * @returns {string} A CSS rgb color string.
     */
    getColor(index) {
        const colors = Object.values(this.CHART_COLORS);
        return colors[index % colors.length];
    }
};

// Maximum data points to show on STATIC line charts
const CACHE_MAX_POINTS = 15;
// Maximum log entries to keep in our global client-side cache
const MAX_LOGS = 15;

// State management
let allLogs = []; // Single source of truth for log data
const staticCharts = {}; // Stores hardcoded chart instances
const dynamicCharts = {}; // Stores config-driven chart instances { id: { instance, config } }
let sseSource = null; // Holds the EventSource connection

// --- Utility Functions ---

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

/**
 * Injects the static chart canvases into the DOM.
 */
function initStaticChartCanvases() {
    const container = document.getElementById('static-charts-container');
    if (!container) {
        console.error('Missing required DOM element: #static-charts-container');
        return;
    }
    container.innerHTML = STATIC_CHART_IDS.map(id => `
        <div class="chart-card">
            <canvas id="${id}" width="400" height="300"></canvas>
        </div>
    `).join('');
}

/**
 * Creates and injects the DOM elements for a new dynamic chart.
 * @param {object} config - The Chart_Config object from the database.
 */
function createDynamicChartDOM(config) {
    const container = document.getElementById('dynamic-charts-container');
    if (!container) {
        console.error('Missing required DOM element: #dynamic-charts-container');
        return;
    }

    // Use config._id as the element ID
    const chartId = config._id;

    const card = document.createElement('div');
    card.className = 'chart-card';
    // Add a data attribute to easily find it later for removal
    card.setAttribute('data-chart-id', chartId);

    // Add title
    const title = document.createElement('h5');
    title.className = 'chart-title'; // You can style this class
    title.textContent = config.title;
    card.appendChild(title);

    // Add canvas
    const canvas = document.createElement('canvas');
    canvas.id = chartId;
    canvas.width = 400;
    canvas.height = 300;
    card.appendChild(canvas);

    container.appendChild(card);
}

/**
 * Destroys a dynamic chart instance and removes it from the DOM.
 * @param {string} configId - The _id of the chart config to remove.
 */
function destroyDynamicChart(configId) {
    if (dynamicCharts[configId]) {
        // Destroy the Chart.js instance
        dynamicCharts[configId].instance.destroy();

        // Remove from our state
        delete dynamicCharts[configId];

        // Remove from DOM
        const card = document.querySelector(`[data-chart-id="${configId}"]`);
        if (card) {
            card.remove();
        }
    }
}

/**
 * Clears all existing dynamic charts.
 */
function clearDynamicCharts() {
    for (const id of Object.keys(dynamicCharts)) {
        destroyDynamicChart(id);
    }
}

// --- Chart Factory Functions (Static) ---

function createStaticLineChart(ctx, label, color, yOptions = {}) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ label, data: [], borderColor: color, backgroundColor: Utils.transparentize(color, 0.5), fill: true, tension: 0.3 }]
        },
        options: { responsive: false, maintainAspectRatio: false, scales: { y: yOptions }, plugins: { legend: { display: true } }, devicePixelRatio: 3 }
    });
}

function createStaticDoughnutChart(ctx, label, colors) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Compliant', 'Non-Compliant'], datasets: [{ label, data: [0, 100], backgroundColor: colors, hoverOffset: 4 }] },
        options: { responsive: false, maintainAspectRatio: false, devicePixelRatio: 3 }
    });
}

// --- Core Data Processing (Dynamic) ---

/**
 * This is the core logic. It transforms logs into a Chart.js data object
 * based on the user's configuration.
 * @param {object} config - The Chart_Config object.
 * @param {Array} logs - The array of AI_Log objects.
 * @returns {object} A Chart.js compatible data object { labels, datasets }.
 */
function generateChartData(config, logs) {
    const { chartType, xAxis, yAxis, category, splitBy } = config;

    // Use the latest log if no logs are provided (for 'measure' type)
    if (logs.length === 0 && chartType !== 'measure') {
        return { labels: [], datasets: [] };
    }

    const data = {
        labels: [],
        datasets: []
    };

    // For Line charts, the X-axis is *always* time, based on controlPanel.js
    const hardcodedXAxis = 'responseTimestamp';

    // --- Type 1: Line Chart (Numeric Y vs. Time X) ---
    // From controlPanel.js: chartType='line', has yAxis, no splitBy.
    if (chartType === 'line' && yAxis && !splitBy) {
        // FIX: Hardcoded to 'responseTimestamp' as you noted.
        data.labels = logs.map(log => new Date(log[hardcodedXAxis]).toLocaleTimeString());
        const datasetData = logs.map(log => log[yAxis]);

        data.datasets.push({
            label: DATA_FIELDS[yAxis]?.label || yAxis,
            data: datasetData,
            borderColor: Utils.getColor(0),
            backgroundColor: Utils.transparentize(Utils.getColor(0), 0.5),
            fill: true,
            tension: 0.3
        });
    }

    // --- Type 2: Split Line Chart (Numeric Y vs. Time X, by Category) ---
    // From controlPanel.js: chartType='line', has yAxis, has splitBy.
    else if (chartType === 'line' && yAxis && splitBy) {
        // FIX: Hardcoded to 'responseTimestamp' as you noted.
        data.labels = logs.map(log => new Date(log[hardcodedXAxis]).toLocaleTimeString());

        // Find all unique categories to split by (e.g., ['good', 'bad'])
        const categories = [...new Set(logs.map(log => log[splitBy]))];

        categories.forEach((cat, index) => {
            const datasetData = logs.map(log => log[splitBy] === cat ? log[yAxis] : null); // Use null for missing data points
            data.datasets.push({
                label: cat,
                data: datasetData,
                borderColor: Utils.getColor(index),
                backgroundColor: Utils.transparentize(Utils.getColor(index), 0.5),
                fill: false, // 'fill: true' can look messy with multiple lines
                tension: 0.3
            });
        });
    }

    // --- Type 3: Bar Chart (Aggregated Numeric Y vs. Categorical X) ---
    // From controlPanel.js: chartType='bar', has yAxis, has xAxis.
    // **This is the fix for your error.**
    else if (chartType === 'bar' && yAxis && xAxis) {
        // Group logs by the categorical xAxis
        const groups = {};
        for (const log of logs) {
            // FIX: Use xAxis as the category key, not 'category'
            const cat = log[xAxis];
            if (!groups[cat]) {
                groups[cat] = { total: 0, count: 0 };
            }
            groups[cat].total += log[yAxis];
            groups[cat].count += 1;
        }

        // Calculate averages
        data.labels = Object.keys(groups);
        const datasetData = data.labels.map(cat => groups[cat].total / groups[cat].count);

        data.datasets.push({
            label: `Avg. ${DATA_FIELDS[yAxis]?.label || yAxis}`,
            data: datasetData,
            backgroundColor: data.labels.map((_, index) => Utils.transparentize(Utils.getColor(index), 0.7)),
            borderColor: data.labels.map((_, index) => Utils.getColor(index)),
            borderWidth: 1
        });
    }

    // --- Type 4: Pie Chart (Count by Category) ---
    // From controlPanel.js: chartType='pie', has category.
    else if (chartType === 'pie' && category) {
        // Group logs by category and *count* them
        const groups = {};
        for (const log of logs) {
            const cat = log[category];
            groups[cat] = (groups[cat] || 0) + 1; // Just count occurrences
        }

        data.labels = Object.keys(groups);
        const datasetData = Object.values(groups);

        data.datasets.push({
            label: DATA_FIELDS[category]?.label || category,
            data: datasetData,
            backgroundColor: data.labels.map((_, index) => Utils.getColor(index)),
            hoverOffset: 4
        });
    }

    // --- Type 5: "Measure" (KPI) - Single Numeric Value ---
    // From controlPanel.js: chartType='measure', has yAxis.
    else if (chartType === 'measure' && yAxis) {
        const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
        const value = latestLog ? latestLog[yAxis] : 0;

        // Get the config from DATA_FIELDS
        const fieldConfig = DATA_FIELDS[yAxis];
        const suffix = fieldConfig?.suffix || '';

        // Store the raw value and suffix for our plugin to read
        data.rawValue = value;
        data.suffix = suffix;
        data.labels = [fieldConfig?.label || yAxis, 'Remaining'];

        if (suffix === '%') {
            // It's a percentage, so show the gauge
            data.datasets.push({
                label: fieldConfig?.label || yAxis,
                data: [value, 100 - value], // e.g., [95, 5]
                backgroundColor: [Utils.getColor(2), Utils.transparentize(Utils.getColor(7), 0.2)],
                hoverOffset: 4
            });
        } else {
            // It's not a percentage, so hide the gauge
            data.datasets.push({
                label: fieldConfig?.label || yAxis,
                data: [1, 0], // Dummy data
                // Make it completely invisible
                backgroundColor: ['transparent', 'transparent'],
                borderColor: 'transparent',
                hoverOffset: 0
            });
        }
    }

    // --- Fallback ---
    else {
        console.warn('Could not generate chart data for config:', config);
    }

    return data;
}

/**
 * Creates a new Chart.js instance from a config object and log data.
 * @param {object} config - The Chart_Config object.
 * @param {Array} logs - The array of AI_Log objects.
 * @returns {Chart} A new Chart.js instance.
 */
function createChartFromConfig(config, logs) {
    const ctx = document.getElementById(config._id).getContext('2d');
    const chartData = generateChartData(config, logs);

    // Default options
    const options = {
        responsive: false,
        maintainAspectRatio: false,
        devicePixelRatio: 3,
        plugins: {
            legend: {
                display: true
            },
            title: {
                display: false, // We added a separate <h5> title
                // text: config.title // You could use this instead
            }
        }
    };

    let chartType = config.chartType;

    // Handle our custom 'measure' type
    if (chartType === 'measure') {
        chartType = 'doughnut'; // Implement 'measure' as a doughnut chart
        options.circumference = 180; // Make it a semicircle
        options.rotation = 270;
        options.plugins.legend.display = false;
    }

    if (chartType === 'pie') {
        options.plugins.legend.display = true;
    }

    if (chartType === 'line' || chartType === 'bar') {
        options.scales = {
            y: { beginAtZero: true }
        };
    }

    const chart =  new Chart(ctx, {
        type: chartType,
        data: chartData.data,
        options: options
    });

    chart.data.rawValue = chartData.rawValue;
    chart.data.suffix = chartData.suffix;

    return chart;
}

// --- Chart Update Functions ---

/**
 * Updates a static line chart with new data.
 * @param {Chart} chart - The Chart.js instance.
 * @param {object} newLog - The new log object from SSE.
 * @param {string} dataKey - The key in the log to get data from (e.g., 'responseTime').
 */
function updateStaticLineChart(chart, newLog, dataKey) {
    const now = new Date(newLog.responseTimestamp).toLocaleTimeString();

    chart.data.labels.push(now);
    chart.data.datasets[0].data.push(newLog[dataKey]);

    if (chart.data.labels.length > CACHE_MAX_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update("none");
}

/**
 * Updates a static doughnut chart with new data.
 * @param {Chart} chart - The Chart.js instance.
 * @param {object} newLog - The new log object from SSE.
 * @param {string} dataKey - The key in the log to get data from (e.g., 'policyCompliance').
 */
function updateStaticDoughnutChart(chart, newLog, dataKey) {
    const value = newLog[dataKey];
    chart.data.datasets[0].data = [value, 100 - value];
    chart.update("none");
}

/**
 * Updates a dynamic chart.
 * For simplicity and correctness (especially with aggregations),
 * this function regenerates the data from the full log cache.
 * @param {Chart} chart - The Chart.js instance.
 * @param {object} config - The config for this chart.
 * @param {Array} logs - The *entire* log cache.
 */
function updateDynamicChart(chart, config, logs) {
    // Optimization: For simple line-over-time charts, we can do an incremental update.
    if (config.chartType === 'line' && !config.splitBy) {
        const newLog = logs[logs.length - 1];
        const now = new Date(newLog.responseTimestamp).toLocaleTimeString();

        chart.data.labels.push(now);
        chart.data.datasets[0].data.push(newLog[config.yAxis]);

        // Use the same cache limit as static charts for consistency
        if (chart.data.labels.length > CACHE_MAX_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update("none");
    }
    // For all other chart types (aggregates, splits, measures),
    // it's safer and simpler to just regenerate the data.
    else {
        const chartData = generateChartData(config, logs);
        chart.data.labels = chartData.labels;
        chart.data.datasets = chartData.datasets;

        chart.data.rawValue = chartData.rawValue;
        chart.data.suffix = chartData.suffix;
        chart.update("none");
    }
}

// --- Data Loading and Initialization ---

/**
 * Resets *only* the static charts.
 * Dynamic charts are fully reloaded from the database.
 */
function resetCharts() {
    Object.values(staticCharts).forEach(chart => {
        if (chart.config.type === 'doughnut') {
            chart.data.datasets[0].data = [0, 0];
        } else {
            chart.data.labels = [];
            chart.data.datasets.forEach(ds => ds.data = []);
        }
        chart.update('none');
    });
}

/**
 * Fetches initial data and populates all charts.
 */
async function loadChartsFromDatabase() {
    try {
        const params = new URLSearchParams();
        const modelName = getCurrentModel();
        if (modelName && modelName !== 'all') {
            params.set('modelName', modelName);
        }
        const response = await fetch(`/api/recentData?${params.toString()}`);
        if (!response.ok) {
            console.error('Failed to fetch initial chart data');
            return;
        }

        const data = await response.json();

        // Store logs in global cache, ensuring max size
        allLogs = data.logs.slice(-MAX_LOGS);
        const configs = data.configs || [];

        console.log(`Loaded ${allLogs.length} logs and ${configs.length} chart configs.`);

        if (allLogs.length === 0) {
            console.log('No initial data to load.');
            // Still proceed to load configs, they will just be empty
        }

        // --- 2. Populate Dynamic Charts ---
        clearDynamicCharts(); // Clear any old charts first

        for (const config of configs) {
            try {
                // A. Create the DOM elements
                createDynamicChartDOM(config);
                // B. Create the Chart.js instance
                const chartInstance = createChartFromConfig(config, allLogs);
                // C. Store instance and config for live updates
                dynamicCharts[config._id] = {
                    instance: chartInstance,
                    config: config
                };
            } catch (err) {
                console.error(`Failed to create dynamic chart "${config.title}":`, err);
                // Remove any broken DOM elements
                const card = document.querySelector(`[data-chart-id="${config._id}"]`);
                if (card) card.remove();
            }
        }

        // --- 1. Populate Static Charts ---
        if (allLogs.length > 0) {
            const labels = allLogs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());

            // Response Time
            staticCharts.responseTimeChart.data.labels = labels;
            staticCharts.responseTimeChart.data.datasets[0].data = allLogs.map(log => log.responseTime);

            // Energy Consumption
            staticCharts.energyConsumptionChart.data.labels = labels;
            staticCharts.energyConsumptionChart.data.datasets[0].data = allLogs.map(log => log.energyConsumption);

            // Helpfulness
            staticCharts.helpfulnessChart.data.labels = labels;
            staticCharts.helpfulnessChart.data.datasets[0].data = allLogs.map(log => log.responseHelpfulness);

            // Compliance (from latest log)
            const latestLog = allLogs[allLogs.length - 1];
            staticCharts.complianceChart.data.datasets[0].data = [
                latestLog.policyCompliance,
                100 - latestLog.policyCompliance
            ];
        }
        // Update all static charts
        Object.values(staticCharts).forEach(chart => chart.update('none'));


    } catch (err) {
        console.error('Error in loadChartsFromDatabase:', err);
    }
}

/**
 * Initializes all static chart instances.
 */
async function initCharts() {
    // 1. Create static chart canvases
    initStaticChartCanvases();

    // 2. Create static chart instances
    staticCharts.responseTimeChart = createStaticLineChart(
        document.getElementById('responseTimeChart').getContext('2d'),
        'Average Response Time (ms)',
        Utils.CHART_COLORS.blue
    );
    staticCharts.energyConsumptionChart = createStaticLineChart(
        document.getElementById('energyConsumptionChart').getContext('2d'),
        'Average Energy Consumption (Wh)',
        Utils.CHART_COLORS.amber
    );
    staticCharts.complianceChart = createStaticDoughnutChart(
        document.getElementById('complianceChart').getContext('2d'),
        'Compliance',
        [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
    );
    staticCharts.helpfulnessChart = createStaticLineChart(
        document.getElementById('helpfulnessChart').getContext('2d'),
        'Average Helpfulness Score',
        Utils.CHART_COLORS.purple,
        { min: 1, max: 5 }
    );

    // 3. Load data from DB and create dynamic charts
    await loadChartsFromDatabase();
}

// --- SSE (Live Update) Functions ---

/**
 * Closes the existing SSE connection, if one exists.
 */
function disconnectSSE() {
    if (sseSource) {
        sseSource.close();
        sseSource = null;
        console.log('SSE connection closed.');
    }
}

/**
 * Handles live config update events from the server (e.g., CRUD ops).
 * @param {Event} event - The SSE 'config-update' event.
 */
function handleConfigUpdate(event) {
    console.log('Received config update:', event.data);
    try {
        const { action, config } = JSON.parse(event.data);

        switch (action) {
            case 'create':
                // A new chart config was added
                createDynamicChartDOM(config);
                const newInstance = createChartFromConfig(config, allLogs); // Create with current logs
                dynamicCharts[config._id] = { instance: newInstance, config: config };
                break;
            case 'update':
                // A chart config was changed
                destroyDynamicChart(config._id); // Destroy old one
                createDynamicChartDOM(config);   // Create new DOM
                const updatedInstance = createChartFromConfig(config, allLogs); // Re-create chart
                dynamicCharts[config._id] = { instance: updatedInstance, config: config };
                break;
            case 'delete':
                // A chart config was removed
                destroyDynamicChart(config._id); // Use the ID from the payload
                break;
            default:
                console.warn('Unknown config-update action:', action);
        }
    } catch (err) {
        console.error('Error handling config update:', err);
    }
}

/**
 * Establishes the SSE connection to receive live data.
 */
function setupSSE() {
    // Ensure only one connection is open
    disconnectSSE();

    sseSource = new EventSource('/events');
    console.log('SSE connection established.');

    // --- Listener for NEW LOGS ---
    sseSource.onmessage = (event) => {
        try {
            const newLog = JSON.parse(event.data);

            // Add to global cache and manage size
            allLogs.push(newLog);
            if (allLogs.length > MAX_LOGS) {
                allLogs.shift();
            }

            // --- 1. Update Static Charts ---
            updateStaticLineChart(staticCharts.responseTimeChart, newLog, 'responseTime');
            updateStaticLineChart(staticCharts.energyConsumptionChart, newLog, 'energyConsumption');
            updateStaticLineChart(staticCharts.helpfulnessChart, newLog, 'responseHelpfulness');
            updateStaticDoughnutChart(staticCharts.complianceChart, newLog, 'policyCompliance');

            // --- 2. Update Dynamic Charts ---
            for (const { instance, config } of Object.values(dynamicCharts)) {
                // Pass the *full* log array to the update function
                updateDynamicChart(instance, config, allLogs);
            }

        } catch (err) {
            console.error('Error processing SSE message:', err, event.data);
        }
    };

    // --- Listener for CONFIG CHANGES (Future-Proofing) ---
    sseSource.addEventListener('config-update', handleConfigUpdate);

    // --- Error Handling ---
    sseSource.onerror = (err) => {
        console.error('SSE error:', err);
        sseSource.close();
        // Optional: Attempt to reconnect after a delay
        // setTimeout(setupSSE, 5000);
    };
}

// --- Page Setup ---

// Expose reset function to global scope (if needed)
window.myChartUtils = {
    resetCharts
};

// I tried both versions both had the loading bug where they dont display the chart until the next sse comes in, even though the default charts can load.

// document.addEventListener('DOMContentLoaded', async () => {
//     // 1. Initialize all charts (static + dynamic)
//     await initCharts();

//     // 2. Start listening for live updates
//     setupSSE();

//     // 3. Add listener for the model selector
//     const modelSelect = document.getElementById('model-select');
//     modelSelect?.addEventListener('change', async () => {
//         // When model changes, we must reload all data
//         // 1. Reset static charts to empty
//         resetCharts();
//         // 2. Load all new data for the selected model
//         await loadChartsFromDatabase();
//         // 3. Re-establish SSE connection (which might have a model-specific endpoint,
//         //    or just ensures the new logs are handled correctly).
//         //    Even if /events isn't model-specific, reloading data
//         //    from the DB ensures the chart history is correct.
//         setupSSE();
//     });
// });

document.addEventListener('DOMContentLoaded', async () => {
    await initCharts();
    setupSSE();

    const modelSelect = document.getElementById('model-select');
    modelSelect?.addEventListener('change', async () => {
        await initCharts(); // reload charts for new model
    });
});