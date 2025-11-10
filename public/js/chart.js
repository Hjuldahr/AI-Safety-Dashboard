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
let isReloadingCharts = false;

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

// ---------- Inject canvases ----------
function initChartCanvases() {
    const container = document.querySelector('.charts-container');

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
    //Remove the HTML
    document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());

    for (const id in charts) {
        if (!CHART_IDS.includes(id)) {
            if (charts[id] instanceof Chart) {
                charts[id].destroy();
            }
            delete charts[id];
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

// factory function to create chart *skeletons*
function createChartFromConfig(config, ctx) {

    const options = {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true }
        },
        devicePixelRatio: 3
    };

    options.plugins.title = {
        display: true,
        text: config.title,
        font: { size: 16 },
        color: '#eee'
    };

    let data = { labels: [], datasets: [] };

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
        borderColor: Utils.CHART_COLORS.purple, //ToDo: generate this based off hash of title
        backgroundColor: Utils.transparentize(Utils.CHART_COLORS.purple, 0.5),
        fill: true,
        tension: 0.3
    }];
    // TODO: Add logic for 'splitBy' here, which would create multiple datasets
}

function mapBarData(chart, config, logs) {
    const groups = {};
    const xField = config.xAxis;
    const yField = config.yAxis;

    // ToDo: Y-Axis title should display on the left

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
    const categoryField = config.category;

    logs.forEach(log => {
        const key = log[categoryField];
        if (!groups[key]) {
            groups[key] = { sum: 0 };
        }
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
    if (isReloadingCharts) return; // Don't run if already running
    isReloadingCharts = true;
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

        //Clear old dynamic charts and inject new ones
        clearDynamicCharts();
        const container = document.querySelector('.charts-container');

        for (const config of configs) {
            const chartCard = document.createElement('div');
            chartCard.className = 'chart-card dynamic-chart-card';

            if (config.chartType === 'measure') {
                // Create a KPI card
                chartCard.classList.add('kpi-card');
                chartCard.id = config._id;
                container.appendChild(chartCard);
                // Store the *HTML element* in charts object
                chartCard.customConfig = config;
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
                const newChart = createChartFromConfig(config, ctx);
                newChart.customConfig = config;
                charts[config._id] = newChart;
            }
        }

        // Load data into the 4 default charts
        await loadDefaultChartData(logs);

        // Load data into the new dynamic charts
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

        // Update all charts at once
        Object.values(charts).forEach(chart => {
            if (chart instanceof Chart) {
                chart.update('none');
            }
        });

    } catch (err) {
        console.error('Error loading data from database:', err);
    } finally {
        isReloadingCharts = false; // turn off the lock
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
    charts.responseTimeChart.customConfig = {
        chartType: 'line',
        yAxis: 'responseTime'
    };
    charts.energyConsumptionChart = createLineChart(
        document.getElementById('energyConsumptionChart').getContext('2d'),
        'Average Energy Consumption (Wh)',
        Utils.CHART_COLORS.amber
    );
    charts.energyConsumptionChart.customConfig = {
        chartType: 'line',
        yAxis: 'energyConsumption'
    };
    charts.complianceChart = createDoughnutChart(
        document.getElementById('complianceChart').getContext('2d'),
        'Compliance',
        [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
    );
    charts.complianceChart.customConfig = {
        chartType: 'doughnut_special', // A special name for our hardcoded chart
        yAxis: 'policyCompliance'
    };
    charts.helpfulnessChart = createLineChart(
        document.getElementById('helpfulnessChart').getContext('2d'),
        'Average Helpfulness Score',
        Utils.CHART_COLORS.purple,
        { min: 1, max: 5 }
    );
    charts.helpfulnessChart.customConfig = {
        chartType: 'line',
        yAxis: 'responseHelpfulness'
    };
}

// ---------- SSE updates ----------
function setupSSE() {
    const evtSource = new EventSource('/events');

    evtSource.onmessage = (event) => {
        // --- SAFETY CHECK ---
        // If charts are reloading, skip this update to prevent a crash
        if (isReloadingCharts) {
            console.log("Skipping SSE update, charts are reloading.");
            return;
        }

        const data = JSON.parse(event.data);
        const now = new Date().toLocaleTimeString();

        // --- UNIVERSAL UPDATE LOOP ---
        for (const id in charts) {
            const chartOrElem = charts[id];

            // Get the chart's config tag
            const config = chartOrElem.customConfig;

            if (!config || !config.yAxis) {
                continue; // Skip if no config or no yAxis defined
            }

            const newValue = data[config.yAxis];
            if (newValue === undefined) {
                // Skip if SSE data doesn't have this key
                // (e.g., SSE has 'responseTime', but this chart is 'toxicityScore')
                continue;
            }

            // 4. Update the chart based on its type
            switch (config.chartType) {
                case 'line':
                    const chart = chartOrElem;
                    chart.data.labels.push(now);

                    // Failsafe for charts with no dataset yet
                    if (chart.data.datasets.length > 0) {
                        chart.data.datasets[0].data.push(newValue);
                    }

                    // Trim data
                    if (chart.data.labels.length > CACHE_MAX_POINTS) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }
                    chart.update("none");
                    break;

                case 'measure':
                    const element = chartOrElem;
                    // Failsafe querySelector
                    const kpiValue = element.querySelector('.kpi-value');
                    if (kpiValue) {
                        kpiValue.textContent = newValue.toFixed(1);
                    }
                    break;

                case 'doughnut_special':
                    // This handles our one hardcoded compliance chart
                    const doughnutChart = chartOrElem;
                    doughnutChart.data.datasets[0].data = [newValue, 100 - newValue];
                    doughnutChart.update("none");
                    break;

                case 'bar':
                case 'pie':
                    // Bar and Pie charts are aggregations,
                    // so we correctly skip them on live updates.
                    break;
            }
        }
    };

    evtSource.onerror = (err) => console.error('SSE error:', err);
}

function resetCharts() {

    Object.values(charts).forEach(chart => {
        if (chart.customConfig.type === 'doughnut') {
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
    await initCharts();
    await loadChartsFromDatabase();
    setupSSE();

    const modelSelect = document.getElementById('model-select');
    modelSelect?.addEventListener('change', async () => {
        await loadChartsFromDatabase();
    });
});