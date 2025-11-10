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

// Handler to put text in the middle of charts (for the measure's)
Chart.register({
    id: 'measureValueRenderer',
    afterDraw: (chart) => {
        // Check if this is one of our "measure" charts (a semi-doughnut)
        if (chart.options.circumference === 180) {
            const { ctx } = chart;

            // Get the raw value and suffix we will store in the chart's data object
            const value = chart.data.rawValue;
            const suffix = chart.data.suffix || '';

            // Don't draw if the value isn't loaded yet
            if (value === undefined) return;

            // --- Format the display text ---
            // e.g., "95.2%", "18.3 ms", or "4.7"
            let displayText = value.toFixed(1);
            if (suffix) {
                // Add a space only if it's not a percent sign
                displayText += (suffix === '%' ? '%' : ` ${suffix}`);
            }

            ctx.save();

            // Get center coordinates
            const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
            // Position the text slightly below the geometric center (looks better)
            const yPos = (chart.chartArea.top + chart.chartArea.bottom) / 2 + 15;

            // --- Draw the text ---
            ctx.font = 'bold 28px Arial'; // Big and bold
            ctx.fillStyle = '#333333';    // Dark grey text
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText(displayText, centerX, yPos);
            ctx.restore();
        }
    }
});

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

// ---------- Inject canvases ----------
function initChartCanvases() {
    const container = document.querySelector('.charts-container');
    clearDynamicCharts();
    container.innerHTML = CHART_IDS.map(id => `
        <div class="chart-card">
            <canvas id="${id}" width="400" height="300"></canvas>
        </div>
    `).join('');
}

function clearDynamicCharts() {
    // Remove the HTML
    document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());

    // Destroy and remove from the global 'charts' object
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

function createChartFromConfig(config, ctx) {
    // This just creates the chart shell. Data is added later.
    const chartOptions = {
        responsive: false,
        maintainAspectRatio: false,
        devicePixelRatio: 3,
        plugins: {
            title: {
                display: true,
                text: config.title,
                font: { size: 16 },
                color: '#eee'
            },
            legend: { display: true }
        }
    };

    switch (config.chartType) {
        case 'line':
            return new Chart(ctx, { type: 'line', data: { labels: [], datasets: [] }, options: chartOptions });
        case 'bar':
            return new Chart(ctx, { type: 'bar', data: { labels: [], datasets: [] }, options: chartOptions });
        case 'pie':
            // Pie charts are often better without a Y-axis
            delete chartOptions.scales;
            return new Chart(ctx, { type: 'doughnut', data: { labels: [], datasets: [] }, options: chartOptions });
        default:
            console.error('Unknown chart type in config:', config.chartType);
            return null;
    }
}

// ---------- Chart factory functions ----------
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

// Just for default charts - remove later
async function loadDefaultChartData(logs) {
    if (logs.length === 0) return;

    const labels = logs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());
    const responseTimes = logs.map(log => log.responseTime);
    const energyConsumptions = logs.map(log => log.energyConsumption);
    const helpfulnessScores = logs.map(log => log.responseHelpfulness);

    // debugger;

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
    console.log("loadChartsFromDatabase CALLED");
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
                chartCard.config = config;
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
                const newChart = createChartFromConfig(config, ctx);
                newChart.config = config;
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

        //  Update all charts at once
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
// This method is only used for the default charts, remove later
async function initCharts() {
    initChartCanvases();

    charts.responseTimeChart = createLineChart(
        document.getElementById('responseTimeChart').getContext('2d'),
        'Average Response Time (ms)',
        Utils.CHART_COLORS.blue
    );
    charts.responseTimeChart.config = {
        chartType: 'line',
        yAxis: 'responseTime'
    }
    charts.energyConsumptionChart = createLineChart(
        document.getElementById('energyConsumptionChart').getContext('2d'),
        'Average Energy Consumption (Wh)',
        Utils.CHART_COLORS.amber
    );
    charts.energyConsumptionChart.config = {
        chartType: 'line',
        yAxis: 'energyConsumption'
    };
    charts.complianceChart = createDoughnutChart(
        document.getElementById('complianceChart').getContext('2d'),
        'Compliance',
        [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
    );
    charts.complianceChart.config = {
        chartType: 'doughnut_special',
        yAxis: 'policyCompliance'
    };
    charts.helpfulnessChart = createLineChart(
        document.getElementById('helpfulnessChart').getContext('2d'),
        'Average Helpfulness Score',
        Utils.CHART_COLORS.purple,
        { min: 1, max: 5 }
    );
    charts.helpfulnessChart.config = {
        chartType: 'line',
        yAxis: 'responseHelpfulness'
    };
}

// ---------- SSE updates ----------
function setupSSE() {
    const evtSource = new EventSource('/events');

    evtSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const now = new Date().toLocaleTimeString();

        // Universal update loop!
        for (const id in charts) {
            const chartOrElem = charts[id];
            if (!chartOrElem) continue;

            const config = chartOrElem.config;

            // Check if chart has a config and a yAxis defined
            if (!config || !config.yAxis) {
                continue;
            }

            const newValue = data[config.yAxis];

            // If the SSE data doesn't have the key this chart needs, skip it
            if (newValue === undefined) {
                continue;
            }

            // --- Handle updates based on chart type ---
            switch (config.chartType) {

                case 'line':
                    // This handles default AND dynamic line charts
                    // Note: This doesn't handle 'splitBy' for now.
                    const chart = chartOrElem;

                    chart.data.labels.push(now);
                    // Assume single dataset for now
                    if (chart.data.datasets.length === 0) {
                        // Failsafe if data hasn't loaded
                    } else {
                        chart.data.datasets[0].data.push(newValue);
                    }

                    if (chart.data.labels.length > CACHE_MAX_POINTS) {
                        chart.data.labels.shift();
                        chart.data.datasets[0].data.shift();
                    }
                    chart.update("none");
                    break;

                case 'measure':
                    // This handles dynamic KPI cards
                    const element = chartOrElem;
                    element.querySelector('.kpi-value').textContent = newValue.toFixed(1);
                    break;

                case 'doughnut_special':
                    // This handles the one default compliance chart
                    const doughnutChart = chartOrElem;
                    doughnutChart.data.datasets[0].data = [newValue, 100 - newValue];
                    doughnutChart.update("none"); // Use 'none' for smoother update
                    break;

                case 'bar':
                case 'pie':
                    // We skip Bar and Pie charts.
                    // Why? They show aggregations over time, not a single live
                    // data point. They will correctly update on the next
                    // model switch or page load, which is the expected behavior.
                    break;
            }
        }

        // saveChartsToCache();
    };

    evtSource.onerror = (err) => console.error('SSE error:', err);
}


// REFACTOR: Updated DOMContentLoaded order
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

// ---------- Setup ----------
window.myChartUtils = {
    resetCharts
};