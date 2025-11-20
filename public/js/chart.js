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
    return colors[Math.abs(hash) % colors.length];
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
            y: { display: true, ticks: { font: { size: 12 } } }
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
    const yField = config.yAxis;

    if (config.splitBy === 'modelName') {
        const modelNames = Object.keys(logs);
        if (!modelNames.length) return;

        const labels = (logs[modelNames[0]] || []).slice(-maxPoints).map(l => new Date(l.responseTimestamp).toLocaleTimeString());
        const datasets = modelNames.map(modelName => {
            const data = (logs[modelName] || []).slice(-maxPoints).map(l => l[yField]);
            const color = getHashedColor(modelName);
            return { label: modelName, data, borderColor: color, backgroundColor: Utils.transparentize(color, 0.5), fill: true, tension: 0.3 };
        });

        chart.data.labels = labels;
        chart.data.datasets = datasets;
    } else {
        const activeModelLogs = logs || [];
        const sliced = activeModelLogs.slice(-maxPoints);
        const labels = sliced.map(l => new Date(l.responseTimestamp).toLocaleTimeString());
        const data = sliced.map(l => l[yField]);
        const color = getHashedColor(config.title);

        chart.data.labels = labels;
        chart.data.datasets = [{ label: yField, data, borderColor: color, backgroundColor: Utils.transparentize(color, 0.5), fill: true, tension: 0.3 }];
    }

    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        chart.options.scales.y.title = { display: true, text: yField };
    }
}

function mapBarData(chart, config, logs) {
    const xField = config.xAxis;
    const yField = config.yAxis;
    const groups = {};

    Object.values(logs).flat().forEach(log => {
        const key = log[xField] || 'unknown';
        if (!groups[key]) groups[key] = { sum: 0, count: 0 };
        groups[key].sum += log[yField];
        groups[key].count += 1;
    });

    const labels = Object.keys(groups);
    chart.data.labels = labels;
    chart.data.datasets = [{
        label: `Average ${yField}`,
        data: Object.values(groups).map(g => g.sum / g.count),
        backgroundColor: labels.map(l => Utils.transparentize(getHashedColor(l), 0.7))
    }];

    if (config.chartSize !== 'tiny' && chart.options.scales.y) {
        chart.options.scales.y.title = { display: true, text: yField };
    }
}

function mapPieData(chart, config, logs) {
    const categoryField = config.category;
    const groups = {};
    Object.values(logs).flat().forEach(log => {
        const key = log[categoryField] || 'unknown';
        if (!groups[key]) groups[key] = { sum: 0 };
        groups[key].sum += log.queryCount;
    });

    chart.data.labels = Object.keys(groups);
    chart.data.datasets = [{ label: 'Total Queries', data: Object.values(groups).map(g => g.sum), backgroundColor: Object.keys(groups).map(k => getHashedColor(k)) }];

    chart.options.scales = { y: { display: false } };
}

function mapMeasureData(element, config, logs) {
    const yField = config.yAxis;
    const values = logs.map(l => l[yField]);
    const avg = values.length ? values.reduce((a,b)=>a+b)/values.length : 0;

    const wrapper = element.querySelector('.kpi-content-wrapper');
    if (wrapper) {
    wrapper.innerHTML = `<h3 class="kpi-title">${config.title}</h3><div class="kpi-value">${avg.toFixed(1)}</div>`;
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

        switch(config.chartType) {
            case 'line': mapLineData(chartOrElem, config, config.splitBy==='modelName'?allLogs:activeModelLogs); break;
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
            if (!config || !config.yAxis) return;

            const maxPoints = (config.chartSize === 'tiny') ? TINY_CACHE_MAX_POINTS : CACHE_MAX_POINTS;

            if (config.splitBy === 'modelName') {
                const chart = chartOrElem;
                const datasetMap = {};
                chart.data.datasets.forEach(ds => datasetMap[ds.label] = ds);

                Object.entries(newValue).forEach(([modelName, modelData]) => {
                    const dataset = datasetMap[modelName];
                    if (!dataset) return;
                    const val = modelData[config.yAxis];
                    if (val === undefined) return;

                    dataset.data.push(val);
                    if (dataset.data.length > maxPoints) dataset.data.shift();
                });

                chart.data.labels.push(now);
                if (chart.data.labels.length > maxPoints) chart.data.labels.shift();
                chart.update('none');
            } else {
                const modelData = newValue[getCurrentModel()];
                if (!modelData) return;
                const val = modelData[config.yAxis];
                if (val === undefined) return;

                switch (config.chartType) {
                    case 'line': {
                        const chart = chartOrElem;
                        chart.data.labels.push(now);
                        chart.data.datasets[0].data.push(val);
                        if (chart.data.labels.length > maxPoints) {
                            chart.data.labels.shift();
                            chart.data.datasets[0].data.shift();
                        }
                        chart.update('none');
                        break;
                    }
                    case 'measure': {
                        const element = chartOrElem;
                        const kpiValue = element.querySelector('.kpi-value');
                        if (kpiValue) kpiValue.textContent = val.toFixed(1);
                        break;
                    }
                    case 'doughnut_special': {
                        const doughnutChart = chartOrElem;
                        doughnutChart.data.datasets[0].data = [val, 100 - val];
                        doughnutChart.update('none');
                        break;
                    }
                }
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
});
