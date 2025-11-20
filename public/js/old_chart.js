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

function getHashedColor(str) {
    let hash = 2;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = Object.values(Utils.CHART_COLORS);
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}

const charts = {};
let allLogs = {};
let allConfigs = [];

const CACHE_MAX_POINTS = 15; // Maximum points to store in cache
const TINY_CACHE_MAX_POINTS = 8;
let isReloadingCharts = false;

function getCurrentModel() {
    const select = document.getElementById('model-select');
    return select?.value || 'good';
}

function clearDynamicCharts() {
    document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());
    document.querySelectorAll('.tiny-group-wrapper').forEach(wrapper => wrapper.remove());

    for (const id in charts) {
        if (charts[id] instanceof Chart) {
            charts[id].destroy();
        }
        delete charts[id];
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
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                labels: {
                    font: {
                        size: 14 // Default legend font size
                    }
                }
            },
            title: {
                display: true,
                text: config.title,
                font: { size: 16 }, // Default title font size
                color: 'dimgray'
            }
        },
        scales: {
            x: {
                display: true,
                ticks: {
                    font: {
                        size: 12
                    }
                }
            },
            y: {
                display: true,
                ticks: {
                    font: {
                        size: 12
                    }
                }
            }
        },
        devicePixelRatio: 3
    };

    if (config.chartSize === 'tiny') {
        options.plugins.legend.display = false; // Hide legend
        options.scales = { // Hide all axes
            x: { display: false },
            y: { display: true }
        };
        options.plugins.title.font = { size: 12 }; // Use a smaller font
        options.plugins.title.padding = { top: 5, bottom: 5 }; // Give title a little space

        // Remove all padding *inside* the canvas
        options.layout = { padding: 0 };
    }
    else if (config.chartSize === 'regular') {
        const regularTickSize = 10;

        // Slightly smaller title
        options.plugins.title.font = { size: 14 };

        // Slightly smaller legend labels
        options.plugins.legend.labels.font = { size: 10 };

        options.scales.x.ticks.font = { size: regularTickSize };
        options.scales.y.ticks.font = { size: regularTickSize };
    }

    let data = { labels: [], datasets: [] };

    return new Chart(ctx, {
        type: (config.chartType === 'pie') ? 'doughnut' : config.chartType,
        data: data,
        options: options
    });
}

function mapLineData(chart, config, logs) {
    const maxPoints = (config.chartSize === 'tiny') ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;

    // Helper function to get the correct slice of logs
    const getLogSlice = (logArray) => logArray.slice(-maxPoints);

    const yField = config.yAxis;

    // Multi-Model, Split (by modelName)
    if (config.splitBy === 'modelName') {
        const allModelLogs = logs;
        const modelNames = Object.keys(allModelLogs);
        if (modelNames.length === 0) return;

        const slicedLogs = getLogSlice(allModelLogs[modelNames[0]]);
        const labels = slicedLogs.map(log =>
            new Date(log.responseTimestamp).toLocaleTimeString()
        );

        const datasets = modelNames.map(modelName => {
            const modelLogs = getLogSlice(allModelLogs[modelName] || []);
            const color = getHashedColor(modelName);
            const data = modelLogs.map(log => log[yField]);

            return {
                label: modelName,
                data: data,
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                fill: true,
                tension: 0.3
            };
        });

        chart.data.labels = labels;
        chart.data.datasets = datasets;
    }
    // Single-Model, Split (by topic, etc.)
    else if (config.splitBy) {
        const slicedLogs = getLogSlice(logs);
        const splitField = config.splitBy; // e.g., 'topic'
        const groups = {};

        slicedLogs.forEach(log => {
            const key = log[splitField] || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        });

        const labels = slicedLogs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());

        // Create a dataset for each group
        const datasets = Object.keys(groups).map(key => {
            const groupLogs = groups[key];
            const color = getHashedColor(key); // Color by group
            const data = groupLogs.map(log => log[yField]);

            return {
                label: key,
                data: data,
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                fill: true,
                tension: 0.3
            };
        });

        chart.data.labels = labels;
        chart.data.datasets = datasets;
    }
    // Single-Model, No Split (Default)
    else {
        const slicedLogs = getLogSlice(logs);
        const labels = slicedLogs.map(log => new Date(log.responseTimestamp).toLocaleTimeString());
        const data = slicedLogs.map(log => log[yField]);
        const color = getHashedColor(config.title);

        chart.data.labels = labels;
        chart.data.datasets = [{
            label: config.yAxis,
            data: data,
            borderColor: color,
            backgroundColor: Utils.transparentize(color, 0.5),
            fill: true,
            tension: 0.3
        }];
    }

    // Set Y-axis title if its not tiny
    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        // modify scales dont replace it
        chart.options.scales.y.title = {
            display: true,
            text: yField
        };
    }
}

