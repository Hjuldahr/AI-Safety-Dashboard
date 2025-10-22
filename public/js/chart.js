// chart.js
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

// ---------- Utils ----------
const Utils = {
    CHART_COLORS: {
        coral: 'rgb(244, 91, 105)',
        blue: 'rgb(0, 122, 204)',
        teal: 'rgb(44, 165, 141)',
        amber: 'rgb(255, 179, 0)',
        purple: 'rgb(142, 68, 173)',
    },
    transparentize(color, opacity) {
        if (!color) return 'rgba(0,0,0,0.1)';
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};

// ---------- Chart Creation Functions ----------
function createResponseTimeChart(ctx, initialData) {
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [new Date().toLocaleTimeString()],
            datasets: [{
                label: 'Average Response Time (ms)',
                data: [initialData.avgResponseTime],
                borderColor: Utils.CHART_COLORS.blue,
                backgroundColor: Utils.transparentize(Utils.CHART_COLORS.blue, 0.5),
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Response Time Over Time' }
            },
            devicePixelRatio: 3
        }
    });
}

function createEnergyConsumptionChart(ctx, initialData) {
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [new Date().toLocaleTimeString()],
            datasets: [{
                label: 'Average Energy Consumption (Wh)',
                data: [initialData.avgEnergyConsumption],
                borderColor: Utils.CHART_COLORS.amber,
                backgroundColor: Utils.transparentize(Utils.CHART_COLORS.amber, 0.5),
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Energy Consumption Over Time' }
            },
            devicePixelRatio: 3
        }
    });
}

function createComplianceChart(ctx, initialData) {
    const complianceScore = initialData.avgCompliance;
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Compliant', 'Non-Compliant'],
            datasets: [{
                label: 'Compliance',
                data: [complianceScore, 100 - complianceScore],
                backgroundColor: [Utils.CHART_COLORS.teal, Utils.CHART_COLORS.coral],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'bottom' },
                title: {
                    display: true,
                    text: `Overall Compliance Score: ${complianceScore.toFixed(1)}%`
                }
            },
            devicePixelRatio: 3
        }
    });
}

function createHelpfulnessChart(ctx, initialData) {
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [new Date().toLocaleTimeString()],
            datasets: [{
                label: 'Average Helpfulness Score (out of 5)',
                data: [initialData.avgHelpfulness],
                borderColor: Utils.CHART_COLORS.purple,
                backgroundColor: Utils.transparentize(Utils.CHART_COLORS.purple, 0.5),
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            scales: { y: { min: 1, max: 5 } },
            plugins: {
                legend: { display: true, position: 'bottom' },
                title: { display: true, text: 'Response Helpfulness by Category' }
            },
            devicePixelRatio: 3
        }
    });
}

// ---------- Chart Registry ----------
const chartDefinitions = {
    'responseTimeChart': createResponseTimeChart,
    'energyConsumptionChart': createEnergyConsumptionChart,
    'complianceChart': createComplianceChart,
    'helpfulnessChart': createHelpfulnessChart,
};

const charts = {};

// ---------- Chart Initialization ----------
function initCharts() {
    const initialData = {
        avgResponseTime: 0,
        avgEnergyConsumption: 0,
        avgCompliance: 0,
        avgHelpfulness: 0
    };

    Object.entries(chartDefinitions).forEach(([id, createFn]) => {
        const ctx = document.getElementById(id)?.getContext('2d');
        if (ctx) charts[id] = createFn(ctx, initialData);
    });
}

// ---------- SSE Connection ----------
function setupSSEConnection() {
    const evtSource = new EventSource('/events');

    evtSource.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        updateCharts(newData);
    };

    evtSource.onerror = (err) => {
        console.error('SSE connection error', err);
    };
}

// ---------- Update Charts ----------
function updateCharts(newData) {
    const now = new Date().toLocaleTimeString();

    // Response Time
    const responseTimeChart = charts.responseTimeChart;
    if (responseTimeChart) {
        const { data } = responseTimeChart;
        data.labels.push(now);
        data.datasets[0].data.push(newData.avgResponseTime);
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        responseTimeChart.update('none');
    }

    // Energy Consumption
    const energyChart = charts.energyConsumptionChart;
    if (energyChart) {
        const { data } = energyChart;
        data.labels.push(now);
        data.datasets[0].data.push(newData.avgEnergyConsumption);
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        energyChart.update('none');
    }

    // Compliance
    const complianceChart = charts.complianceChart;
    if (complianceChart) {
        const score = newData.avgCompliance;
        complianceChart.data.datasets[0].data = [score, 100 - score];
        complianceChart.options.plugins.title.text = `Overall Compliance Score: ${score.toFixed(1)}%`;
        complianceChart.update();
    }

    // Helpfulness
    const helpfulnessChart = charts.helpfulnessChart;
    if (charts.helpfulnessChart) {
        const { data } = charts.helpfulnessChart;
        data.labels.push(now);
        data.datasets[0].data.push(newData.avgHelpfulness);
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        charts.helpfulnessChart.update('none');
    }
}

// ---------- DOM Ready ----------
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    setupSSEConnection();
});