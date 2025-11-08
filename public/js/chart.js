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
        const logs = data.logs;
        const configs = data.configs;

        console.log("Found configs: " + configs);
        if (logs.length === 0) {
            console.log('No initial data to load.');
            return;
        }

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

        // Update all charts at once
        Object.values(charts).forEach(chart => chart.update('none'));

    } catch (err) {
        console.error('Error loading data from database:', err);
    }
}

// ---------- Initialize charts ----------
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

    await loadChartsFromDatabase(); // restore previous values
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