(function() {
    // Shared Colors
    const COLORS = {
        Critical: '#dc2626',
        High: '#ea580c',
        Medium: '#facc15',
        Info: '#3b82f6'
    };

    // Internal state to track chart instances for destruction/updates
    const charts = {
        pie: null,
        bar: null,
        line: null
    };

    window.AlertCharts = {
        /**
         * Shows an empty-state message overlay on a canvas's parent wrapper.
         */
        showEmpty(canvasId, message) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            const wrapper = canvas.closest('.chart-wrapper');
            if (!wrapper) return;

            canvas.style.display = 'none';

            // Avoid duplicating the overlay on re-renders
            let overlay = wrapper.querySelector('.chart-empty-state');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'chart-empty-state';
                wrapper.appendChild(overlay);
            }
            overlay.textContent = message;
            overlay.style.display = 'flex';
        },

        /**
         * Clears any empty-state overlay and restores the canvas.
         */
        clearEmpty(canvasId) {
            const canvas = document.getElementById(canvasId);
            if (!canvas) return;
            canvas.style.display = '';
            const wrapper = canvas.closest('.chart-wrapper');
            const overlay = wrapper && wrapper.querySelector('.chart-empty-state');
            if (overlay) overlay.style.display = 'none';
        },

        /**
         * Main entry point to render all charts
         * @param {Object} data - { levelDistribution, timeSeries }
         */
        render(data) {
            if (!data) return;

            const totalAlerts = data.levelDistribution
                ? Object.values(data.levelDistribution).reduce((sum, v) => sum + v, 0)
                : 0;

            const emptyMessage = 'No alerts in the selected timeframe';

            if (totalAlerts === 0) {
                this.showEmpty('chart-pie', emptyMessage);
                this.showEmpty('chart-bar', emptyMessage);
                this.showEmpty('chart-line', emptyMessage);
                // Destroy any stale chart instances
                if (charts.pie) { charts.pie.destroy(); charts.pie = null; }
                if (charts.bar) { charts.bar.destroy(); charts.bar = null; }
                if (charts.line) { charts.line.destroy(); charts.line = null; }
                return;
            }

            this.clearEmpty('chart-pie');
            this.clearEmpty('chart-bar');
            this.clearEmpty('chart-line');
            this.renderPie(data.levelDistribution);
            this.renderBar(data.levelDistribution);
            this.renderLine(data.timeSeries);
        },

        renderPie(distribution) {
            const canvas = document.getElementById('chart-pie');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            if (charts.pie) charts.pie.destroy();

            charts.pie = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(distribution),
                    datasets: [{
                        data: Object.values(distribution),
                        backgroundColor: Object.keys(distribution).map(k => COLORS[k] || '#888'),
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'right',
                            labels: { boxWidth: 12, padding: 10 }
                        },
                        title: { display: true, text: 'Alert Distribution (Count)' }
                    }
                }
            });
        },

        renderBar(distribution) {
            const canvas = document.getElementById('chart-bar');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (charts.bar) charts.bar.destroy();

            charts.bar = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(distribution),
                    datasets: [{
                        label: 'Alert Count',
                        data: Object.values(distribution),
                        backgroundColor: Object.keys(distribution).map(k => COLORS[k] || '#888')
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Alert Levels Comparison' }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        },

        renderLine(timeSeries) {
            const canvas = document.getElementById('chart-line');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (charts.line) charts.line.destroy();

            const datasets = Object.keys(timeSeries).map(level => {
                const points = (timeSeries[level] || [])
                    .map(pt => {
                        const xDate = pt && pt.x ? new Date(pt.x) : null;
                        return { x: xDate, y: pt && typeof pt.y === 'number' ? pt.y : null };
                    })
                    .filter(pt => pt.x instanceof Date && !Number.isNaN(pt.x.getTime()) && pt.y !== null)
                    .sort((a, b) => a.x - b.x);

                return {
                    label: level,
                    data: points,
                    borderColor: COLORS[level] || '#888',
                    backgroundColor: COLORS[level] || '#888',
                    tension: 0.1
                };
            });

            charts.line = new Chart(ctx, {
                type: 'line',
                data: { datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: { display: true, text: 'Alerts Over Time' },
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 12, padding: 10 }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: { unit: 'hour', displayFormats: { hour: 'MMM d, HH:mm' } }
                        },
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        }
    };
})();
