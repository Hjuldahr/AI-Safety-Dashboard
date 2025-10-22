// charts_injector.js

// Import chart IDs from chart.js
import { CHART_IDS } from './chart.js';

// Function to generate and inject chart HTML
function injectChartWrappers() {
    const chartsContainer = document.querySelector('.charts-container');

    if (!chartsContainer) {
        console.error("Charts container not found in the DOM.");
        return;
    }

    if (!CHART_IDS || CHART_IDS.length === 0) {
        console.error("No chart IDs defined in chart.js");
        return;
    }

    // Generate HTML for each chart
    const chartHTML = CHART_IDS.map(id => `
        <div class="chart-card">
            <canvas id="${id}"></canvas>
        </div>
    `).join('');

    // Insert into container
    chartsContainer.innerHTML = chartHTML;
}

// Ensure the DOM is fully loaded before injecting
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChartWrappers);
} else {
    injectChartWrappers();
}
