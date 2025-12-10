// File runs on load
(() => {
    const { DATA_DICTIONARY } = window.CONSTANTS;
    const { CACHE_MAX_POINTS, TINY_CACHE_MAX_POINTS } = window.DashboardApp.constants;
    const getCurrentModel = window.DashboardApp.actions.getCurrentModel; // get the helper method exposed in the chartDataManager.js file.

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
            options.maintainAspectRatio = true;
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
            //groups timestamps that are within 1 second.
            const t = Math.floor(log.responseTimestamp / 1000) * 1000;
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

            let valuesToRender = splitConfig.acceptedValues;

            if (config.includedValues && config.includedValues.length > 0) {
                valuesToRender = splitConfig.acceptedValues.filter(val => config.includedValues.includes(val));
            }

            valuesToRender.forEach(categoryValue => {
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

        // Only get the very latest log from each model
        const latestLogs = [];
        Object.values(logs).forEach(modelLogs => {
            if (Array.isArray(modelLogs) && modelLogs.length > 0) {
                // Push the last item in the array
                latestLogs.push(modelLogs[modelLogs.length - 1]);
            }
        });

        const groups = {};

        latestLogs.forEach(log => {
            // Breakdown Fields (Topic / Subtopic)
            if (catConfig.dbPath.startsWith('breakdown.')) {
                if (log.breakdown) {
                    Object.keys(log.breakdown).forEach(key => {
                        const item = log.breakdown[key];

                        // Case-insensitive check + Type check
                        if (item.type && item.type.toLowerCase() === config.category.toLowerCase()) {
                            if (!groups[key]) groups[key] = { sum: 0 };

                            // Use queryCount (or fallback)
                            const countVal = (item.count !== undefined) ? item.count : (item.queryCount || 0);
                            groups[key].sum += countVal;
                        }
                    });
                }
            }

            // Standard Fields (Model Name)
            else {
                const key = getValueFromPath(log, catConfig.dbPath) || 'unknown';
                if (!groups[key]) groups[key] = { sum: 0 };

                // For standard fields, we sum the queryCount of the log itself
                const count = (typeof log.queryCount === 'number') ? log.queryCount : 1;
                groups[key].sum += count;
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

        // Hide axes for Pie charts
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
    // EXPORT functions to the public namespace
    window.DashboardApp.renderer.createChartFromConfig = createChartFromConfig;
    window.DashboardApp.renderer.mapLineData = mapLineData;
    window.DashboardApp.renderer.mapBarData = mapBarData;
    window.DashboardApp.renderer.mapPieData = mapPieData;
    window.DashboardApp.renderer.mapMeasureData = mapMeasureData;
})();