function mapBarData(chart, config, logs) {
    const groups = {};
    const xField = config.xAxis;
    const yField = config.yAxis;

    const allModelLogs = Object.values(logs).flat();

    allModelLogs.forEach(log => {
        const key = log[xField];
        if (!groups[key]) {
            groups[key] = { sum: 0, count: 0 };
        }
        groups[key].sum += log[yField];
        groups[key].count += 1; // Use 1, not queryCount, for avg
    });


    const labels = Object.keys(groups);

    // Map each label to its own hashed color
    const colors = labels.map(label => getHashedColor(label));
    const backgroundColors = colors.map(color => Utils.transparentize(color, 0.7));
    chart.data.labels = labels;
    chart.data.datasets = [{
        label: `Average ${yField}`,
        data: Object.values(groups).map(g => g.sum / g.count),
        backgroundColor: backgroundColors
    }];

    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        chart.options.scales.y.title = {
            display: true,
            text: yField
        };
    }
}

function mapPieData(chart, config, logs) {
    const groups = {};
    const categoryField = config.category;

    const allModelLogs = Object.values(logs).flat();

    allModelLogs.forEach(log => {
        const key = log[categoryField];
        if (!groups[key]) {
            groups[key] = { sum: 0 };
        }
        groups[key].sum += log.queryCount;
    });

    const labels = Object.keys(groups);

    // Map each label to its own hashed color
    const colors = labels.map(label => getHashedColor(label));

    chart.options.scales = {
        y: {
            display: false,
        }
    };

    chart.data.labels = labels;
    chart.data.datasets = [{
        label: 'Total Queries',
        data: Object.values(groups).map(g => g.sum),
        backgroundColor: colors
    }];
}

function mapMeasureData(element, config, logs) {
    const yField = config.yAxis; // e.g., 'policyCompliance'

    // ToDo: this method always returns the value in the current log so I think its accurate on refresh, but since the SSE only has 1 log then it just displays that value.

    // For 'measure', we will average the field over the log window
    const values = logs.map(log => log[yField]);
    let avg = 0;
    if (values.length > 0) {
        avg = values.reduce((a, b) => a + b, 0) / values.length;
    }

    const contentWrapper = element.querySelector('.kpi-content-wrapper');

    if (!contentWrapper) {
        console.error("kpi-content-wrapper not found in measure card:", element);
        return;
    }

    // Inject KPI HTML
    contentWrapper.innerHTML = `
    <h3 class="kpi-title">${config.title}</h3>
    <div class="kpi-value">${avg.toFixed(1)}</div>
  `;
}

