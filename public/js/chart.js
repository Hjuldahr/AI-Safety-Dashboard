const Utils = {
    CHART_COLORS: {
        coral: 'rgb(244, 91, 105)',
        blue: 'rgb(0, 122, 204)',
        teal: 'rgb(44, 165, 141)',
        amber: 'rgb(255, 179, 0)',
        purple: 'rgb(142, 68, 173)',
    },
    //updated to support HEX
    transparentize(color, opacity) {
        if (!color) return `rgba(0,0,0,${opacity})`;

        // Handle Hex (e.g. #FF0000)
        if (color.startsWith('#')) {
            let c = color.substring(1).split('');
            if (c.length === 3) c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
        }
        // Handle RGB/RGBA
        return color.replace('rgb', 'rgba').replace(')', `, ${opacity})`);
    }
};

function getHashedColor(str) {
    let hash = 2;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

// Reads deep paths like "breakdown.topic" or "tokensUsed"
function getValueFromPath(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const charts = {};
let allLogs = {};
let allConfigs = [];

const CACHE_MAX_POINTS = 15;
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
        if (charts[id] instanceof Chart) charts[id].destroy();
        delete charts[id];
    }
}

// ---------- Chart Skeleton ----------
function createChartFromConfig(config, ctx) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: true, labels: { font: { size: 14 } } },
            title: { display: true, text: config.title, font: { size: 16 }, color: 'dimgray' }
        },
        scales: {
            x: { display: true, ticks: { font: { size: 12 } } },
            y: { display: true, ticks: { font: { size: 12 }, min: 0 } }
        },
        devicePixelRatio: 3
    };

    if (config.chartSize === 'tiny') {
        options.plugins.legend.display = false;
        options.scales = { x: { display: false }, y: { display: true } };
        options.plugins.title.font.size = 12;
        options.plugins.title.padding = { top: 5, bottom: 5 };
        options.layout = { padding: 0 };
    } else if (config.chartSize === 'regular') {
        options.plugins.title.font.size = 14;
        options.plugins.legend.labels.font.size = 10;
        options.scales.x.ticks.font.size = 10;
        options.scales.y.ticks.font.size = 10;
    }

    return new Chart(ctx, {
        type: config.chartType === 'pie' ? 'doughnut' : config.chartType,
        data: { labels: [], datasets: [] },
        options
    });
}

// ---------- Data Mappers ----------
function mapLineData(chart, config, logs) {
    const maxPoints = config.chartSize === 'tiny' ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;
    const yConfig = DATA_DICTIONARY[config.yAxis];
    const splitConfig = config.splitBy ? DATA_DICTIONARY[config.splitBy] : null;

    if (!yConfig) return;

    let flatLogs = Array.isArray(logs) ? logs : Object.values(logs).flat();

    // Group logs by Timestamp
    const logsByTime = {};
    flatLogs.forEach(log => {
        const t = log.responseTimestamp;
        if (!logsByTime[t]) logsByTime[t] = [];
        logsByTime[t].push(log);
    });

    // Sort unique timestamps and take the last 'maxPoints' (e.g., 15)
    // Use timestamp as the Source of Truth for the X-Axis
    const sortedTimestamps = Object.keys(logsByTime)
        .map(Number) // Convert string keys back to numbers
        .sort((a, b) => a - b)
        .slice(-maxPoints);

    // Generate Labels
    chart.data.labels = sortedTimestamps.map(ts => new Date(ts).toLocaleTimeString());

    // Generate Datasets
    chart.data.datasets = [];

    // --- CASE A: SPLIT CHART ---
    if (splitConfig && splitConfig.acceptedValues) {

        splitConfig.acceptedValues.forEach(categoryValue => {
            const dataPoints = [];

            // For every timestamp on the X-axis...
            sortedTimestamps.forEach(ts => {
                const logsAtThisTime = logsByTime[ts];
                let val = null;

                // Find the specific log in this bucket that matches our category
                if (config.splitBy === 'modelName') {
                    const match = logsAtThisTime.find(l => l.modelName === categoryValue);
                    if (match) val = getValueFromPath(match, yConfig.dbPath);
                }
                else {
                    const match = logsAtThisTime.find(l => l.breakdown && l.breakdown[categoryValue] && l.breakdown[categoryValue].type === config.splitBy);
                    if (match) val = match.breakdown[categoryValue][config.yAxis];
                }

                dataPoints.push(val !== undefined ? val : null);
            });

            const color = getHashedColor(categoryValue);
            chart.data.datasets.push({
                label: categoryValue,
                data: dataPoints,
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                tension: 0.3,
                spanGaps: true
            });
        });
    }

    // --- STANDARD CHART ---
    else {
        const dataPoints = sortedTimestamps.map(ts => {
            const logsAtThisTime = logsByTime[ts];
            const currentModel = getCurrentModel();
            const match = logsAtThisTime.find(l => l.modelName === currentModel) || logsAtThisTime[0];

            return getValueFromPath(match, yConfig.dbPath);
        });

        const color = yConfig.color || getHashedColor(config.title);
        chart.data.datasets.push({
            label: yConfig.label,
            data: dataPoints,
            borderColor: color,
            backgroundColor: Utils.transparentize(color, 0.5),
            fill: true,
            tension: 0.3
        });
    }

    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        chart.options.scales.y.title = { display: true, text: yConfig.label };
        chart.options.scales.y.min = 0;
    }
}

