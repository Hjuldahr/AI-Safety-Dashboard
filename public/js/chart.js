import { pseudoAI, AIGeneralizer } from './test_data_generator_v3.js';

// ========== Utility Functions ==========
const Utils = {
    days({ count }) {
        return Array.from({ length: count }, (_, i) => `Day ${i + 1}`);
    },
    numbers({ count, min, max, precision = 0 }) {
        return Array.from({ length: count }, () => {
            const value = Math.random() * (max - min) + min;
            return parseFloat(value.toFixed(precision));
        });
    },
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
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

// ========== Defining Models NOTE: Might need to be moved to a different file ==========
async function goodModel() {
    const calls = await pseudoAI("GoodModel", 2, 5, 10, 0.9, 1.0, 0.9, 1.0);
    const summary = AIGeneralizer("GoodModel", calls);
    return {
        modelName: summary.model,
        avgCompliance: summary.policyCompliance.mean * 100,
        avgHelpfulness: summary.responseHelpfulness.mean * 5,
        avgResponseTime: summary.responseTime.mean,
        avgEnergyConsumption: summary.energyConsumption.mean * 1000 // Convert kWh to Wh for better readability
    };
}

async function badModel() {
    const calls = await pseudoAI("badModel", 2, 1, 3, 0.4, 0.7, 0.3, 0.6);
    const summary = AIGeneralizer("badModel", calls);
    return {
        modelName: summary.model,
        avgCompliance: summary.policyCompliance.mean * 100,
        avgHelpfulness: summary.responseHelpfulness.mean * 5,
        avgResponseTime: summary.responseTime.mean,
        avgEnergyConsumption: summary.energyConsumption.mean * 1000 // Convert kWh to Wh for better readability
    };
}

// ========== Chart Creation Functions ==========

// Response Time Line Chart
function createResponseTimeChart(ctx, initialData) {
    // Set uniform size for chart canvas
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
            }
        }
    });
}

// Energy Consumption Line Chart
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
            }
        }
    });
}

// Compliance Doughnut Chart
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
            }
        }
    });
}

// Helpfulness Line Chart
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
            scales: {
                y: { min: 1, max: 5 }
            },
            plugins: {
                legend: { display: true, position: 'bottom' },
                title: { display: true, text: 'Response Helpfulness by Category' }
            }
        }
    });
}

// ========== Chart Registry ==========

const chartDefinitions = [
    { id: 'responseTimeChart', create: createResponseTimeChart },
    { id: 'energyConsumptionChart', create: createEnergyConsumptionChart },
    { id: 'complianceChart', create: createComplianceChart },
    { id: 'helpfulnessChart', create: createHelpfulnessChart },
    
];

const charts = {};

// ========== Chart Initialization ==========

// Initialize all charts with data from the selected model
async function initCharts() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentModel = urlParams.get('model') || 'good'; // Default to 'good' if not specified
    const initialModelData = currentModel === 'bad' ? await badModel() : await goodModel();

    chartDefinitions.forEach(def => {
        const ctx = document.getElementById(def.id)?.getContext('2d');
        if (ctx) {
            // Pass the initial data to the creation function
            charts[def.id] = def.create(ctx, initialModelData);
        }
    });
}

// ========== Data Refresh Logic ==========

// refresh the charts with new data from the selected model
async function refreshCharts() {
    // Determine which model to use based on URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const currentModel = urlParams.get('model') || 'good'; // Default to 'good' if not specified
    const newData = currentModel === 'bad' ? await badModel() : await goodModel();

    // --- Update Response Time Chart ---
    const responseTimeChart = charts.responseTimeChart;
    if (responseTimeChart) {
        const { data } = responseTimeChart;
        data.labels.push(new Date().toLocaleTimeString());
        data.datasets[0].data.push(newData.avgResponseTime);
        // Keep the chart from getting too crowded
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        responseTimeChart.update();
    }

            // --- Update Energy Consumption Chart ---
    const energyConsumptionChart = charts.energyConsumptionChart;
    if (energyConsumptionChart) {
        const { data } = energyConsumptionChart;
        data.labels.push(new Date().toLocaleTimeString());
        data.datasets[0].data.push(newData.avgEnergyConsumption);
        // Keep the chart from getting too crowded
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        energyConsumptionChart.update();
    }

    // --- Update Compliance Chart ---
    const complianceChart = charts.complianceChart;
    if (complianceChart) {
        const newScore = newData.avgCompliance;
        complianceChart.data.datasets[0].data = [newScore, 100 - newScore];
        complianceChart.options.plugins.title.text = `Overall Compliance Score: ${newScore.toFixed(1)}%`;
        complianceChart.update();
    }

        // --- Update Helpfulness Chart ---
    const helpfulnessChart = charts.helpfulnessChart;
    if (helpfulnessChart) {
        const { data } = helpfulnessChart;
        data.labels.push(new Date().toLocaleTimeString());
        data.datasets[0].data.push(newData.avgHelpfulness);
        if (data.labels.length > 15) {
            data.labels.shift();
            data.datasets[0].data.shift();
        }
        helpfulnessChart.update();
    }
}

// ========== Event Bindings ==========

// Refresh charts on button click
document.addEventListener('DOMContentLoaded', async () => {
    await initCharts();
    const refreshBtn = document.getElementById('refresh-button');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await refreshCharts();
        });
    }
});

// Set the dropdown to match the current model from the URL on page load
document.addEventListener('DOMContentLoaded', () => {
  const modelSelect = document.getElementById('model-select');
  if (modelSelect) {
    // Set the dropdown to match the current model from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentModel = urlParams.get('model') || 'good';
    modelSelect.value = currentModel;

    modelSelect.addEventListener('change', function() {
      const selectedModel = this.value;
      window.location.search = '?model=' + encodeURIComponent(selectedModel);
    });
  }
});