async function loadChartsFromDatabase() {
    if (isReloadingCharts) return; // Don't run if already running
    isReloadingCharts = true;
    try {
        const response = await fetch(`/api/recentData`);
        if (!response.ok) {
            console.error('Failed to fetch initial chart data');
            return;
        }

        const data = await response.json();
        allLogs = data.logs;
        allConfigs = data.configs;

        //Clear old dynamic charts and inject new ones
        clearDynamicCharts();
        const container = document.querySelector('.charts-container');

        // This state variable will holds "tiny chart" group
        // so we can add multiple tiny charts to it in a row.
        let currentTinyGroup = null;

        for (const config of allConfigs) {
            const chartSize = config.chartSize || 'regular';

            const chartCard = document.createElement('div');
            chartCard.className = `chart-card dynamic-chart-card chart-${chartSize}`;

            // Create and append the delete button
            const isAdmin = document.querySelector("#isAdmin");
            if (isAdmin) {
                // Delete Button
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-chart-btn';
                deleteBtn.innerHTML = '&times;';
                deleteBtn.setAttribute('data-id', config._id);
                chartCard.appendChild(deleteBtn);

                // Edit Button
                const editBtn = document.createElement('span');
                editBtn.className = 'edit-chart-btn';
                editBtn.innerHTML = '✏️'; // You can use an icon font later
                editBtn.setAttribute('data-id', config._id);
                chartCard.appendChild(editBtn);

            } else {
                // Non-admin, do nothing
            }

            const editFormContainer = document.createElement('div');
            editFormContainer.className = 'edit-chart-form';
            editFormContainer.id = `edit-form-${config._id}`;
            chartCard.appendChild(editFormContainer);
            chartCard.dataset.id = config._id;

            if (chartSize === 'tiny') {
                if (!currentTinyGroup || currentTinyGroup.childElementCount >= 4) {
                    currentTinyGroup = document.createElement('div');
                    currentTinyGroup.className = 'chart-card-group tiny-group-wrapper';

                    currentTinyGroup.id = `tiny-wrapper-for-${config._id}`;

                    container.appendChild(currentTinyGroup);

                    new Sortable(currentTinyGroup, {
                        group: {
                            name: 'tiny-charts',
                            put: function (to) {
                                return to.el.children.length < 4;
                            }
                        },
                        animation: 150,
                        preventOnFilter: true,
                        onEnd: saveNewOrder
                    });
                }
                currentTinyGroup.appendChild(chartCard);
            } else {
                currentTinyGroup = null;
                container.appendChild(chartCard);
            }

            if (config.chartType === 'measure') {
                // Create a KPI card
                chartCard.classList.add('kpi-card');
                chartCard.id = config._id;

                const kpiContentWrapper = document.createElement('div');
                kpiContentWrapper.className = 'kpi-content-wrapper';
                chartCard.appendChild(kpiContentWrapper);

                // Store the *HTML element* in charts object
                chartCard.customConfig = config;
                charts[config._id] = chartCard;
            } else {
                // Create a canvas-based chart
                const canvas = document.createElement('canvas');
                canvas.id = config._id; // Use DB ID as canvas ID
                chartCard.appendChild(canvas);
                // Create the chart skeleton and store it
                const ctx = canvas.getContext('2d');
                const newChart = createChartFromConfig(config, ctx);
                newChart.customConfig = config;
                charts[config._id] = newChart;
            }
        }

        populateAllCharts();

    } catch (err) {
        console.error('Error loading data from database:', err);
    } finally {
        isReloadingCharts = false; // turn off the lock
    }
}