function mapBarData(chart, config, logs) {
    const xConfig = DATA_DICTIONARY[config.xAxis];
    const yConfig = DATA_DICTIONARY[config.yAxis];

    if (!xConfig || !yConfig) return;

    const groups = {};
    const flatLogs = Array.isArray(logs) ? logs : Object.values(logs).flat();

    flatLogs.forEach(log => {
        // Handle Categorical Splits (Topic/Subtopic)
        // These are special because they are arrays/objects inside 'breakdown', not simple fields
        if (xConfig.dbPath.startsWith('breakdown.')) {
            if (log.breakdown) {
                Object.keys(log.breakdown).forEach(key => {
                    const item = log.breakdown[key];
                    // Match the type
                    if (item.type === config.xAxis) {
                        if (!groups[key]) groups[key] = { sum: 0, count: 0 };

                        const val = item[config.yAxis]; // Value is inside the breakdown object
                        if (val !== undefined) {
                            groups[key].sum += val;
                            groups[key].count += 1;
                        }
                    }
                });
            }
        }
        // Handle Standard Fields (e.g. ModelName)
        else {
            const key = getValueFromPath(log, xConfig.dbPath) || 'unknown';
            if (!groups[key]) groups[key] = { sum: 0, count: 0 };

            const val = getValueFromPath(log, yConfig.dbPath);
            if (val !== undefined) {
                groups[key].sum += val;
                groups[key].count += 1;
            }
        }
    });

    const labels = Object.keys(groups);
    const data = labels.map(label => {
        const g = groups[label];
        return g.count ? (g.sum / g.count) : 0;
    });

    chart.data.labels = labels;
    chart.data.datasets = [{
        label: `Average ${yConfig.label}`,
        data: data,
        // Use hashed colors for bars so they look distinct
        backgroundColor: labels.map(l => Utils.transparentize(getHashedColor(l), 0.7)),
        borderColor: labels.map(l => getHashedColor(l)),
        borderWidth: 1
    }];

    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        chart.options.scales.y.title = { display: true, text: yConfig.label };
    }
}

function mapPieData(chart, config, logs) {
    const catConfig = DATA_DICTIONARY[config.category];
    if (!catConfig) return;

    const groups = {};
    const flatLogs = Array.isArray(logs) ? logs : Object.values(logs).flat();

    flatLogs.forEach(log => {
        // Handle Breakdown Fields (Topic / Subtopic)
        // We check if the dictionary says this field lives inside "breakdown."
        if (catConfig.dbPath.startsWith('breakdown.')) {
            if (log.breakdown) {
                Object.keys(log.breakdown).forEach(key => {
                    const item = log.breakdown[key];

                    // We check if the item type matches the config ID (e.g. 'topic')
                    if (item.type === config.category) {
                        if (!groups[key]) groups[key] = { sum: 0 };
                        // Add the count from the pre-aggregated log
                        groups[key].sum += (item.count || 0);
                    }
                });
            }
        }

        // Handle Standard Fields (e.g. ModelName)
        else {
            // Use the helper to find the category value
            const key = getValueFromPath(log, catConfig.dbPath) || 'unknown';
            if (!groups[key]) groups[key] = { sum: 0 };

            // For standard logs, each entry counts as 1 query (or use queryCount if available)
            groups[key].sum += (log.queryCount || 1);
        }
    });

    const labels = Object.keys(groups);
    const data = Object.values(groups).map(g => g.sum);

    chart.data.labels = labels;
    chart.data.datasets = [{
        label: 'Total Queries',
        data: data,
        backgroundColor: labels.map(k => getHashedColor(k))
    }];

    chart.options.scales = { y: { display: false }, x: { display: false } };
}

