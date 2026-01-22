let activeModel = "GoodModel";
let isPaused = false;

const pauseText = "⏸ Pause Graphs";
const pauseColour = "#f45b69ff";
const playText = "▶ Resume Graphs";
const playColour = "#2ca58dff"

const loadChartsFromDatabase = window.DashboardApp.actions.loadCharts; // get the helper method exposed in the chartDataManager.js file.

document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.querySelector("#toggle-button"); //<button>
    const refreshButton = document.querySelector("#refresh-button"); //<button>
    const modelSelect = document.querySelector("#model-select"); //<select>
    // toggleButton.innerHTML = pauseText;
    // toggleButton.style.backgroundColor = pauseColour;

    // Logic to hide admin controls for non-admin users:
    const isAdmin = document.querySelector("#isAdmin");
    if (!isAdmin) {
        const toggleButton = document.querySelector("#toggle-button");
        if (toggleButton) {
            toggleButton.style.display = 'none';
        }

        const addChartBtn = document.getElementById("add_new_chart");
        if (addChartBtn) {
            addChartBtn.style.display = 'none';
        }
    }

    async function updateServerSettings() {
        try {
            const res = await fetch('api/params', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPaused, activeModel })
            });

            const data = await res.json();
            if (data.success) {
                console.log('Server scheduler state updated:', data.state);
            } else {
                console.error('Failed to update scheduler state');
            }
        } catch (err) {
            console.error('Error updating scheduler state:', err);
        }
    }

    async function updateClientSettings() {
        try {
            const res = await fetch('api/params');

            const data = await res.json();
            if (data.success) {
                console.log('Server scheduler state received:', data.state);
            } else {
                console.error('Did not receive server scheduler state.');
            }

            activeModel = data.state.activeModel;
            isPaused = data.state.isPaused;

            toggleButton.innerHTML = isPaused ? playText : pauseText;
            toggleButton.style.backgroundColor = isPaused ? playColour : pauseColour;
            modelSelect.value = activeModel;
        } catch (err) {
            console.error('Error:', err);
        }
    }
    // Initial call on load
    updateClientSettings()

    toggleButton.addEventListener('click', () => {
        isPaused = !isPaused;
        toggleButton.innerHTML = isPaused ? playText : pauseText;
        toggleButton.style.backgroundColor = isPaused ? playColour : pauseColour;

        updateServerSettings();
    })

    refreshButton.addEventListener('click', () => {
        window.myChartUtils.resetCharts();
    })

    modelSelect.addEventListener('change', async (event) => {
        activeModel = event.target.value;
        updateServerSettings();

        await loadChartsFromDatabase()
    })

    // -- New chart logic --

    const DATA_FIELDS = {
        // Categorical
        modelName: {
            type: 'CATEGORICAL',
            label: 'Model Name'
        },
        topic: {
            type: 'CATEGORICAL',
            label: 'Topic'
        },
        sub_topic: {
            type: 'CATEGORICAL',
            label: 'Sub Topic'
        },
        // Numeric
        webLookups: {
            type: 'NUMERIC',
            label: 'Internet Lookups Performed'
        },
        tokensUsed: {
            type: 'NUMERIC',
            label: 'LLM Tokens Used'
        },
        responseTime: {
            type: 'NUMERIC',
            label: 'Response Time (ms)'
        },
        gigaFlopsUsed: {
            type: 'NUMERIC',
            label: 'Operations Peformed (GFLOPs)'
        },
        energyConsumption: {
            type: 'NUMERIC',
            label: 'Energy Consumption'
        },
        responseHelpfulness: {
            type: 'NUMERIC',
            label: 'Response Helpfulness (1-5)'
        },
        policyCompliance: {
            type: 'NUMERIC',
            label: 'Policy Compliance (0 through 100%)',
        },
        toxicityScore: {
            type: 'NUMERIC',
            label: 'Toxicity Score (0-1)'
        },
        // Special: Numeric fields that can ALSO be treated as categories
        piiDetected: {
            type: 'NUMERIC',
            label: 'PII Detected (0 through 100%)',
        },
        // Timestamp
        responseTimestamp: { type: 'TIMESTAMP', label: 'Timestamp' }
    };

    // Returns a fields that can be used for a type
    function getFieldsByType(type) {
        return Object.keys(DATA_DICTIONARY).filter(key => {
            return DATA_DICTIONARY[key].dataType === type;
        });
    }

    // Create a <select> dropdown
    function createSelect(id, label, fieldKeys) {
        let options = fieldKeys.map(key =>
            `<option value="${key}">${DATA_DICTIONARY[key].label}</option>`
        ).join('');

        return `
      <label for="${id}">${label}:</label>
      <select id="${id}">
        <option value="">-- Select an option --</option>
        ${options}
      </select>
    `;
    }

    const addChartBtn = document.getElementById("add_new_chart");
    const modalContainer = document.getElementById("new-chart-modal");


    // Toggle Wizard
    addChartBtn.addEventListener("click", () => {
        // Check if the modal is already open
        if (modalContainer.classList.contains("active")) {
            modalContainer.classList.remove("active");
            modalContainer.innerHTML = ""; // Clear it
        } else {
            modalContainer.classList.add("active");
            renderStep1_ChartType(); // Start the wizard
        }
    });


    /**
     * Renders the first step: Choosing the chart type
     */
    function renderStep1_ChartType() {
        modalContainer.innerHTML = `
      <h3>Create a New Chart</h3>
      
      <div class="chart-form-step">
        <label>1. Select a Chart Type:</label>
        <div class="chart-type-selector">
          <button class="chart-type-btn" data-chart-type="line">📈</button>
          <button class="chart-type-btn" data-chart-type="bar">📊</button>
          <button class="chart-type-btn" data-chart-type="pie">🍩</button>
          <button class="chart-type-btn" data-chart-type="measure">🔢</button>
        </div>
      </div>
      
      <div id="chart-form-step-2" class="chart-form-step"></div>
      
      <div id="chart-form-step-3" class="chart-form-step"></div>

      <div id="chart-form-step-4" class="chart-form-step"></div>
    `;
    }

    /**
     * Renders the dynamic options based on the chosen chart type
     */
    function renderStep2_Options(chartType) {
        const step2Container = document.getElementById("chart-form-step-2");
        if (!step2Container) return;

        let html = "";
        const numericFields = getFieldsByType('numeric');
        const categoricalFields = getFieldsByType('categorical');

        // This switch is the core "lock-out" logic - prevents users from creating non-sensical graphs
        switch (chartType) {
            case 'line':
                html = `
                  <label>2. Configure Line Chart:</label>
                  ${createSelect('select-y-axis', 'Value to track (Y-Axis)', numericFields)}
                  <br>
                  ${createSelect('select-split-by', 'Split by (Optional)', categoricalFields)}
                  
                  <div id="split-filter-container" style="display:none; margin-top:10px; padding:10px; background:#f9f9f9; border:1px solid #ddd; overflow-y: auto;">
                    <strong>Filter Sub-Items (Optional):</strong>
                    <div id="split-checkboxes" style="display: flex; flex-direction: column; gap: 5px; margin-top: 5px;"></div>
                  </div>
                `;
                break;
            case 'bar':
                html = `
          <label>2. Configure Bar Chart:</label>
          ${createSelect('select-x-axis', 'Category (X-Axis)', categoricalFields)}
          <br>
          ${createSelect('select-y-axis', 'Value (Y-Axis)', numericFields)}
        `;
                break;

            case 'pie':
                html = `
          <label>2. Configure Pie Chart:</label>
          ${createSelect('select-category', 'Category to show', categoricalFields)}
        `;
                break;

            case 'measure':
                html = `
          <label>2. Configure Measure (KPI Card):</label>
          ${createSelect('select-y-axis', 'Value to show', numericFields)}
        `;
                break;
        }

        step2Container.innerHTML = html;
    }

    /**
     * Renders the "Title" input
     */
    function renderStep3_Title() {
        const step3Container = document.getElementById("chart-form-step-3");
        if (step3Container) {
            step3Container.innerHTML = `
        <label for="chart-title">3. Give it a title:</label>
        <input type="text" id="chart-title" placeholder="e.g. 'Response Time for All Models'" style="width: 100%; padding: 8px; box-sizing: border-box;">
        <br> 
       `;
        }
    }

    /**
 * Renders the chart size options and the final "Add Chart" button
 */
    function renderStep4_SizeAndSubmit() {
        const step4Container = document.getElementById("chart-form-step-4");
        if (step4Container) {
            step4Container.innerHTML = `
        <label>4. Select a chart size:</label>
        <div class="chart-size-selector">
            <input type="radio" id="size-tiny" name="chartSize" value="tiny">
            <label for="size-tiny">Tiny</label>
            
            <input type="radio" id="size-regular" name="chartSize" value="regular" checked>
            <label for="size-regular">Regular</label>

            <input type="radio" id="size-large" name="chartSize" value="large">
            <label for="size-large">Large</label>

            <input type="radio" id="size-massive" name="chartSize" value="massive">
            <label for="size-massive">Massive</label>
        </div>
        <br>
        <button id="submit-new-chart">Add Chart</button>
        `;
        }
    }


    let selectedChartType = null;

    modalContainer.addEventListener("click", async (e) => {

        // --- Handle Chart Type Button Click ---
        const chartBtn = e.target.closest(".chart-type-btn");
        if (chartBtn) {
            // Remove 'selected' from all buttons
            modalContainer.querySelectorAll(".chart-type-btn").forEach(btn => {
                btn.classList.remove("selected");
            });
            // Add 'selected' to the clicked one
            chartBtn.classList.add("selected");

            selectedChartType = chartBtn.dataset.chartType;

            // Render the next steps
            renderStep2_Options(selectedChartType);
            renderStep3_Title();
            renderStep4_SizeAndSubmit();
            updateSuggestedTitle();
            return; // Stop event processing
        }

        // --- Handle Final "Add Chart" Button Click ---
        const submitBtn = e.target.closest("#submit-new-chart");
        if (submitBtn) {
            const chartSize = document.querySelector('input[name="chartSize"]:checked')?.value || 'regular';

            // 1. Validation Logic
            const yAxis = document.getElementById('select-y-axis')?.value;
            const xAxis = document.getElementById('select-x-axis')?.value;
            const category = document.getElementById('select-category')?.value;

            if (selectedChartType === 'line' && !yAxis) {
                alert("Please select a value to track (Y-Axis).");
                return;
            }
            if (selectedChartType === 'bar' && (!yAxis || !xAxis)) {
                alert("Please select both X and Y axis values.");
                return;
            }
            if (selectedChartType === 'pie' && !category) {
                alert("Please select a category.");
                return;
            }
            if (selectedChartType === 'measure' && !yAxis) {
                alert("Please select a value to measure.");
                return;
            }

            // 2. Gather Filtered Values (New Feature)
            const includedValues = [];
            const checkboxes = document.querySelectorAll('input[name="split-filter-val"]:checked');
            if (checkboxes.length > 0) {
                checkboxes.forEach(cb => includedValues.push(cb.value));
            }

            // Gather all the data
            const config = {
                title: document.getElementById('chart-title')?.value || 'New Chart',
                chartType: selectedChartType,
                yAxis: yAxis,
                xAxis: xAxis,
                category: category,
                splitBy: document.getElementById('select-split-by')?.value,
                chartSize: chartSize,
                includedValues: includedValues // <--- Send to backend
            };

            try {
                const response = await fetch('api/graph', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log('Chart saved!', result.chart);

                    window.location.reload();

                } else {
                    console.error('Failed to save chart:', await response.text());
                    submitBtn.disabled = false; // Re-enable on error
                }

            } catch (err) {
                console.error('Error submitting new chart:', err);
                submitBtn.disabled = false; // Re-enable on error
            }

            // Close and clear the modal
            modalContainer.classList.remove("active");
            modalContainer.innerHTML = "";
        }
    });

    // Handle changes in the form (Title updates & Dynamic Checkboxes)
    modalContainer.addEventListener("change", (e) => {
        const targetId = e.target.id;

        // A. LOGIC: Render Checkboxes if "Split By" changes
        if (targetId === 'select-split-by') {
            const splitValue = e.target.value;
            const container = document.getElementById('split-filter-container');
            const checkboxArea = document.getElementById('split-checkboxes');

            if (container && checkboxArea) {
                // 1. Clear previous
                checkboxArea.innerHTML = '';
                container.style.display = 'none';

                // 2. Check if we have accepted values in the SSOT
                if (splitValue && DATA_DICTIONARY[splitValue] && DATA_DICTIONARY[splitValue].acceptedValues) {
                    const values = DATA_DICTIONARY[splitValue].acceptedValues;

                    // 3. Generate Checkboxes
                    values.forEach((val, idx) => {
                        const wrapper = document.createElement('div');
                        wrapper.innerHTML = `
                            <input type="checkbox" id="chk-${idx}" name="split-filter-val" value="${val}" checked>
                            <label for="chk-${idx}">${val}</label>
                        `;
                        checkboxArea.appendChild(wrapper);
                    });

                    // 4. Reveal
                    container.style.display = 'block';
                }
            }
        }

        // B. LOGIC: Update Title (if it's a select dropdown)
        if (e.target.tagName === 'SELECT') {
            updateSuggestedTitle();
        }
    });

    /**
    * Updates the chart title input with a suggested title
    */
    function updateSuggestedTitle() {
        const titleInput = document.getElementById('chart-title');
        if (!titleInput) return;

        // Helper: Only get text if a VALID value is selected
        const getLabel = (elId) => {
            const el = document.getElementById(elId);
            if (el && el.value && el.value !== "") { // Check value is not empty string
                return el.options[el.selectedIndex].text;
            }
            return null; // Return null if nothing valid selected
        };

        let title = '';
        const yLabel = getLabel('select-y-axis');
        const xLabel = getLabel('select-x-axis');
        const cLabel = getLabel('select-category');
        const sLabel = getLabel('select-split-by');

        switch (selectedChartType) {
            case 'line':
                if (yLabel && sLabel) title = `${yLabel} split by ${sLabel}`;
                else if (yLabel) title = `Average ${yLabel} Over Time`;
                break;
            case 'bar':
                if (yLabel && xLabel) title = `Average ${yLabel} by ${xLabel}`;
                break;
            case 'pie':
                if (cLabel) title = `Queries by ${cLabel}`;
                break;
            case 'measure':
                if (yLabel) title = `Average ${yLabel}`;
                break;
        }

        if (title) {
            titleInput.value = title;
        }
    }
});