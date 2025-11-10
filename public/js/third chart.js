const CHART_IDS = [
    'responseTimeChart',
    'energyConsumptionChart',
    'complianceChart',
    'helpfulnessChart'
];

const Utils = {
    CHART_COLORS: {
        coral: 'rgb(244, 91, 105)',
        blue: 'rgb(0, 122, 204)',
        teal: 'rgb(44, 165, 141)',
        amber: 'rgb(255, 179, 0)',
        purple: 'rgb(142, 68, 173)',
    },
    transparentize(color, opacity) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};

const charts = {};
let allLogs = [];
let chartConfigs = [];
const CACHE_MAX_POINTS = 15; // Maximum points to store in cache

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

// ---------- Inject canvases ----------
// function initChartCanvases() {
//     const container = document.querySelector('.charts-container');
//     container.innerHTML = CHART_IDS.map(id => `
//         <div class="chart-card">
//             <canvas id="${id}" width="400" height="300"></canvas>
//         </div>
//     `).join('');
// }

// ---------- Inject canvases ----------
function renderChartContainers() {
    const container = document.querySelector('.charts-container');
    if (!container) {
        console.error("Chart container not found!");
        return;
    }
    container.innerHTML = ''; // Clear it first

    //  Render static charts from CHART_IDS
    const staticHtml = CHART_IDS.map(id => `
        <div class="chart-card">
            <canvas id="${id}" width="400" height="300"></canvas>
        </div>
    `).join('');

    // Render dynamic charts from global config
    const dynamicHtml = chartConfigs.map(config => {
        // If it's a 'measure' (KPI), render a div, not a canvas
        if (config.chartType === 'measure') {
            return `
            <div class="chart-card measure-card" id="${config._id}">
                </div>`;
        }

        // Otherwise, render the canvas as before
        return `
        <div class="chart-card">
            <canvas id="${config._id}" width="400" height="300"></canvas>
        </div>`;
    }).join('');

    // Append both to the container
    container.innerHTML = staticHtml + dynamicHtml;
}

// ---------- Chart factory functions ----------
function createLineChart(ctx, title, color, yOptions = {}) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: title,
                data: [],
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                fill: true, //set back to false to make it work
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: { y: yOptions },
            plugins: {
                legend: {
                    display:
                        true
                },
                filler: {
                    propagate: false // Tells this chart's filler to NOT look at other charts
                }
            },
            devicePixelRatio: 3
        }
    });
}

function createDoughnutChart(ctx, title, colors) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['--'], //placeholder label
            datasets: [{
                label: title,
                data: [100], //placeholder data
                backgroundColor: colors,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            devicePixelRatio: 3,
            plugins: {
            }
        }
    });
}

function createBarChart(ctx, title) {
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: title,
                data: [],
                backgroundColor: Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),
                borderColor: Utils.CHART_COLORS.blue,
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
            },
            devicePixelRatio: 3
        }
    });
}

// Not a Chart.js object. It just populates a div.
function createMeasureCard(element, title) {
    element.innerHTML = `
        <div class="measure-card-content">
            <h3>${title}</h3>
            <h1 class="measure-value">--</h1>
        </div>
    `;
    // Return null because there's no chart instance
    return null;
}

// ---------- Dynamic Chart Factory ----------
function createDynamicChart(config) {
    // Special case for 'measure'
    if (config.chartType === 'measure') {
        const element = document.getElementById(config._id);
        if (!element) return null;
        // This function returns null, as it's not a Chart.js instance
        return createMeasureCard(element, config.title);
    }

    // Get the canvas context for all other chart types
    const ctx = document.getElementById(config._id)?.getContext('2d');
    if (!ctx) {
        console.error(`Canvas with id ${config._id} not found.`);
        return null;
    }

    let newChart;

    // Call the correct factory based on chart type
    switch (config.chartType) {
        case 'line':
            // Use a default color for now
            newChart = createLineChart(ctx, config.title, Utils.CHART_COLORS.purple);
            // The filler plugin crashes on charts with no data.
            newChart.data.datasets[0].fill = false;
            break;
        case 'bar':
            newChart = createBarChart(ctx, config.title);
            break;
        case 'pie':
            // Use default colors
            newChart = createDoughnutChart(ctx, config.title, [
                Utils.CHART_COLORS.teal,
                Utils.CHART_COLORS.coral,
                Utils.CHART_COLORS.amber
            ]);
            break;
        default:
            console.error(`Unknown chart type: ${config.chartType}`);
            return null;
    }

    // IMPORTANT: Store the config on the chart instance
    // ToDo: Update this later to allow for live updates
    newChart.config = config;
    return newChart;
}