function mapMeasureData(element, config, logs) {
    const yConfig = DATA_DICTIONARY[config.yAxis];
    if (!yConfig) return;
    const values = logs.map(l => getValueFromPath(l, yConfig.dbPath));
    // Filter out undefined/nulls before averaging
    const validValues = values.filter(v => v !== undefined && v !== null);
    const avg = validValues.length ? validValues.reduce((a, b) => a + b) / validValues.length : 0;

    const wrapper = element.querySelector('.kpi-content-wrapper');
    if (wrapper) {
        wrapper.innerHTML = `
            <h3 class="kpi-title">${config.title}</h3>
            <div class="kpi-value">${avg.toFixed(1)}</div>
        `;
    }
}

// ---------- Load / Populate Charts ----------
async function loadChartsFromDatabase() {
    if (isReloadingCharts) return;
    isReloadingCharts = true;
    try {
        const response = await fetch(`/api/recentData`);
        if (!response.ok) throw new Error('Failed to fetch initial chart data');
        const data = await response.json();
        allLogs = data.logs || {};
        allConfigs = data.configs || [];

        clearDynamicCharts();
        const container = document.querySelector('.charts-container');
        let currentTinyGroup = null;

        for (const config of allConfigs) {
            const chartSize = config.chartSize || 'regular';
            const chartCard = document.createElement('div');
            chartCard.className = `chart-card dynamic-chart-card chart-${chartSize}`;
            chartCard.dataset.id = config._id;

            // Admin buttons
            const isAdmin = document.querySelector("#isAdmin");
            if (isAdmin) {
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-chart-btn';
                deleteBtn.dataset.id = config._id;
                deleteBtn.innerHTML = '&times;';
                chartCard.appendChild(deleteBtn);

                const editBtn = document.createElement('span');
                editBtn.className = 'edit-chart-btn';
                editBtn.dataset.id = config._id;
                editBtn.innerHTML = '✏️';
                chartCard.appendChild(editBtn);
            }

            const editFormContainer = document.createElement('div');
            editFormContainer.className = 'edit-chart-form';
            editFormContainer.id = `edit-form-${config._id}`;
            chartCard.appendChild(editFormContainer);

            if (chartSize === 'tiny') {
                if (!currentTinyGroup || currentTinyGroup.childElementCount >= 4) {
                    currentTinyGroup = document.createElement('div');
                    currentTinyGroup.className = 'chart-card-group tiny-group-wrapper';
                    container.appendChild(currentTinyGroup);
                }
                currentTinyGroup.appendChild(chartCard);

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
            } else {
                currentTinyGroup = null;
                container.appendChild(chartCard);
            }

            if (config.chartType === 'measure') {
                chartCard.classList.add('kpi-card');
                const kpiWrapper = document.createElement('div');
                kpiWrapper.className = 'kpi-content-wrapper';
                chartCard.appendChild(kpiWrapper);
                chartCard.customConfig = config;
                charts[config._id] = chartCard;
            } else {
                const canvas = document.createElement('canvas');
                canvas.id = config._id;
                chartCard.appendChild(canvas);
                const ctx = canvas.getContext('2d');
                const chart = createChartFromConfig(config, ctx);
                chart.customConfig = config;
                charts[config._id] = chart;
            }
        }

        populateAllCharts();
    } catch (err) {
        console.error('Error loading charts:', err);
    } finally {
        isReloadingCharts = false;
    }
}