function populateAllCharts() {
    const activeModel = getCurrentModel();

    // Check if allLogs is populated
    if (!allLogs || Object.keys(allLogs).length === 0) {
        console.warn("populateAllCharts called, but allLogs is empty.");
        return;
    }

    // Get the logs for the *currently selected* model
    const activeModelLogs = allLogs[activeModel];

    // If there's no data for this model, skip
    if (!activeModelLogs) {
        console.warn(`No log data found for active model: ${activeModel}`);
        console.log("Available keys in allLogs:", Object.keys(allLogs));
        return;
    }

    // Loop through configs and populate dynamic charts
    for (const config of allConfigs) {
        const chartOrElem = charts[config._id];
        if (!chartOrElem) continue;

        const chartConfig = chartOrElem.customConfig;


        // Router Logic
        // Multi-Model charts
        if (chartConfig.splitBy === 'modelName' ||
            chartConfig.xAxis === 'modelName' ||
            chartConfig.category === 'modelName') {
            // This is a "Multi-Model" chart. It needs *all* data.
            switch (chartConfig.chartType) {
                case 'line':
                    mapLineData(chartOrElem, chartConfig, allLogs);
                    break;
                    break;
                case 'bar':
                    // mapBarData needs all logs to group them by model
                    mapBarData(chartOrElem, chartConfig, allLogs);
                    break;
                case 'pie':
                    // mapPieData needs all logs to group them
                    mapPieData(chartOrElem, chartConfig, allLogs);
                    break;
            }
            // Single Model Split Charts
        } else if (chartConfig.splitBy) {
            const activeModelLogs = allLogs[activeModel];
            if (!activeModelLogs) continue;

            switch (chartConfig.chartType) {
                case 'line':
                    mapLineData(chartOrElem, chartConfig, activeModelLogs);
                    break;
                case 'bar':
                    mapBarData(chartOrElem, chartConfig, activeModelLogs);
                    break;
                case 'pie':
                    mapPieData(chartOrElem, chartConfig, activeModelLogs);
                    break;
            }
        }
        // Single Model Charts
        else {
            const activeModelLogs = allLogs[activeModel];
            if (!activeModelLogs) continue;
            // Single Model Logic
            switch (chartConfig.chartType) {
                case 'line':
                    mapLineData(chartOrElem, chartConfig, activeModelLogs);
                    break;
                case 'bar':
                    mapBarData(chartOrElem, chartConfig, activeModelLogs);
                    break;
                case 'pie':
                    mapPieData(chartOrElem, chartConfig, activeModelLogs);
                    break;
                case 'measure':
                    mapMeasureData(chartOrElem, chartConfig, activeModelLogs);
                    break;
            }
        }
    }

    // 3. Update all charts at once
    Object.values(charts).forEach(chart => {
        if (chart instanceof Chart) {
            chart.update('none');
        }
    });
}

// ---------- SSE updates ----------
function setupSSE() {
    if (window.__chartEvtSource) {
        try { window.__chartEvtSource.close(); } catch (e) { console.warn('Error closing previous EventSource', e); }
    }

    // Create new EventSource and keep a reference for future closes
    const evtSource = new EventSource('/events');
    window.__chartEvtSource = evtSource;

    evtSource.onmessage = (event) => {
        if (isReloadingCharts) {
            console.log("Skipping SSE update, charts are reloading.");
            return;
        }

        const data = JSON.parse(event.data); // data = { GoodModel: {...}, BadModel: {...} }
        const now = new Date().toLocaleTimeString();
        const activeModel = getCurrentModel();

        // --- UNIVERSAL UPDATE LOOP ---
        for (const id in charts) {
            const chartOrElem = charts[id];
            const config = chartOrElem.customConfig;

            if (!config || !config.yAxis) continue;

            // --- SSE ROUTER LOGIC ---
            if (config.splitBy === 'modelName' ||
                config.xAxis === 'modelName' ||
                config.category === 'modelName') {
                const chart = chartOrElem;

                const maxPoints = (config.chartSize === 'tiny') ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;

                // Bar and Pie are aggregations and will update on refresh/model-change
                if (config.chartType === 'line') {

                    chart.data.labels.push(now);

                    chart.data.datasets.forEach(dataset => {
                        const modelName = dataset.label; // The label IS the model name
                        const modelData = data[modelName];
                        if (!modelData) return; // No data for this dataset

                        const newValue = modelData[config.yAxis];

                        if (newValue === undefined) return;

                        let dataToPush = newValue;

                        if (config.splitBy === 'modelName') {
                            // This is a multi-model chart, find the right data
                            const modelData = data[modelName];
                            if (modelData) {
                                dataToPush = modelData[config.yAxis];
                            } else {
                                dataToPush = null; // No data for this model in this tick
                            }
                        }

                        if (dataToPush !== null) {
                            dataset.data.push(dataToPush);
                        }

                        // dataset.data.push(newValue);

                        // if (dataset.data.length > CACHE_MAX_POINTS) {
                        //     dataset.data.shift();
                        // }

                        if (dataset.data.length > maxPoints) {
                            dataset.data.shift();
                        }
                    });

                    if (chart.data.labels.length > maxPoints) {
                        chart.data.labels.shift();
                    }

                    chart.update("none");
                }
            } else {
                // Single Model Chart Logic

                const modelData = data[activeModel];
                if (!modelData) continue; // No data for this model in the SSE packet

                const newValue = modelData[config.yAxis];
                if (newValue === undefined) continue; // This model's data doesn't have this key

                switch (config.chartType) {
                    case 'line':
                        const chart = chartOrElem;

                        const maxPoints = (config.chartSize === 'tiny') ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;

                        chart.data.labels.push(now);
                        if (chart.data.datasets.length > 0) {
                            chart.data.datasets[0].data.push(newValue);
                        }

                        if (chart.data.labels.length > maxPoints) {
                            chart.data.labels.shift();
                            chart.data.datasets[0].data.shift();
                        }
                        chart.update("none");
                        break;

                    case 'measure':
                        const element = chartOrElem;
                        const kpiValue = element.querySelector('.kpi-value');
                        if (kpiValue) {
                            kpiValue.textContent = newValue.toFixed(1);
                        }
                        break;

                    case 'doughnut_special':
                        const doughnutChart = chartOrElem;
                        doughnutChart.data.datasets[0].data = [newValue, 100 - newValue];
                        doughnutChart.update("none");
                        break;
                }
            }
        }
    };

    evtSource.onerror = (err) => {
        console.warn('EventSource error', err);
    };
}

