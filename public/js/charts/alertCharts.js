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
         * Main entry point to render all charts
         * @param {Object} data - { levelDistribution, timeSeries }
         */
        render(data) {
            if (!data) return;
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
                // Sort by time
                const points = (timeSeries[level] || []).sort((a,b) => new Date(a.x) - new Date(b.x));
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
                            time: { unit: 'hour', displayFormats: { hour: 'MMM d, HH:mm' } },
                            parsing: false 
                        },
                        y: { beginAtZero: true, ticks: { precision: 0 } }
                    }
                }
            });
        }
    };
})();