function populateAllCharts() {
    const activeModel = getCurrentModel();
    if (!allLogs || !Object.keys(allLogs).length) return;
    const activeModelLogs = allLogs[activeModel];
    if (!activeModelLogs) return;

    for (const config of allConfigs) {
        const chartOrElem = charts[config._id];
        if (!chartOrElem) continue;

        switch (config.chartType) {
            case 'line': mapLineData(chartOrElem, config, config.splitBy === 'modelName' ? allLogs : activeModelLogs); break;
            case 'bar': mapBarData(chartOrElem, config, allLogs); break;
            case 'pie': mapPieData(chartOrElem, config, allLogs); break;
            case 'measure': mapMeasureData(chartOrElem, config, activeModelLogs); break;
        }

        if (chartOrElem instanceof Chart) chartOrElem.update('none');
    }
}

// ---------- SSE Updates (batched) ----------
function setupSSE() {
    const evtSource = new EventSource('/events');
    window.__chartEvtSource = evtSource;

    let pendingUpdates = [];
    let rafScheduled = false;

    function processUpdates() {
        pendingUpdates.forEach(({ id, newValue, now }) => {
            const chartOrElem = charts[id];
            const config = chartOrElem?.customConfig;
            if (!config) return; // Safety check

            const modelData = newValue[getCurrentModel()];
            if (!modelData) return;

            // Line Charts and Measure
            if (config.chartType === 'line') {
                const maxPoints = (config.chartSize === 'tiny') ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;
                const chart = chartOrElem;

                let limit = maxPoints;

                // Update Time Labels
                chart.data.labels.push(now);
                if (chart.data.labels.length > limit) chart.data.labels.shift();

                // Split Logic
                if (config.splitBy) {
                    if (modelData.breakdown) {
                        chart.data.datasets.forEach(dataset => {
                            const categoryKey = dataset.label; // e.g., "Customer Support"

                            // Handle Model Name Split
                            if (config.splitBy === 'modelName') {
                                // Note: SSE sends data for *all* models keyed by model name
                                const specificModelData = newValue[categoryKey];
                                if (specificModelData) {
                                    const val = getValueFromPath(specificModelData, DATA_DICTIONARY[config.yAxis].dbPath);
                                    dataset.data.push(val);
                                } else {
                                    dataset.data.push(null);
                                }
                            }
                            // Handle Topic Split
                            else {
                                const metricObj = modelData.breakdown[categoryKey];
                                // Note: Since we pre-aggregated, the inner key is the yAxis ID (e.g. "responseTime")
                                const val = metricObj ? metricObj[config.yAxis] : null;
                                dataset.data.push(val);
                            }

                            if (dataset.data.length > limit) dataset.data.shift();
                        });
                    }
                }
                // Standard Line Logic
                else {
                    // Use the helper to find the value based on the DB Path
                    const val = getValueFromPath(modelData, DATA_DICTIONARY[config.yAxis].dbPath);

                    if (val !== undefined) {
                        chart.data.datasets[0].data.push(val);
                        if (chart.data.datasets[0].data.length > maxPoints) chart.data.datasets[0].data.shift();
                    }
                }
                chart.update('none');
            }

            else if (config.chartType === 'measure') {
                const val = modelData[config.yAxis];
                if (val !== undefined) {
                    const kpiValue = chartOrElem.querySelector('.kpi-value');
                    if (kpiValue) kpiValue.textContent = val.toFixed(1);
                }
            }

            // Bar Charts using weighted / moving average
            else if (config.chartType === 'bar') {
                const chart = chartOrElem;
                const xField = config.xAxis;
                const yField = config.yAxis;

                // Iterate through the existing bars
                chart.data.labels.forEach((label, index) => {
                    let newVal = null;

                    // Check Topic/Sub-topic
                    if ((xField === 'topic' || xField === 'sub_topic') && modelData.breakdown) {
                        if (modelData.breakdown[label]) {
                            newVal = modelData.breakdown[label][yField];
                        }
                    }
                    // Check Standard Fields
                    else if (modelData[xField] === label) {
                        // If the X-axis is something categorical like "ModelName" 
                        // and the current log belongs to that category
                        newVal = modelData[yField];
                    }

                    if (newVal !== null && newVal !== undefined) {
                        const currentVal = chart.data.datasets[0].data[index];
                        const smoothedVal = (currentVal * 0.9) + (newVal * 0.1);
                        chart.data.datasets[0].data[index] = smoothedVal;
                    }
                });
                chart.update('none');
            }

            // Pie Charts with Accumulated Counts
            else if (config.chartType === 'pie') {
                const chart = chartOrElem;
                const categoryField = config.category;

                chart.data.labels.forEach((label, index) => {
                    let countToAdd = 0;

                    // Check Topic / Sub Topic
                    if ((categoryField === 'topic' || categoryField === 'sub_topic') && modelData.breakdown) {
                        if (modelData.breakdown[label]) {
                            countToAdd = modelData.breakdown[label].count || 0;
                        }
                    }
                    // Check Standard
                    else if (modelData[categoryField] === label) {
                        countToAdd = modelData.queryCount || 1;
                    }

                    // Add to Pile
                    if (countToAdd > 0) {
                        chart.data.datasets[0].data[index] += countToAdd;
                    }
                });
                chart.update('none');
            }

        });

        pendingUpdates = [];
        rafScheduled = false;
    }

    evtSource.addEventListener('update', (event) => {
        try {
            const data = JSON.parse(event.data);
            const now = new Date().toLocaleTimeString();
            Object.keys(charts).forEach(id => pendingUpdates.push({ id, newValue: data, now }));

            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(processUpdates);
            }
        } catch (err) {
            console.error('Error processing SSE message:', err);
        }
    });

    evtSource.onerror = (err) => console.warn('EventSource error', err);
}

