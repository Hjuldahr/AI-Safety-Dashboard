(() => {
    // Map the global state to the variable names
    const charts = window.DashboardApp.charts;
    let allLogs = window.DashboardApp.logs;
    let allConfigs = window.DashboardApp.configs;
    const { DATA_DICTIONARY, TIMEFRAME_CONFIG } = window.CONSTANTS;
    const { CACHE_MAX_POINTS } = window.DashboardApp.constants;

    // reset the logs obj on reload
    window.DashboardApp.logs = {};

    // Initialize empty arrays for all known timeframes to prevent null checks later
    Object.keys(TIMEFRAME_CONFIG).forEach(tf => {
        window.DashboardApp.logs[tf] = {};
    });

    // Local state only needed here
    let isReloadingCharts = false;
    let updateTickCounter = 0; // Used to throttle low-fi charts

    // Returns the selected model
    function getCurrentModel() {
        const select = document.getElementById('model-select');
        return select?.value || KNOWN_MODELS[0];
    }

    // Removes the live updating charts (all of them)
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

        // Save the scroll position and scroll back down after rebuilding DOM
        const currentScroll = window.scrollY;
        isReloadingCharts = true;
        try {
            const response = await fetch(`api/recentData`);
            if (!response.ok) throw new Error('Failed to fetch initial chart data');

            const data = await response.json();

            allLogs = data.logs || {};
            allConfigs = data.configs || [];

            window.DashboardApp.configs = data.configs || [];

            // ToDo: See if this line is needed
            // clearDynamicCharts();

            // Store the logs locally - per timeframe
            if (data.logs) {
                Object.keys(data.logs).forEach(tf => {
                    window.DashboardApp.logs[tf] = data.logs[tf];
                });
            }

            // Build DOM
            rebuildChartDOM();

            // Initial Render
            populateAllCharts();

            // Scroll back down
            window.scrollTo(0, currentScroll);
        } catch (err) {
            console.error('Error loading charts:', err);
        } finally {
            isReloadingCharts = false;
        }
    }

    // A helper to wipe the board and place cards
    function rebuildChartDOM() {
        const container = document.querySelector('.charts-container');

        // Clear the page
        clearDynamicCharts();

        let currentTinyGroup = null;

        // Create new cards
        window.DashboardApp.configs.forEach(config => {
            // each card
            const chartCard = createChartCardDOM(config);

            // Tiny Group Logic
            if (config.chartSize === 'tiny') {
                if (!currentTinyGroup || currentTinyGroup.childElementCount >= 4) {
                    currentTinyGroup = document.createElement('div');
                    currentTinyGroup.className = 'chart-card-group tiny-group-wrapper';
                    container.appendChild(currentTinyGroup);

                    // Init Sortable for this group
                    if (window.Sortable) {
                        new Sortable(currentTinyGroup, {
                            group: {
                                name: 'tiny-charts',
                                put: (to) => to.el.children.length < 4
                            },
                            animation: 150,
                            preventOnFilter: true,
                            onEnd: window.DashboardApp.admin.saveNewOrder
                        });
                    }
                }
                currentTinyGroup.appendChild(chartCard);
            } else {
                currentTinyGroup = null;
                container.appendChild(chartCard);
            }

            // Initialize Chart Instance
            if (config.chartType === 'measure') {
                charts[config._id] = chartCard; // Store element for KPIs
            } else {
                const ctx = chartCard.querySelector('canvas').getContext('2d');
                const chart = window.DashboardApp.renderer.createChartFromConfig(config, ctx);
                chart.customConfig = config; // Attach config to instance for easy access
                charts[config._id] = chart;
            }
        });
    }

    function createChartCardDOM(config) {
        const chartSize = config.chartSize || 'regular';
        const card = document.createElement('div');
        card.className = `chart-card dynamic-chart-card chart-${chartSize}`;
        card.dataset.id = config._id;

        // Store current timeframe on the DOM element for UI logic
        card.dataset.timeframe = config.chartTimeRange || '10s';

        // Admin Controls (Edit/Delete)
        if (document.querySelector("#isAdmin")) {
            // Wrap all elements in a header div
            let chartHeader = `<div class="chart-header">`;

            // Header / Zoom Controls (Only for non-tiny charts)
            // ToDo: Implement click actions for zoom in / out
            if (chartSize !== 'tiny') {
                chartHeader += `
                <div class="left-chart-buttons">
                    <button class="zoom-btn zoom-out" data-id="${config._id}" title="Zoom Out">↑</button>
                    <span class="zoom-label">${config.chartTimeRange || '10s'}</span>
                    <button class="zoom-btn zoom-in" data-id="${config._id}" title="Zoom In">↓</button>
                </div>
            `;
            } else {
                chartHeader += `<div class="spacer-div"></div>`
            }

            chartHeader += `
                <div class="right-chart-buttons">
                    <span class="edit-chart-btn" data-id="${config._id}">✏️</span>
                    <span class="delete-chart-btn" data-id="${config._id}">&times;</span>
                </div>
            `;

            // Ending of initial div
            chartHeader += `</div>`;

            card.innerHTML = chartHeader;
        }

        // Edit Form Container
        card.innerHTML += `<div class="edit-chart-form" id="edit-form-${config._id}"></div>`;

        // Content
        if (config.chartType === 'measure') {
            card.classList.add('kpi-card');
            card.innerHTML += `<div class="kpi-content-wrapper"></div>`;
        } else {
            card.innerHTML += `<canvas id="${config._id}"></canvas>`;
        }

        // Attach Config to DOM for reference
        card.customConfig = config;
        return card;
    }

    function populateAllCharts() {
        const activeModel = getCurrentModel();

        for (const config of allConfigs) {
            const chartOrElem = charts[config._id];
            if (!chartOrElem) continue;

            // Determine which timeframe / data source to use
            const timeframe = config.chartTimeRange || '10s';

            callChartRenderer(chartOrElem, config, timeframe, activeModel);
        }
    }

    // ---------- SSE Updates (batched) ----------
    function setupSSE() {
        const evtSource = new EventSource('events');
        window.__chartEvtSource = evtSource;

        let pendingUpdates = []; // Store latest updates
        let rafScheduled = false;

        evtSource.addEventListener('update', (event) => {
            pendingUpdates.push(JSON.parse(event.data));
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(processPendingUpdates);
            }
        });

        // The "Brain" of the real-time system
        function processPendingUpdates() {
            if (pendingUpdates.length === 0) { rafScheduled = false; return; }

            while (pendingUpdates.length > 0) {
                const newValue = pendingUpdates.shift();
                updateTickCounter++;
                // --- DATA MERGE STEP ---
                // Update ALL timeframes in memory (Background Logic)
                Object.keys(TIMEFRAME_CONFIG).forEach(timeframe => {
                    const config = TIMEFRAME_CONFIG[timeframe];
                    const bucketSize = config.bucket;
                    const limit = config.limit || 300;

                    Object.entries(newValue).forEach(([modelName, newLog]) => {
                        // Ensure structure exists
                        if (!window.DashboardApp.logs[timeframe][modelName]) {
                            window.DashboardApp.logs[timeframe][modelName] = [];
                        }

                        const modelArr = window.DashboardApp.logs[timeframe][modelName];
                        const lastPoint = modelArr[modelArr.length - 1];

                        // Determine Buckets
                        // We use responseTimestamp from server to align perfectly
                        const newLogBucket = Math.floor(newLog.responseTimestamp / bucketSize) * bucketSize;
                        const lastPointBucket = lastPoint ? Math.floor(lastPoint.responseTimestamp / bucketSize) * bucketSize : null;

                        if (lastPoint && newLogBucket === lastPointBucket) {
                            // === MERGE (LIVE TIP) ===
                            mergeLogs(lastPoint, newLog);
                        } else {
                            // === PUSH (NEW BUCKET) ===
                            // Deep clone to prevent reference issues
                            const logToPush = structuredClone(newLog);

                            // FORCE timestamp to bucket start to align all models perfectly
                            logToPush.responseTimestamp = newLogBucket;

                            modelArr.push(logToPush);

                            // Maintain Array Size
                            while (modelArr.length > limit + 1) {
                                modelArr.shift();
                            }
                        }
                    });
                });
            }

            // --- RENDER STEP ---
            // Instead of calling populateAllCharts(), we iterate manually to apply Throttling
            const activeModel = getCurrentModel();
            const charts = window.DashboardApp.charts;

            window.DashboardApp.configs.forEach(config => {
                const chartOrElem = charts[config._id];
                if (!chartOrElem) return;

                const timeframe = config.chartTimeRange || '10s';
                const tfConfig = TIMEFRAME_CONFIG[timeframe];

                // THROTTLE CHECK:
                // If bucket > 1 minute (Low Fidelity), only update every 5 ticks (5s)
                // High fidelity (10s, 30s, 1m) updates every tick (1s)
                const isLowFi = tfConfig.bucket >= 60000;
                if (isLowFi && (updateTickCounter % 5 !== 0)) {
                    return; // Skip render for this chart this frame
                }

                callChartRenderer(chartOrElem, config, timeframe, activeModel);
            });

            rafScheduled = false;
        }
    }

    // Helper function used by setupSSE and populateAllCharts
    function callChartRenderer(chartOrElem, config, timeframe, activeModel) {
        // Prepare Data
        const tfLogs = window.DashboardApp.logs[timeframe];
        const limit = TIMEFRAME_CONFIG[timeframe].limit;

        // Select specific logs based on chart needs
        // (Split by model = needs all logs. Split by topic = needs active model logs)
        const relevantLogs = (config.splitBy === 'modelName' || config.chartType === 'bar' || config.chartType === 'pie')
            ? tfLogs
            : tfLogs[activeModel];

        if (!relevantLogs) return;

        // Render
        switch (config.chartType) {
            case 'line': window.DashboardApp.renderer.mapLineData(chartOrElem, config, relevantLogs, timeframe, limit); break;
            case 'bar': window.DashboardApp.renderer.mapBarData(chartOrElem, config, tfLogs, limit); break;
            case 'pie': window.DashboardApp.renderer.mapPieData(chartOrElem, config, tfLogs, limit); break;
            case 'measure': window.DashboardApp.renderer.mapMeasureData(chartOrElem, config, relevantLogs, limit); break;
        }

        if (chartOrElem instanceof Chart) chartOrElem.update('none');
    }

    // Merge logic helper merges target and source AI Logs / Summaries
    function mergeLogs(target, source) {
        const countA = target.queryCount || 1;
        const countB = source.queryCount || 1;
        const total = countA + countB;

        // Iterate through the dictionary once
        Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
            // Skip metadata/categorical fields
            if (config.summarize === "remove" || config.dataType === "timestamp" || key === "modelName") return;

            if (config.summarize === "avg") {
                if (target[key] !== undefined && source[key] !== undefined) {
                    target[key] = ((target[key] * countA) + (source[key] * countB)) / total;
                }
            } else if (config.summarize === "sum") {
                target[key] = (target[key] || 0) + (source[key] || 0);
            }
        });

        target.queryCount = total;

        // Handle Breakdown (Nested logic)
        if (source.breakdown) {
            if (!target.breakdown) target.breakdown = {};
            Object.keys(source.breakdown).forEach(topicKey => {
                if (!target.breakdown[topicKey]) {
                    target.breakdown[topicKey] = { ...source.breakdown[topicKey] };
                } else {
                    // Recursively call a similar logic or repeat the loop for the sub-object
                    const tgtMetric = target.breakdown[topicKey];
                    const srcMetric = source.breakdown[topicKey];
                    const subCountA = tgtMetric.queryCount || 0;
                    const subCountB = srcMetric.queryCount || 0;
                    const subTotal = subCountA + subCountB;

                    Object.entries(DATA_DICTIONARY).forEach(([key, config]) => {
                        if (config.summarize === "avg" && tgtMetric[key] !== undefined) {
                            tgtMetric[key] = ((tgtMetric[key] * subCountA) + (srcMetric[key] * subCountB)) / subTotal;
                        } else if (config.summarize === "sum") {
                            tgtMetric[key] = (tgtMetric[key] || 0) + (srcMetric[key] || 0);
                        }
                    });
                    tgtMetric.queryCount = subTotal;
                }
            });
        }
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
    window.DashboardApp.actions.getCurrentModel = getCurrentModel;
    window.DashboardApp.actions.loadCharts = loadChartsFromDatabase;
})();