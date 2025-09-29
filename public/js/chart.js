// Utility functions to use for every chart
const Utils = {
    // Day counter for X axis labels
    days({ count }) {
        return Array.from({ length: count }, (_, i) => `Day ${i + 1}`);
    },
    // Random number generator for chart data
    numbers({ count, min, max }) {
        return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
    },
    // Random number generator for a single value
    rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    // Predefined colors
    CHART_COLORS: {
        red: 'rgb(255, 99, 132)'
    },
    // Function to add transparency to colors
    transparentize(color, opacity) {
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};


// Model Drift Line Chart
// Model Drift Chart data
const DATA_COUNT = 7;
const NUMBER_CFG = { count: DATA_COUNT, min: -100, max: 100 };
const labels = Utils.days({ count: DATA_COUNT });

const data = {
    labels: labels,
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
};

// Model drift chart configuration
const config = {
    type: 'line',
    data: data,
    options: {
        responsive: true,
        plugins: {
            legend: { display: true },
            title: { display: true, text: 'Model Drift' },
            title: { display: true, text: 'Model Drift Over Time' }
        
        }
    },
};

// Initialize model drift chart
const modelDriftChart = new Chart(
    document.getElementById('ModelDriftChart'),
    config
);

// Response Helpfullness Bar Chart (helpfullness by category)
// Response Helpfulness Chart data
const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];

const helpfullnessData = {
    labels: categories,
    datasets: [{
        label: 'Helpfulness',
        data: Utils.numbers({ count: categories.length, min: 0, max: 100 }),
        backgroundColor: Utils.CHART_COLORS.red,
    }]
};

// Helpfulness chart configuration
const helpfullnessConfig = {
    type: 'bar',
    data: helpfullnessData,
    options: {
        responsive: true,
        plugins: {
            legend: { display: false },
            title: { display: true, text: 'Response Helpfulness by Category' }
        }
    }
};
// Initialize helpfulness chart
const helpfullnessChart = new Chart(
    document.getElementById('helpfullnessChart'),
    helpfullnessConfig
);

//Policy Compliance bubble chart (profanity, sensitive info, hate speech, etc.)
// Compliance Chart data
const complianceCategories = ['Profanity', 'Sensitive Info', 'Hate Speech', 'Other'];

const complianceData = {
    labels: complianceCategories,
    datasets: [{
        label: 'Compliance Issues',
        data: complianceCategories.map(() => ({
            x: Utils.rand(1, 100),
            y: Utils.rand(1, 100),
            r: Utils.rand(5, 20)
        })),
        backgroundColor: Utils.transparentize(Utils.CHART_COLORS.red, 0.5),
        borderColor: Utils.CHART_COLORS.red,
        borderWidth: 1
    }]
};

// Compliance chart configuration
const complianceConfig = {
    type: 'bubble',
    data: complianceData,
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
};
// Initialize compliance chart
const complianceChart = new Chart(
    document.getElementById('complianceChart'),
    complianceConfig
);

//Query volume + active users combo chart (line + bar)  
// Active Users + Query Volume Chart data
const activeUserQueryLabels = Utils.days({ count: DATA_COUNT });

const activeUsersQueryData = {
    labels: activeUserQueryLabels,
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
};

// Active Users + Query Volume chart configuration
const activeUserQueryConfig = {
    type: 'bar',
    data: activeUsersQueryData,
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
};
// Initialize active users + query volume chart
const activeUsersQueryChart = new Chart(
    document.getElementById('activeUsersQueryChart'),
    activeUserQueryConfig
);

// Array of all charts for easy access
const charts = [modelDriftChart, helpfullnessChart, complianceChart, activeUsersQueryChart];

// Action buttons to change chart data.  NOTE: Currently only using one action. Can add more if needed.
const actions = [
    {
        // Action to randomly generate data for all charts
        name: 'Refresh Data',
        handler(chart) {
            const data = chart.data;
            if (data.datasets.length > 0) {
                // For bar charts
                if (chart.config.type === 'bar') {
                    if (chart === activeUsersQueryChart) {
                        // For active users + query volume chart
                        data.labels = Utils.days({ count: data.labels.length + 1 });
                        data.datasets[0].data.push(Utils.rand(0, 100)); // Active Users
                        data.datasets[1].data.push(Utils.rand(0, 1000)); // Query Volume
                    } else {
                        data.datasets.forEach(dataset => dataset.data = Utils.numbers({ count: categories.length, min: 0, max: 100 }));
                    }
                } else if (chart.config.type === 'bubble') {
                    // For bubble chart (compliance)
                    data.datasets.forEach(dataset => {
                        dataset.data = dataset.data.map(() => ({
                            x: Utils.rand(1, 100),
                            y: Utils.rand(1, 100),
                            r: Utils.rand(5, 20)
                        }));
                    });
                } else {
                    // For line chart (model drift)
                    data.labels = Utils.days({ count: data.labels.length + 1 });
                    data.datasets.forEach(dataset => dataset.data.push(Utils.rand(-100, 100)));
                }
                chart.update();
            }
        }
    },
];

// Create buttons for every action and attach event handlers
actions.forEach(action => {
    const btn = document.createElement('button');
    btn.innerText = `${action.name}`;
    //Add listener to every chart
    btn.addEventListener('click', () => charts.forEach(chart => action.handler(chart)));
    document.body.appendChild(btn);
});