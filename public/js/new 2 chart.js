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
const CACHE_MAX_POINTS = 15; // Maximum points to store in cache

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

// ---------- Inject canvases ----------
function initChartCanvases() {
    const container = document.querySelector('.charts-container');
    // We'll clear all *dynamic* charts first, leaving the defaults
    clearDynamicCharts();

    // This logic is now only for the 4 default charts
    container.innerHTML = CHART_IDS.map(id => `
    <div class="chart-card">
      <canvas id="${id}" width="400" height="300"></canvas>
    </div>
  `).join('');
}

// ---------- Chart factory functions ----------
function createLineChart(ctx, label, color, yOptions = {}) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{ label, data: [], borderColor: color, backgroundColor: Utils.transparentize(color, 0.5), fill: true, tension: 0.3 }]
        },
        options: { responsive: false, maintainAspectRatio: false, scales: { y: yOptions }, plugins: { legend: { display: true } }, devicePixelRatio: 3 }
    });
}

function createDoughnutChart(ctx, label, colors) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Compliant', 'Non-Compliant'], datasets: [{ label, data: [0, 100], backgroundColor: colors, hoverOffset: 4 }] },
        options: { responsive: false, maintainAspectRatio: false, devicePixelRatio: 3 }
    });
}

function clearDynamicCharts() {
    // 1. Remove the HTML
    document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());

    // 2. Destroy and remove from the global 'charts' object
    for (const id in charts) {
        // If the chart ID is not one of the default IDs, it's dynamic
        if (!CHART_IDS.includes(id)) {
            if (charts[id] instanceof Chart) {
                charts[id].destroy(); // Destroy Chart.js instance
            }
            delete charts[id]; // Remove from tracking
        }
    }
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

// function to clear old dynamic charts
function clearDynamicCharts() {
    // 1. Remove the HTML
    document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());

    // 2. Destroy and remove from the global 'charts' object
    for (const id in charts) {
        // If the chart ID is not one of the default IDs, it's dynamic
        if (!CHART_IDS.includes(id)) {
            if (charts[id] instanceof Chart) {
                charts[id].destroy(); // Destroy Chart.js instance
            }
            delete charts[id]; // Remove from tracking
        }
    }
}

// factory function to create chart *skeletons*
function createChartFromConfig(config, ctx) {

    // 1. Start with the *exact same* base options from createLineChart
    const options = {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true }
        },
        devicePixelRatio: 3
    };

    // 2. Add the dynamic title (which static charts don't have)
    options.plugins.title = {
        display: true,
        text: config.title,
        font: { size: 16 },
        color: '#eee'
    };

    // 3. Add the 'scales' object (the missing piece!)
    // We add an empty 'y' axis object to ensure it behaves like the static charts
    if (config.chartType !== 'pie') {
        options.scales = { y: {} };
    }

    // 4. Set up the data structure
    let data = { labels: [], datasets: [] };

    // 5. Create the chart
    return new Chart(ctx, {
        type: (config.chartType === 'pie') ? 'doughnut' : config.chartType,
        data: data,
        options: options // Use our new, unified options
    });
}

function mapLineData(chart, config, logs) {
    const labels = logs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());
    const data = logs.map(log => log[config.yAxis]);

    chart.data.labels = labels;
    chart.data.datasets = [{
        label: config.yAxis,
        data: data,
        borderColor: Utils.CHART_COLORS.purple, // You can randomize this
        backgroundColor: Utils.transparentize(Utils.CHART_COLORS.purple, 0.5),
        fill: true,
        tension: 0.3
    }];
    // chart.options = {options: { responsive: false, maintainAspectRatio: false, plugins: { legend: { display: true } }, devicePixelRatio: 3 }};

    // TODO: Add logic for 'splitBy' here, which would create multiple datasets
}

function mapBarData(chart, config, logs) {
    const groups = {};
    const xField = config.xAxis; // e.g., 'modelName'
    const yField = config.yAxis; // e.g., 'responseTime'

    logs.forEach(log => {
        const key = log[xField];
        if (!groups[key]) {
            groups[key] = { sum: 0, count: 0 };
        }
        groups[key].sum += log[yField];
        groups[key].count += 1; // Use 1, not queryCount, for avg
    });

    chart.data.labels = Object.keys(groups);
    chart.data.datasets = [{
        label: `Average ${yField}`,
        data: Object.values(groups).map(g => g.sum / g.count),
        backgroundColor: Object.values(Utils.CHART_COLORS)
    }];
}

function mapPieData(chart, config, logs) {
    const groups = {};
    const categoryField = config.category; // e.g., 'modelName'

    logs.forEach(log => {
        const key = log[categoryField];
        if (!groups[key]) {
            groups[key] = { sum: 0 };
        }
        // Use the weighted queryCount we added!
        groups[key].sum += log.queryCount;
    });

    chart.data.labels = Object.keys(groups);
    chart.data.datasets = [{
        label: 'Total Queries',
        data: Object.values(groups).map(g => g.sum),
        backgroundColor: Object.values(Utils.CHART_COLORS)
    }];
}

function mapMeasureData(element, config, logs) {
    const yField = config.yAxis; // e.g., 'policyCompliance'

    // For 'measure', we will average the field over the log window
    const values = logs.map(log => log[yField]);
    let avg = 0;
    if (values.length > 0) {
        avg = values.reduce((a, b) => a + b, 0) / values.length;
    }

    // Inject KPI HTML
    element.innerHTML = `
    <h3 class="kpi-title">${config.title}</h3>
    <div class="kpi-value">${avg.toFixed(1)}</div>
  `;
}