async function deleteGraph(id, chartCardElement) {
    try {
        const isAdmin = document.querySelector("#isAdmin");
        if (!isAdmin) {
            return;
        }
        const response = await fetch('/api/deleteGraph', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send the ID in the body as requested
            body: JSON.stringify({ id: id })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete graph from server');
        }


        // Destroy and remove from the global 'charts' object
        if (charts[id]) {
            if (charts[id] instanceof Chart) {
                charts[id].destroy();
            }
            delete charts[id];
        }

        // Remove the chart card from the DOM
        chartCardElement.remove();

        if (typeof showNotification === 'function') {
            showNotification('Chart deleted successfully.', 'success');
        } else {
            console.log(`Successfully deleted graph ${id}`);
        }

    } catch (error) {
        console.error('Error deleting graph:', error);
        if (typeof showNotification === 'function') {
            showNotification(`Error: ${error.message}`, 'error');
        }
    }
}

/**
 * Fetches chart config and populates/shows the inline edit form.
 */
async function openEditForm(id) {
    const formContainer = document.getElementById(`edit-form-${id}`);
    if (!formContainer) return;

    const chartCard = formContainer.closest('.chart-card');
    if (!chartCard) return;

    const canvas = chartCard.querySelector('canvas');
    const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');

    // Check if form is already open
    if (formContainer.innerHTML !== "") {
        closeEditForm(id); // Already open, so close it
        return;
    }

    try {
        const ALL_SIZE_CLASSES = ['chart-tiny', 'chart-regular', 'chart-large', 'chart-massive'];
        let originalSize = 'chart-regular'; // Default fallback

        for (const sizeClass of ALL_SIZE_CLASSES) {
            if (chartCard.classList.contains(sizeClass)) {
                originalSize = sizeClass;
                break;
            }
        }

        // Store the original size on the element
        chartCard.dataset.originalSize = originalSize;

        if (originalSize === 'chart-tiny') {
            // "Break out" of the tiny wrapper
            const wrapper = chartCard.closest('.tiny-group-wrapper');
            if (wrapper) {
                chartCard.dataset.wrapperId = wrapper.id;
                const container = wrapper.closest('.charts-container');

                if (container) {
                    container.insertBefore(chartCard, wrapper);
                }
            }
            // Force it to be regular size
            chartCard.classList.remove('chart-tiny');
            chartCard.classList.add('chart-regular');

        } else if (originalSize === 'large' || originalSize === 'massive') {
            // Do Nothing
        }

        // Hide the chart content
        if (canvas) canvas.style.display = 'none';
        if (kpiWrapper) kpiWrapper.style.display = 'none';

        // Fetch the current config
        const response = await fetch(`/api/getChartConfig/${id}`);
        if (!response.ok) throw new Error('Failed to fetch config');

        const { config } = await response.json();

        // Build and inject the form HTML
        formContainer.innerHTML = `
            <label for="edit-title-${id}">Chart Title:</label>
            <input type="text" id="edit-title-${id}" value="${config.title}">

            <label>Chart Size:</label>
            <div class="size-selector">
                <div>
                    <input type="radio" id="edit-size-tiny-${id}" name="edit-size-${id}" value="tiny" ${config.chartSize === 'tiny' ? 'checked' : ''}>
                    <label for="edit-size-tiny-${id}">Tiny</label>
                </div>
                <div>
                    <input type="radio" id="edit-size-regular-${id}" name="edit-size-${id}" value="regular" ${config.chartSize === 'regular' ? 'checked' : ''}>
                    <label for="edit-size-regular-${id}">Regular</label>
                </div>
                <div>
                    <input type="radio" id="edit-size-large-${id}" name="edit-size-${id}" value="large" ${config.chartSize === 'large' ? 'checked' : ''}>
                    <label for="edit-size-large-${id}">Large</label>
                </div>
                <div>
                    <input type="radio" id="edit-size-massive-${id}" name="edit-size-${id}" value="massive" ${config.chartSize === 'massive' ? 'checked' : ''}>
                    <label for="edit-size-massive-${id}">Massive</label>
                </div>
             </div>

             <div class="form-actions">
                <button type="button" class="cancel-edit-btn" data-id="${id}">Cancel</button>
                <button type="button" class="save-edit-btn" data-id="${id}">Save</button>
            </div>
        `;

        // 3. Show the form
        formContainer.style.display = 'block';

    } catch (error) {
        console.error('Error opening edit form:', error);
        formContainer.innerHTML = '<p style="color: red;">Error loading data.</p>';
        formContainer.style.display = 'block';
    }
}