// ---------- Reorder ----------
async function saveNewOrder() {
    const mainContainer = document.querySelector('.charts-container');
    if (!mainContainer) return;

    const newOrderArray = [];

    for (const child of mainContainer.children) {
        if (child.classList.contains('chart-card') && child.dataset.id) {
            newOrderArray.push({ id: child.dataset.id });
        }
        if (child.classList.contains('tiny-group-wrapper')) {
            for (const tinyCard of child.children) {
                if (tinyCard.dataset.id) newOrderArray.push({ id: tinyCard.dataset.id });
            }
        }
    }

    try {
        const response = await fetch('/api/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newOrder: newOrderArray })
        });
        if (!response.ok) throw new Error('Server failed to save new order.');
        console.log('New chart order saved.');
        if (typeof showNotification === 'function') showNotification('Chart order saved!', 'success');

        await loadChartsFromDatabase();
    } catch (error) {
        console.error('Error saving chart order:', error);
        if (typeof showNotification === 'function') showNotification('Error: Could not save chart order.', 'error');
    }
}

// ---------- Editor ----------
async function openEditForm(id) {
    const formContainer = document.getElementById(`edit-form-${id}`);
    if (!formContainer) return;
    const chartCard = formContainer.closest('.chart-card');
    if (!chartCard) return;

    if (formContainer.innerHTML !== "") {
        closeEditForm(id);
        return;
    }

    try {
        const ALL_SIZE_CLASSES = ['chart-tiny', 'chart-regular', 'chart-large', 'chart-massive'];
        let originalSize = ALL_SIZE_CLASSES.find(c => chartCard.classList.contains(c)) || 'chart-regular';
        chartCard.dataset.originalSize = originalSize;

        if (originalSize === 'chart-tiny') {
            const wrapper = chartCard.closest('.tiny-group-wrapper');
            if (wrapper) {
                chartCard.dataset.wrapperId = wrapper.id;
                wrapper.parentNode.insertBefore(chartCard, wrapper);
            }
            chartCard.classList.remove('chart-tiny');
            chartCard.classList.add('chart-regular');
        }

        const canvas = chartCard.querySelector('canvas');
        const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');
        if (canvas) canvas.style.display = 'none';
        if (kpiWrapper) kpiWrapper.style.display = 'none';

        const response = await fetch(`/api/getChartConfig/${id}`);
        if (!response.ok) throw new Error('Failed to fetch config');
        const { config } = await response.json();

        formContainer.innerHTML = `
            <label for="edit-title-${id}">Chart Title:</label>
            <input type="text" id="edit-title-${id}" value="${config.title}">
            <label>Chart Size:</label>
            <div class="size-selector">
                <div><input type="radio" id="edit-size-tiny-${id}" name="edit-size-${id}" value="tiny" ${config.chartSize === 'tiny' ? 'checked' : ''}><label for="edit-size-tiny-${id}">Tiny</label></div>
                <div><input type="radio" id="edit-size-regular-${id}" name="edit-size-${id}" value="regular" ${config.chartSize === 'regular' ? 'checked' : ''}><label for="edit-size-regular-${id}">Regular</label></div>
                <div><input type="radio" id="edit-size-large-${id}" name="edit-size-${id}" value="large" ${config.chartSize === 'large' ? 'checked' : ''}><label for="edit-size-large-${id}">Large</label></div>
                <div><input type="radio" id="edit-size-massive-${id}" name="edit-size-${id}" value="massive" ${config.chartSize === 'massive' ? 'checked' : ''}><label for="edit-size-massive-${id}">Massive</label></div>
            </div>
            <div class="form-actions">
                <button type="button" class="cancel-edit-btn" data-id="${id}">Cancel</button>
                <button type="button" class="save-edit-btn" data-id="${id}">Save</button>
            </div>
        `;
        formContainer.style.display = 'block';
    } catch (error) {
        console.error('Error opening edit form:', error);
        formContainer.innerHTML = '<p style="color:red;">Error loading data.</p>';
        formContainer.style.display = 'block';
    }
}