// REFACTOR: This function now ONLY loads default chart data
// The new dynamic charts are handled in loadChartsFromDatabase
async function loadDefaultChartData(logs) {
    if (logs.length === 0) return;

    const labels = logs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());
    const responseTimes = logs.map(log => log.responseTime);
    const energyConsumptions = logs.map(log => log.energyConsumption);
    const helpfulnessScores = logs.map(log => log.responseHelpfulness);

    // Set the line chart data
    charts.responseTimeChart.data.labels = labels;
    charts.responseTimeChart.data.datasets[0].data = responseTimes;

    charts.energyConsumptionChart.data.labels = labels;
    charts.energyConsumptionChart.data.datasets[0].data = energyConsumptions;

    charts.helpfulnessChart.data.labels = labels;
    charts.helpfulnessChart.data.datasets[0].data = helpfulnessScores;

    // Set the doughnut chart from the latest log
    const latestLog = logs[logs.length - 1];
    charts.complianceChart.data.datasets[0].data = [
        latestLog.policyCompliance,
        100 - latestLog.policyCompliance
    ];
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
        const logs = data.logs;
        const configs = data.configs;

        // 1. Clear old dynamic charts and inject new ones
        clearDynamicCharts();
        const container = document.querySelector('.charts-container');

        for (const config of configs) {
            const chartCard = document.createElement('div');
            chartCard.className = 'chart-card dynamic-chart-card'; // New class

            if (config.chartType === 'measure') {
                // Create a KPI card
                chartCard.classList.add('kpi-card'); // Add kpi style
                chartCard.id = config._id; // Use DB ID as element ID
                container.appendChild(chartCard);
                // Store the *HTML element* in our charts object
                charts[config._id] = chartCard;
            } else {
                // Create a canvas-based chart
                const canvas = document.createElement('canvas');
                canvas.id = config._id; // Use DB ID as canvas ID
                canvas.width = 400;
                canvas.height = 300;
                chartCard.appendChild(canvas);
                container.appendChild(chartCard);

                // Create the chart skeleton and store it
                const ctx = canvas.getContext('2d');
                charts[config._id] = createChartFromConfig(config, ctx);
            }
        }

        // 2. Load data into the 4 default charts
        await loadDefaultChartData(logs);

        // 3. Load data into the new dynamic charts
        if (logs.length > 0) {
            for (const config of configs) {
                const chartOrElem = charts[config._id];
                if (!chartOrElem) continue;

                switch (config.chartType) {
                    case 'line':
                        mapLineData(chartOrElem, config, logs);
                        break;
                    case 'bar':
                        mapBarData(chartOrElem, config, logs);
                        break;
                    case 'pie':
                        mapPieData(chartOrElem, config, logs);
                        break;
                    case 'measure':
                        mapMeasureData(chartOrElem, config, logs);
                        break;
                }
            }
        }

        // 4. Update all charts at once
        Object.values(charts).forEach(chart => {
            if (chart instanceof Chart) {
                chart.update('none');
            }
        });

    } catch (err) {
        console.error('Error loading data from database:', err);
    }
}

// ---------- Initialize charts ----------
// REFACTOR: This function now *only* creates the 4 default chart instances
async function initCharts() {
    initChartCanvases();

    charts.responseTimeChart = createLineChart(
        document.getElementById('responseTimeChart').getContext('2d'),
        'Average Response Time (ms)',
        Utils.CHART_COLORS.blue
    );
    charts.energyConsumptionChart = createLineChart(
        document.getElementById('energyConsumptionChart').getContext('2d'),
        'Average Energy Consumption (Wh)',
        Utils.CHART_COLORS.amber
    );
    charts.complianceChart = createDoughnutChart(
        document.getElementById('complianceChart').getContext('2d'),
        'Compliance',
        [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
    );
    charts.helpfulnessChart = createLineChart(
        document.getElementById('helpfulnessChart').getContext('2d'),
        'Average Helpfulness Score',
        Utils.CHART_COLORS.purple,
        { min: 1, max: 5 }
    );
}

// ---------- SSE updates ----------
function setupSSE() {
    const evtSource = new EventSource('/events');
    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const now = new Date().toLocaleTimeString();

        function pushData(chart, value) {
            chart.data.labels.push(now);
            chart.data.datasets[0].data.push(value);
            if (chart.data.labels.length > CACHE_MAX_POINTS) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.update("none");
        }

        pushData(charts.responseTimeChart, data.responseTime);
        pushData(charts.energyConsumptionChart, data.energyConsumption);
        charts.complianceChart.data.datasets[0].data = [data.policyCompliance, 100 - data.policyCompliance];
        charts.complianceChart.update();
        pushData(charts.helpfulnessChart, data.responseHelpfulness);

        // saveChartsToCache(); // persist after each update
    };

    evtSource.onerror = (err) => console.error('SSE error:', err);
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

// ---------- Setup ----------
window.myChartUtils = {
    resetCharts
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Create default chart objects (no data)
    await initCharts();
    // 2. Load data for default charts AND create/load dynamic charts
    await loadChartsFromDatabase();
    // 3. Start live updates (only for default charts for now)
    setupSSE();

    const modelSelect = document.getElementById('model-select');
    modelSelect?.addEventListener('change', async () => {
        // This will now reload *everything*
        await loadChartsFromDatabase();
    });
});