/**
 * Hides and clears the inline edit form.
 */
function closeEditForm(id) {
    const formContainer = document.getElementById(`edit-form-${id}`);
    if (!formContainer) return;

    const chartCard = formContainer.closest('.chart-card');
    if (!chartCard) return;

    const canvas = chartCard.querySelector('canvas');
    const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');

    const originalSize = chartCard.dataset.originalSize || 'chart-regular';
    const ALL_SIZE_CLASSES = ['chart-tiny', 'chart-regular', 'chart-large', 'chart-massive'];

    chartCard.classList.remove(...ALL_SIZE_CLASSES);
    chartCard.classList.add(originalSize);
    delete chartCard.dataset.originalSize; // Clean up

    // If this card was broken out of a wrapper, put it back.
    if (chartCard.dataset.wrapperId) {
        const wrapper = document.getElementById(chartCard.dataset.wrapperId);
        if (wrapper) {
            wrapper.appendChild(chartCard);
        }
        delete chartCard.dataset.wrapperId; // Clean up
    }

    if (canvas) canvas.style.display = 'block';
    if (kpiWrapper) kpiWrapper.style.display = 'flex'; // KPIs use flex

    // Hide and clear the form
    formContainer.style.display = 'none';
    formContainer.innerHTML = ''; // This fixes the edit-cancel-edit bug
}

/**
 * Gathers data from form, POSTs to update endpoint, and reloads charts.
 */
async function handleSaveEdit(id) {
    const newTitle = document.getElementById(`edit-title-${id}`).value;
    const newSize = document.querySelector(`input[name="edit-size-${id}"]:checked`).value;

    try {
        const response = await fetch('/api/updateGraph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, newTitle, newSize })
        });

        if (!response.ok) throw new Error('Failed to save changes.');

        // Success!
        await loadChartsFromDatabase();

        if (typeof showNotification === 'function') {
            showNotification('Chart updated!', 'success');
        }

    } catch (error) {
        console.error('Error saving chart:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error: ' + error.message, 'error');
        }
    }
}