function closeEditForm(id) {
    const formContainer = document.getElementById(`edit-form-${id}`);
    if (!formContainer) return;
    const chartCard = formContainer.closest('.chart-card');
    if (!chartCard) return;

    const canvas = chartCard.querySelector('canvas');
    const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');

    const originalSize = chartCard.dataset.originalSize || 'chart-regular';
    chartCard.className = chartCard.className.replace(/chart-(tiny|regular|large|massive)/, originalSize);
    delete chartCard.dataset.originalSize;

    if (chartCard.dataset.wrapperId) {
        const wrapper = document.getElementById(chartCard.dataset.wrapperId);
        if (wrapper) wrapper.appendChild(chartCard);
        delete chartCard.dataset.wrapperId;
    }

    if (canvas) canvas.style.display = 'block';
    if (kpiWrapper) kpiWrapper.style.display = 'flex';
    formContainer.style.display = 'none';
    formContainer.innerHTML = '';
}

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
        await loadChartsFromDatabase();
        if (typeof showNotification === 'function') showNotification('Chart updated!', 'success');
    } catch (error) {
        console.error('Error saving chart:', error);
        if (typeof showNotification === 'function') showNotification('Error: ' + error.message, 'error');
    }
}

// ---------- Delete ----------
async function deleteGraph(id, chartCardElement) {
    try {
        const isAdmin = document.querySelector("#isAdmin");
        if (!isAdmin) return;
        const response = await fetch('/api/deleteGraph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        if (!response.ok) throw new Error('Failed to delete graph from server');
        if (charts[id] instanceof Chart) charts[id].destroy();
        delete charts[id];
        chartCardElement.remove();
        if (typeof showNotification === 'function') showNotification('Chart deleted successfully.', 'success');
    } catch (error) {
        console.error('Error deleting graph:', error);
        if (typeof showNotification === 'function') showNotification(`Error: ${error.message}`, 'error');
    }
}

// ---------- Event Delegation for Admin Buttons ----------
document.addEventListener('click', (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('edit-chart-btn')) openEditForm(id);
    if (e.target.classList.contains('delete-chart-btn')) {
        const card = e.target.closest('.chart-card');
        if (card) deleteGraph(id, card);
    }
    if (e.target.classList.contains('cancel-edit-btn')) closeEditForm(id);
    if (e.target.classList.contains('save-edit-btn')) handleSaveEdit(id);
});

// ---------- Export / Init ----------
window.myChartUtils = { resetCharts: () => window.location.reload() };

document.addEventListener('DOMContentLoaded', async () => {
    await loadChartsFromDatabase();
    setupSSE();
    window.addEventListener('beforeunload', () => {
        if (window.__chartEvtSource) { window.__chartEvtSource.close(); window.__chartEvtSource = null; }
    });
    document.getElementById('model-select')?.addEventListener('change', populateAllCharts);

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