// ---------- Cache helpers ----------
function saveChartsToCache() {
    const model = getCurrentModel();
    const cache = JSON.parse(localStorage.getItem('chartsCache') || '{}');
    cache[model] = {};

    for (const [id, chart] of Object.entries(charts)) {
        cache[model][id] = {
            labels: [...chart.data.labels],
            datasets: chart.data.datasets.map(ds => ({ ...ds, data: [...ds.data] }))
        };
    }

    localStorage.setItem('chartsCache', JSON.stringify(cache));
}

function loadChartsFromCache() {
    const model = getCurrentModel();
    const cacheStr = localStorage.getItem('chartsCache');
    if (!cacheStr) return;

    const cache = JSON.parse(cacheStr);
    if (!cache[model]) return;

    for (const [id, chartData] of Object.entries(cache[model])) {
        const chart = charts[id];
        if (!chart) continue;

        chart.data.labels = chartData.labels.slice(-CACHE_MAX_POINTS);
        chart.data.datasets.forEach((ds, i) => ds.data = chartData.datasets[i].data.slice(-CACHE_MAX_POINTS));
        chart.update('none');
    }
}

function resetCharts() {
    // localStorage.removeItem('chartsCache');

    Object.values(charts).forEach(chart => {
        if (chart.config.type === 'doughnut') {
            // Reset doughnut chart values
            chart.data.datasets[0].data = [0, 0];
        } else {
            // Reset line chart values
            chart.data.labels = [];
            chart.data.datasets.forEach(ds => ds.data = []);
        }
        chart.update('none');
    });
}

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

        // Store data globally instead of processing it here
        allLogs = data.logs;
        chartConfigs = data.configs;

        console.log("Found configs: " + chartConfigs.length);
        if (allLogs.length === 0) {
            console.log('No initial data to load.');
            return;
        }

    } catch (err) {
        console.error('Error loading data from database:', err);
    }
}

