(() => {
    // Map the global state to the variable names
    const charts = window.DashboardApp.charts;
    let allLogs = window.DashboardApp.logs;
    let allConfigs = window.DashboardApp.configs;
    const { CACHE_MAX_POINTS, TINY_CACHE_MAX_POINTS } = window.DashboardApp.constants;

    // Local state only needed here
    let isReloadingCharts = false;

    // Returns the selected model
    function getCurrentModel() {
        const select = document.getElementById('model-select');
        return select?.value || 'good';
    }

    // Expose the getCurrentModel method to the other js files
    window.DashboardApp.actions.getCurrentModel = getCurrentModel;

    // ToDo: Is this method even used?
    // Clears the live updated charts (all of them now)
    function clearDynamicCharts() {
        document.querySelectorAll('.dynamic-chart-card').forEach(card => card.remove());
        document.querySelectorAll('.tiny-group-wrapper').forEach(wrapper => wrapper.remove());

        for (const id in charts) {
            if (charts[id] instanceof Chart) charts[id].destroy();
            delete charts[id];
        }
    }

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
                        onEnd: window.DashboardApp.admin.saveNewOrder
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
                    const chart = window.DashboardApp.renderer.createChartFromConfig(config, ctx);
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

    // Expose the loadChartsFromDatabase method to the other js files
    window.DashboardApp.actions.loadCharts = loadChartsFromDatabase;

    function populateAllCharts() {
        const activeModel = getCurrentModel();
        if (!allLogs || !Object.keys(allLogs).length) return;
        const activeModelLogs = allLogs[activeModel];
        if (!activeModelLogs) return;

        for (const config of allConfigs) {
            const chartOrElem = charts[config._id];
            if (!chartOrElem) continue;

            switch (config.chartType) {
                case 'line': window.DashboardApp.renderer.mapLineData(chartOrElem, config, config.splitBy === 'modelName' ? allLogs : activeModelLogs); break;
                case 'bar': window.DashboardApp.renderer.mapBarData(chartOrElem, config, allLogs); break;
                case 'pie': window.DashboardApp.renderer.mapPieData(chartOrElem, config, allLogs); break;
                case 'measure': window.DashboardApp.renderer.mapMeasureData(chartOrElem, config, activeModelLogs); break;
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


    // ==========================================
    // INITIALIZATION
    // ==========================================
    window.myChartUtils = { resetCharts: () => window.location.reload() };

    document.addEventListener('DOMContentLoaded', async () => {
        await loadChartsFromDatabase();
        setupSSE();
        window.addEventListener('beforeunload', () => {
            if (window.__chartEvtSource) { window.__chartEvtSource.close(); window.__chartEvtSource = null; }
            localStorage.setItem('scrollpos', window.scrollY);
        });
        document.getElementById('model-select')?.addEventListener('change', populateAllCharts);

        const mainContainer = document.querySelector('.charts-container');
        if (mainContainer) {
            new Sortable(mainContainer, {
                group: 'main-charts',
                animation: 150,  // Smooth animation
                preventOnFilter: true,
                onEnd: window.DashboardApp.admin.saveNewOrder
            });
        }

        // Scrolling to page location on load
        var scrollpos = localStorage.getItem('scrollpos');
        if (scrollpos) window.scrollTo(0, scrollpos);
    });

    // EXPORT functions to the public namespace
    window.DashboardApp.data.getCurrentModel = getCurrentModel;
    window.DashboardApp.data.loadCharts = loadChartsFromDatabase;
})();