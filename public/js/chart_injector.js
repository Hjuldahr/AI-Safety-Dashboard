// chart_injector.js

// This script runs when it's loaded as a module.

// 1. Import the array of chart IDs from chart.js
import { CHART_IDS } from './chart.js';

// Function to generate and inject the chart HTML
function injectChartWrappers() {
    // We use querySelector to find the container *after* the script loads,
    // ensuring the element exists.
    const chartsContainer = document.querySelector('.charts-container');
    
    // Check if the container exists and we have IDs
    if (!chartsContainer || !CHART_IDS || CHART_IDS.length === 0) {
        console.error("Charts container not found or no chart IDs defined.");
        return;
    }
    
    // 2. Loop through each ID and build the HTML structure: 
    // <div class="chart-card"><canvas id="ID"></canvas></div>
    const chartHTML = CHART_IDS.map(id => {
        return `
            <div class="chart-card">
                <canvas id="${id}"></canvas>
            </div>
        `;
    }).join('');

    // 3. Insert the generated HTML into the container
    chartsContainer.innerHTML = chartHTML;
}

// Call the function immediately upon script execution.
// Since this is a module, it runs in a deferred manner after the DOM is parsed,
// but adding a DOMContentLoaded check can ensure robustness if placed outside the 
// <div class="charts-container"> element.
// For simplicity and direct replacement of the inline script:
injectChartWrappers();