// public/js/chart.js
// Chart.js is loaded globally via UMD; no imports needed

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
function createLineChart(ctx, label, value, color, yOptions = {}) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [new Date().toLocaleTimeString()],
            datasets: [{
                label,
                data: [value],
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: { y: yOptions },
            plugins: {
                legend: { display: true },
                title: { display: true, text: label }
            },
            devicePixelRatio: 3
        }
    });
}

function createDoughnutChart(ctx, label, value, colors) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Compliant', 'Non-Compliant'],
            datasets: [{ label, data: [value, 100 - value], backgroundColor: colors, hoverOffset: 4 }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' },
                title: { display: true, text: label }
            },
            devicePixelRatio: 3
        }
    });
}

// ---------- Initialize charts ----------
function initCharts() {
    charts.responseTimeChart = createLineChart(
        document.getElementById('responseTimeChart').getContext('2d'),
        'Average Response Time (ms)',
        0,
        Utils.CHART_COLORS.blue
    );

    charts.energyConsumptionChart = createLineChart(
        document.getElementById('energyConsumptionChart').getContext('2d'),
        'Average Energy Consumption (Wh)',
        0,
        Utils.CHART_COLORS.amber
    );

    charts.complianceChart = createDoughnutChart(
        document.getElementById('complianceChart').getContext('2d'),
        'Compliance Score',
        0,
        [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral]
    );

    charts.helpfulnessChart = createLineChart(
        document.getElementById('helpfulnessChart').getContext('2d'),
        'Average Helpfulness Score',
        0,
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

        // Response Time
        const rt = charts.responseTimeChart;
        rt.data.labels.push(now);
        rt.data.datasets[0].data.push(data.avgResponseTime);
        if (rt.data.labels.length > 15) {
            rt.data.labels.shift();
            rt.data.datasets[0].data.shift();
        }
        rt.update('none');

        // Energy Consumption
        const ec = charts.energyConsumptionChart;
        ec.data.labels.push(now);
        ec.data.datasets[0].data.push(data.avgEnergyConsumption);
        if (ec.data.labels.length > 15) {
            ec.data.labels.shift();
            ec.data.datasets[0].data.shift();
        }
        ec.update('none');

        // Compliance
        const c = charts.complianceChart;
        c.data.datasets[0].data = [data.avgCompliance, 100 - data.avgCompliance];
        c.update();

        // Helpfulness
        const h = charts.helpfulnessChart;
        h.data.labels.push(now);
        h.data.datasets[0].data.push(data.avgHelpfulness);
        if (h.data.labels.length > 15) {
            h.data.labels.shift();
            h.data.datasets[0].data.shift();
        }
        h.update('none');
    };

    evtSource.onerror = (err) => console.error('SSE error:', err);
}

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', () => {
    initChartCanvases();
    initCharts();
    setupSSE();
});
