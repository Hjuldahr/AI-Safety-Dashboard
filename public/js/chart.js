// ========== Utility Functions ==========
const Utils = {
    days({ count }) {
        return Array.from({ length: count }, (_, i) => `Day ${i + 1}`);
    },
    numbers({ count, min, max }) {
        return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    },
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    CHART_COLORS: {
        red: 'rgb(255, 99, 132)',
        blue: 'rgb(54, 162, 235)'
    },
    transparentize(color, opacity) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};

// ========== Chart Creation Functions ==========

// Model Drift Line Chart
function createModelDriftChart(ctx) {
    const DATA_COUNT = 7;
    const labels = Utils.days({ count: DATA_COUNT });
    const NUMBER_CFG = { count: DATA_COUNT, min: -100, max: 100 };

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Model Drift',
                    borderColor: Utils.CHART_COLORS.red,
                    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
                    fill: false,
                    data: Utils.numbers(NUMBER_CFG),
                },
                {
                    label: 'Baseline',
                    data: Utils.numbers(NUMBER_CFG),
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Model Drift Over Time' }
            }
        }
    });
}

// Helpfulness Bar Chart
function createHelpfulnessChart(ctx) {
    const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories,
            datasets: [{
                label: 'Helpfulness',
                data: Utils.numbers({ count: categories.length, min: 0, max: 100 }),
                backgroundColor: Utils.CHART_COLORS.red
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Response Helpfulness by Category' }
            }
        }
    });
}

// Compliance Bubble Chart
function createComplianceChart(ctx) {
    const categories = ['Profanity', 'Sensitive Info', 'Hate Speech', 'Other'];
    return new Chart(ctx, {
        type: 'bubble',
        data: {
            labels: categories,
            datasets: [{
                label: 'Compliance Issues',
                data: categories.map(() => ({
                    x: Utils.rand(1, 100),
                    y: Utils.rand(1, 100),
                    r: Utils.rand(5, 20)
                })),
                backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
                borderColor: Utils.CHART_COLORS.red,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Policy Compliance Issues' }
            },
            scales: {
                x: { title: { display: true, text: 'Severity' }, min: 0, max: 100 },
                y: { title: { display: true, text: 'Frequency' }, min: 0, max: 100 }
            }
        }
    });
}

// Active Users + Query Volume Combo Chart
function createActiveUsersQueryChart(ctx) {
    const DATA_COUNT = 7;
    const labels = Utils.days({ count: DATA_COUNT });

    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    type: 'line',
                    label: 'Active Users',
                    borderColor: Utils.CHART_COLORS.red,
                    backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
                    fill: false,
                    data: Utils.numbers({ count: DATA_COUNT, min: 0, max: 100 }),
                },
                {
                    type: 'bar',
                    label: 'Query Volume',
                    data: Utils.numbers({ count: DATA_COUNT, min: 0, max: 1000 }),
                    backgroundColor: Utils.CHART_COLORS.blue,
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: true },
                title: { display: true, text: 'Query Volume and Active Users Over Time' }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ========== Chart Registry ==========

const chartDefinitions = [
    { id: 'ModelDriftChart', create: createModelDriftChart },
    { id: 'helpfullnessChart', create: createHelpfulnessChart },
    { id: 'complianceChart', create: createComplianceChart },
    { id: 'activeUsersQueryChart', create: createActiveUsersQueryChart }
];

const charts = {}; // store chart instances

// ========== Chart Initialization ==========

function initCharts() {
    chartDefinitions.forEach(def => {
        const ctx = document.getElementById(def.id)?.getContext('2d');
        if (ctx) charts[def.id] = def.create(ctx);
    });
}

// ========== Data Refresh Logic ==========

function refreshCharts() {
    Object.values(charts).forEach(chart => {
        const data = chart.data;

        switch (chart.config.type) {
            case 'bar':
                if (chart.canvas.id === 'activeUsersQueryChart') {
                    data.labels.push(`Day ${data.labels.length + 1}`);
                    data.datasets[0].data.push(Utils.rand(0, 100)); // Active Users
                    data.datasets[1].data.push(Utils.rand(0, 1000)); // Query Volume
                } else {
                    data.datasets.forEach(dataset => {
                        dataset.data = Utils.numbers({ count: data.labels.length, min: 0, max: 100 });
                    });
                }
                break;

            case 'bubble':
                data.datasets.forEach(dataset => {
                    dataset.data = dataset.data.map(() => ({
                        x: Utils.rand(1, 100),
                        y: Utils.rand(1, 100),
                        r: Utils.rand(5, 20)
                    }));
                });
                break;

            case 'line':
                data.labels.push(`Day ${data.labels.length + 1}`);
                data.datasets.forEach(dataset => dataset.data.push(Utils.rand(-100, 100)));
                break;
        }

        chart.update();
    });
}

// ========== Event Bindings ==========

document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    const refreshBtn = document.getElementById('refresh-button');
    refreshBtn.addEventListener('click', refreshCharts);
});
