// File runs on load
(() => {
    const { DATA_DICTIONARY } = window.CONSTANTS;
    const getCurrentModel = window.DashboardApp.actions.getCurrentModel; // get the helper methods exposed in the chartDataManager.js file.
    const getValueFromPath = window.DashboardApp.utils.getValueFromPath; // get the helpers from the chartUtils file.
    const getHashedColor = window.DashboardApp.utils.getHashedColor;
    const Utils = window.DashboardApp.utils;

    // ---------- Helpers ----------

    // Formats timestamps based on the current zoom level
    function formatTimeLabel(timestamp, timeframe) {
        const date = new Date(timestamp);
        if (!date.getTime()) return '';

        // High Fidelity (Seconds/Minutes)
        if (['10s', '30s', '1m', '5m', '15m'].includes(timeframe)) {
            return date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }
        // Mid Fidelity (Hours)
        if (['1h', '1d'].includes(timeframe)) {
            return date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit' });
        }
        // Low Fidelity (Dates)
        if (['1w', '1mo'].includes(timeframe)) {
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}h`;
        }
        return date.toLocaleTimeString();
    }

    // ---------- Chart Skeleton ----------
    function createChartFromConfig(config, ctx) {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, //ToDo: See if this is good with or without
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            plugins: {
                legend: { display: true, labels: { font: { size: 14 } } },
                title: { display: true, text: config.title, font: { size: 16 }, color: 'dimgray' }
            },
            scales: {
                x: { display: true, ticks: { font: { size: 12 } } },
                y: { display: true, ticks: { font: { size: 12 } } }
            },
            devicePixelRatio: window.devicePixelRatio || 1 //ToDo: See if this is better than 3
            // devicePixelRatio: 3
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

    /**
     * Map Data for Line Charts
     * @param {Chart} chart - The ChartJS instance
     * @param {Object} config - The chart configuration
     * @param {Array|Object} logs - The data (already filtered to relevant models/timeframe)
     * @param {String} timeframe - e.g. '10s', '1h'
     */
    function mapLineData(chart, config, logs, timeframe = '10s', limit = 30) {
        const yConfig = DATA_DICTIONARY[config.yAxis];
        let splitBy = config.splitBy;
        const splitConfig = config.splitBy ? DATA_DICTIONARY[config.splitBy] : null;

        if (!yConfig) return;

        // Breakdown charts above 15m are changed into regular charts by removing splitby
        const isLowFidelity = ['1h', '1d', '1w', '1mo'].includes(timeframe);
        
        // If we are in low-fi and splitBy is NOT modelName, we force a standard chart
        const isBreakdownUnavailable = isLowFidelity && splitBy && splitBy !== 'modelName';

        if (isBreakdownUnavailable) {
            splitBy = null; // This effectively pushes the code into the "STANDARD CHART" else block below
        }

        let flatLogs = Array.isArray(logs) ? logs : Object.values(logs).flat();

        // Group logs by Timestamp
        const logsByTime = {};
        flatLogs.forEach(log => {
            //groups logs in the same timestamp.
            const t = log.responseTimestamp;
            if (!logsByTime[t]) logsByTime[t] = [];
            logsByTime[t].push(log);
        });

        // Sort unique timestamps and take the last 'maxPoints' (e.g., 15)
        // Use timestamp as the Source of Truth for the X-Axis
        const sortedTimestamps = Object.keys(logsByTime)
            .map(Number) // Convert string keys back to numbers
            .sort((a, b) => a - b)
            .slice(-limit);

        // Generate Labels
        chart.data.labels = sortedTimestamps.map(ts => formatTimeLabel(ts, timeframe));

        // Generate Datasets
        const newDatasets = [];

        // --- CASE A: SPLIT CHART ---
        if (splitBy && splitConfig && splitConfig.acceptedValues) {

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
                    if (splitBy === 'modelName') {
                        const match = logsAtThisTime.find(l => l.modelName === categoryValue);
                        if (match) val = getValueFromPath(match, yConfig.dbPath);
                    }
                    else {
                        const match = logsAtThisTime.find(l => l.breakdown && l.breakdown[categoryValue] && l.breakdown[categoryValue].type === splitBy);
                        if (match) val = match.breakdown[categoryValue][config.yAxis];
                    }

                    dataPoints.push(val !== undefined ? val : null);
                });

                const color = getHashedColor(categoryValue);
                newDatasets.push({
                    label: categoryValue,
                    data: dataPoints,
                    borderColor: color,
                    backgroundColor: Utils.transparentize(color, 0.5),
                    tension: 0.3,
                    spanGaps: true,
                    // pointRadius: config.chartSize === 'tiny' ? 0 : 2
                    pointRadius: 0
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
            newDatasets.push({
                label: yConfig.label,
                data: dataPoints,
                borderColor: color,
                backgroundColor: Utils.transparentize(color, 0.5),
                fill: true,
                tension: 0.3,
                pointRadius: 0
            });
        }

        chart.data.datasets = newDatasets;

        if (config.chartSize !== 'tiny' && chart.options.scales.y) {
            chart.options.scales.y.title = { display: true, text: yConfig.label };

            const allValues = newDatasets.flatMap(ds => ds.data).filter(v => v !== null);
            const dataMin = Math.min(...allValues);

            //show zero if the data is close / undefined
            if (dataMin < 10 || dataMin === Infinity) {
                chart.options.scales.y.min = Math.max(0, dataMin - (dataMin * 0.1));
            } else {
                delete chart.options.scales.y.min;

                chart.options.scales.y.suggestedMin = 0;
            }
        }
    }

    function mapBarData(chart, config, logs, limit = 30) {
        const xConfig = DATA_DICTIONARY[config.xAxis];
        const yConfig = DATA_DICTIONARY[config.yAxis];

        if (!xConfig || !yConfig) return;

        const groups = {};
        const flatLogs = Array.isArray(logs) ? logs : Object.values(logs).flat();

        flatLogs.forEach(log => {
            const weight = log.queryCount || 1;
            const isSummed = DATA_DICTIONARY[config.yAxis].summarize == "sum";

            // Helper to accumulate weighted sums
            const addToGroup = (key, value) => {
                if (!groups[key]) groups[key] = { weightedSum: 0, totalWeight: 0 };

                if (isSummed) {
                    groups[key].weightedSum += value;
                    groups[key].totalWeight = 1; // Divisor stays 1 (or effectively unused)
                } else {
                    groups[key].weightedSum += (value * weight);
                    groups[key].totalWeight += weight;
                }
            };
            // Handle Categorical Splits (Topic/Subtopic)
            // These are special because they are arrays/objects inside 'breakdown', not simple fields
            if (xConfig.dbPath.startsWith('breakdown.')) {
                if (log.breakdown) {
                    Object.keys(log.breakdown).forEach(key => {
                        const item = log.breakdown[key];

                        const isIncluded = !config.includedValues ||
                            config.includedValues.length === 0 ||
                            config.includedValues.includes(key);

                        // Match the type
                        if (item.type === config.xAxis && isIncluded) {
                            const val = item[config.yAxis];
                            if (val !== undefined) {
                                addToGroup(key, val);
                            }
                        }
                    });
                }
            }
            // Handle Standard Fields (e.g. ModelName)
            else {
                const key = window.DashboardApp.utils.getValueFromPath(log, xConfig.dbPath) || 'unknown';
                const val = window.DashboardApp.utils.getValueFromPath(log, yConfig.dbPath);

                const isIncluded = !config.includedValues ||
                    config.includedValues.length === 0 ||
                    config.includedValues.includes(key);

                if (val !== undefined && isIncluded) addToGroup(key, val);
            }
        });

        const labels = Object.keys(groups);
        const data = labels.map(label => {
            const g = groups[label];
            // If totalWeight is > 1, it's an average. If it's 1 (Volume), it's a sum.
            return g.totalWeight > 0 ? (g.weightedSum / (g.totalWeight === 1 ? 1 : g.totalWeight)) : 0;
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

                        const isIncluded = !config.includedValues ||
                            config.includedValues.length === 0 ||
                            config.includedValues.includes(key);

                        // Case-insensitive check + Type check
                        if (item.type && item.type.toLowerCase() === config.category.toLowerCase() && isIncluded) {
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

                const isIncluded = !config.includedValues ||
                    config.includedValues.length === 0 ||
                    config.includedValues.includes(key);

                // For standard fields, we sum the queryCount of the log itself
                // ToDo: Update this to be a value like policyCompliance, etc
                const count = (typeof log.queryCount === 'number') ? log.queryCount : 1;
                if (count && isIncluded) {
                    groups[key].sum += count;
                }
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