function resetCharts() {
    window.location.reload();
}

/**
    * Drag and Drop helper
    * Walks the DOM, builds a flat array of all chart IDs in their new order,
    * and sends it to the backend.
    */
async function saveNewOrder() {
    const mainContainer = document.querySelector('.charts-container');
    if (!mainContainer) return;

    let newOrderArray = [];

    for (const child of mainContainer.children) {

        // If it's a regular/large/massive card, just add its ID.
        // We check for dataset.id to make sure it's a chart card.
        if (child.classList.contains('chart-card') && child.dataset.id) {
            newOrderArray.push({ id: child.dataset.id });
        }

        // If it's a tiny group wrapper
        if (child.classList.contains('tiny-group-wrapper')) {
            for (const tinyCard of child.children) {
                if (tinyCard.dataset.id) {
                    newOrderArray.push({ id: tinyCard.dataset.id });
                }
            }
        }
    }

    try {
        const response = await fetch('/api/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newOrder: newOrderArray })
        });

        if (!response.ok) {
            throw new Error('Server failed to save new order.');
        }

        console.log('New chart order saved.');
        if (typeof showNotification === 'function') {
            showNotification('Chart order saved!', 'success');
        }

        //Refresh the layout
        await loadChartsFromDatabase();

    } catch (error) {
        console.error('Error saving chart order:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error: Could not save chart order.', 'error');
        }
    }
}

// ---------- Setup ----------
window.myChartUtils = {
    resetCharts
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadChartsFromDatabase();
    setupSSE();

    // Close EventSource on unload to avoid lingering connections
    window.addEventListener('beforeunload', () => {
        try { if (window.__chartEvtSource) { window.__chartEvtSource.close(); window.__chartEvtSource = null; } } catch (e) { }
    });

    const modelSelect = document.getElementById('model-select');
    modelSelect?.addEventListener('change', () => {
        populateAllCharts();
    });

    // Delete / Edit Chart Listener
    document.querySelector('.charts-container').addEventListener('click', function (event) {

        // --- 1. Handle DELETE Button ---
        const deleteBtn = event.target.closest('.delete-chart-btn');
        if (deleteBtn) {
            const chartId = deleteBtn.dataset.id;
            const chartCard = deleteBtn.closest('.chart-card');
            let chartTitle = chartId;
            const chartInstance = charts[chartId];

            if (chartInstance && chartInstance.customConfig) {
                chartTitle = chartInstance.customConfig.title;
            }

            if (confirm(`Are you sure you want to delete the chart "${chartTitle}"?`)) {
                deleteGraph(chartId, chartCard);
            }
            return; // Done
        }

        // --- 2. Handle EDIT Button ---
        const editBtn = event.target.closest('.edit-chart-btn');
        if (editBtn) {
            const chartId = editBtn.dataset.id;
            openEditForm(chartId); // This function will fetch data and toggle
            return; // Done
        }

        // --- 3. Handle CANCEL Button ---
        const cancelBtn = event.target.closest('.cancel-edit-btn');
        if (cancelBtn) {
            const chartId = cancelBtn.dataset.id;
            closeEditForm(chartId);
            return; // Done
        }

        // --- 4. Handle SAVE Button ---
        const saveBtn = event.target.closest('.save-edit-btn');
        if (saveBtn) {
            const chartId = saveBtn.dataset.id;
            handleSaveEdit(chartId);
            return; // Done
        }
    });

    const mainContainer = document.querySelector('.charts-container');
    if (mainContainer) {
        new Sortable(mainContainer, {
            group: 'main-charts',
            animation: 150,  // Smooth animation
            preventOnFilter: true,
            onEnd: saveNewOrder
        });
    }
});