// ---------- Initialize charts ----------
async function initCharts() {
    console.log("DEBUG: initCharts() started.");

    // Destroy all existing charts ---
    const chartIds = Object.keys(charts);
    for (const id of chartIds) {
        if (charts[id] && typeof charts[id].destroy === 'function') {
            charts[id].destroy();
        }
        delete charts[id]; // Remove from the object
    }
    console.log("DEBUG: 1. Old charts destroyed.");

    await loadChartsFromDatabase();
    console.log("DEBUG: 2. Database data loaded.");

    renderChartContainers();
    console.log("DEBUG: 3. Chart containers rendered.");

    try {
        console.log("DEBUG: 4. Creating responseTimeChart...");
        charts.responseTimeChart = createLineChart(
            document.getElementById('responseTimeChart').getContext('2d'),
            'Average Response Time (ms)',
            Utils.CHART_COLORS.blue
        );

        console.log("DEBUG: 5. Creating energyConsumptionChart...");
        charts.energyConsumptionChart = createLineChart(
            document.getElementById('energyConsumptionChart').getContext('2d'),
            'Average Energy Consumption (Wh)',
            Utils.CHART_COLORS.amber
        );

        console.log("DEBUG: 6. Creating complianceChart...");
        charts.complianceChart = createDoughnutChart(
            document.getElementById('complianceChart').getContext('2d'),
            'Compliance',
            [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
        );

        console.log("DEBUG: 7. Creating helpfulnessChart...");
        charts.helpfulnessChart = createLineChart(
            document.getElementById('helpfulnessChart').getContext('2d'),
            'Average Helpfulness Score',
            Utils.CHART_COLORS.purple,
            { min: 1, max: 5 }
        );
        console.log("DEBUG: 8. All static charts created.");

    } catch (e) {
        console.error("--- CRASH DURING STATIC CHART CREATION ---", e);
        return; // Stop function if creation fails
    }

    // Populate ONLY the static charts (for now)
    if (allLogs.length > 0) {
        console.log("DEBUG: 9. Populating static chart data...");
        const labels = allLogs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());
        const responseTimes = allLogs.map(log => log.responseTime);
        const energyConsumptions = allLogs.map(log => log.energyConsumption);
        const helpfulnessScores = allLogs.map(log => log.responseHelpfulness);

        // Set the line chart data
        charts.responseTimeChart.data.labels = labels;
        charts.responseTimeChart.data.datasets[0].data = responseTimes;

        charts.energyConsumptionChart.data.labels = labels;
        charts.energyConsumptionChart.data.datasets[0].data = energyConsumptions;

        charts.helpfulnessChart.data.labels = labels;
        charts.helpfulnessChart.data.datasets[0].data = helpfulnessScores;

        // Set the doughnut chart from the latest log
        const latestLog = allLogs[allLogs.length - 1];
        charts.complianceChart.data.labels = ['Compliant', 'Non-Compliant'];
        charts.complianceChart.data.datasets[0].data = [
            latestLog.policyCompliance,
            100 - latestLog.policyCompliance
        ];

        console.log("DEBUG: 10. Updating all static charts (chart.update)...");
        try {
            Object.values(charts).forEach(chart => chart.update('none'));
        } catch (e) {
            console.error("--- CRASH DURING STATIC CHART UPDATE ---", e);
            return; // Stop function if update fails
        }

        console.log("DEBUG: 11. Static charts updated. Initializing dynamic charts...");

        // Initialize ALL dynamic charts
        for (const config of chartConfigs) {
            const newChart = createDynamicChart(config);
            if (newChart) {
                charts[config._id] = newChart;
            }
        }
        console.log("DEBUG: 12. Dynamic charts initialized.");
    }
}

// ---------- SSE updates ----------
function setupSSE() {
    const evtSource = new EventSource('/events');
    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const now = new Date().toLocaleTimeString();
        console.log("SSE compliance data:", data.policyCompliance);

        function pushData(chart, value) {
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(value);
            if (chart.data.labels.length > CACHE_MAX_POINTS) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.update("none");
        }

        try {
            if (charts.responseTimeChart) {
                pushData(charts.responseTimeChart, data.responseTime);
            }
        } catch (e) {
            console.error("Failed to update responseTimeChart:", e);
        }

        try {
            if (charts.energyConsumptionChart) {
                pushData(charts.energyConsumptionChart, data.energyConsumption);
            }
        } catch (e) {
            console.error("Failed to update energyConsumptionChart:", e);
        }

        try {
            if (charts.complianceChart) {
                charts.complianceChart.data.labels = ['Compliant', 'Non-Compliant'];
                charts.complianceChart.data.datasets[0].data = [data.policyCompliance, 100 - data.policyCompliance];
                charts.complianceChart.update();
            }
        } catch (e) {
            console.error("Failed to update complianceChart:", e);
        }

        try {
            if (charts.helpfulnessChart) {
                pushData(charts.helpfulnessChart, data.responseHelpfulness);
            }
        } catch (e) {
            console.error("Failed to update helpfulnessChart:", e);
        }

        // saveChartsToCache(); // persist after each update
    };

    evtSource.onerror = (err) => console.error('SSE error:', err);
}

// ---------- Setup ----------
window.myChartUtils = {
    resetCharts
};

document.addEventListener('DOMContentLoaded', async () => {
    await initCharts();
    setupSSE();

    const modelSelect = document.getElementById('model-select');
    modelSelect?.addEventListener('change', async () => {
        await initCharts(); // reload charts for new model
    });
});