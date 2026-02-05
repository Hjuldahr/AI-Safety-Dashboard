let activeModel = "GoodModel";
let isPaused = false;

const pauseText = "⏸ Pause Graphs";
const pauseColour = "#f45b69ff";
const playText = "▶ Resume Graphs";
const playColour = "#2ca58dff"

const loadChartsFromDatabase = window.DashboardApp.actions.loadCharts; // get the helper method exposed in the chartDataManager.js file.
const { ZOOM_LEVELS } = window.CONSTANTS; // array of timeframes in order like [10s, 30s, 1m, ..., 1mo]

document.addEventListener('DOMContentLoaded', function () {
    initAdminControls();
    ChartWizard.init();
});

/**
 * Section 1: Dashboard Admin Controls
 * Handles pausing, model switching, and refreshing
 */
async function initAdminControls() {
    const toggleButton = document.querySelector("#toggle-button"); //<button>
    const refreshButton = document.querySelector("#refresh-button"); //<button>
    const modelSelect = document.querySelector("#model-select"); //<select>


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
        loadChartsFromDatabase();
    })

    modelSelect.addEventListener('change', async (event) => {
        activeModel = event.target.value;
        updateServerSettings();

        await loadChartsFromDatabase()
    })


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
}

/**
 * Section 2: The Chart Wizard
 * A state-driven object to handle the multi-step form
 */
const ChartWizard = {
    container: null,
    btn: null,
    state: {
        step: 1,
        config: {
            chartType: null,
            yAxis: null,
            xAxis: null,
            category: null,
            splitBy: null,
            timeframe: null,
            chartSize: 'regular',
            title: '',
            includedValues: []
        }
    },

    init() {
        this.container = document.getElementById("new-chart-modal");
        this.btn = document.getElementById("add_new_chart");

        this.btn.addEventListener("click", () => this.toggleWizard());
        this.container.addEventListener("change", (e) => this.handleInputChange(e));
        this.container.addEventListener("click", (e) => this.handleClick(e));
    },

    toggleWizard() {
        if (this.container.classList.contains("active")) {
            this.close();
        } else {
            this.container.classList.add("active");
            this.renderStep1();
        }
    },

    close() {
        this.container.classList.remove("active");
        this.container.innerHTML = "";
        this.state.step = 1; // Reset
    },

    // --- Rendering Engines ---

    renderStep1() {
        this.state.step = 1;
        this.container.innerHTML = `
            <h3>Create a New Chart</h3>
            <div class="wizard-step" id="step-1">
                <label>1. Select a Chart Type:</label>
                <div class="chart-type-selector">
                    <button class="type-btn" data-type="line">📈 Line</button>
                    <button class="type-btn" data-type="bar">📊 Bar</button>
                    <button class="type-btn" data-type="pie">🍩 Pie</button>
                    <button class="type-btn" data-type="measure">🔢 KPI</button>
                </div>
            </div>
            <div id="dynamic-steps-container"></div>
        `;
    },

    renderNextStep() {
        const nextContainer = document.getElementById("dynamic-steps-container");
        let html = "";

        // We check current step and render the specific block for the NEXT step
        switch (this.state.step) {
            case 1: // Moving to Config
                this.state.step = 2;
                html = this.getStep2HTML();
                break;
            case 2: // Moving to Title
                this.state.step = 3;
                html = this.getStep3HTML();
                this.updateSuggestedTitle();
                break;
            case 3: // Moving to Timeframe (New Step!)
                this.state.step = 4;
                html = this.getStep4HTML();
                break;
            case 4: // Moving to Size/Submit
                this.state.step = 5;
                html = this.getStep5HTML();
                break;
        }

        nextContainer.insertAdjacentHTML('beforeend', html);

        // If we just rendered Step 3, trigger the title suggestion immediately
        if (this.state.step === 3) this.updateSuggestedTitle();
    },

    // --- HTML Generators ---

    getStep2HTML() {
        const type = this.state.config.chartType;
        const nums = getFieldsByType('numeric');
        const cats = getFieldsByType('categorical');

        let controls = "";
        if (type === 'line') {
            controls = `
                ${createSelect('select-y-axis', 'Value (Y-Axis)', nums)}
                ${createSelect('select-split-by', 'Split by (Optional)', cats)}
                <div id="split-filter-container" class="filter-container" style="display:none;">
                    <strong>Filter Sub-Items (Optional):</strong>
                    <div id="split-checkboxes" class="checkbox-group"></div>
                </div>`;
        } else if (type === 'bar') {
            controls = `${createSelect('select-x-axis', 'Category (X)', cats)} ${createSelect('select-y-axis', 'Value (Y)', nums)}`;
        } else if (type === 'pie') {
            controls = createSelect('select-category', 'Category', cats);
        } else {
            controls = createSelect('select-y-axis', 'KPI Value', nums);
        }

        return `<div class="wizard-step" id="step-2"><label>2. Configuration:</label>${controls}</div>`;
    },

    getStep3HTML() {
        return `
            <div class="wizard-step" id="step-3">
                <label for="chart-title">3. Give it a title:</label>
                <input type="text" id="chart-title" class="wizard-input-full" placeholder="e.g. 'Response Time for All Models'">
                <button class="next-btn" data-trigger="step3" style="margin-top:10px;">Continue</button>
            </div>`;
    },

    getStep4HTML() {
        const options = ZOOM_LEVELS.map(z => `
            <input type="radio" name="timeframe" value="${z}" id="tf-${z}">
            <label for="tf-${z}">${z}</label>
        `).join('');

        return `
            <div class="wizard-step" id="step-4">
                <label>4. Select Timeframe:</label>
                <div class="timeframe-selector">${options}</div>
            </div>`;
    },

    getStep5HTML() {
        return `
            <div class="wizard-step" id="step-5">
                <label>5. Finalize:</label>
                <select id="chart-size">
                    <option value="tiny">Tiny</option>
                    <option value="regular" selected>Regular</option>
                    <option value="large">Large</option>
                </select>
                <br><br>
                <button id="submit-new-chart" class="primary-btn">Add Chart to Dashboard</button>
            </div>`;
    },

    // --- Logic Handlers ---

    handleClick(e) {
        // Handle Chart Type selection
        if (e.target.classList.contains('type-btn')) {
            this.state.config.chartType = e.target.dataset.type;
            // Clear any previous step 2+ if user changes chart type
            document.getElementById("dynamic-steps-container").innerHTML = "";
            this.state.step = 1;
            this.renderNextStep();
        }

        // Handle Manual "Continue" buttons (if needed for text inputs)
        if (e.target.dataset.trigger === 'step3') {
            this.state.config.title = document.getElementById('chart-title').value;
            this.renderNextStep();
            e.target.style.display = 'none'; // Hide button after click
        }

        // Final Submit
        if (e.target.id === 'submit-new-chart') {
            this.submitChart();
        }
    },

    handleInputChange(e) {
        const { id, value, name, type, checked } = e.target;
        const config = this.state.config;

        // A. Sync basic selects to state
        if (id === 'select-y-axis') config.yAxis = value;
        if (id === 'select-x-axis') config.xAxis = value;
        if (id === 'select-category') config.category = value;
        if (id === 'select-split-by') config.splitBy = value;
        if (id === 'chart-size') config.chartSize = value;
        if (id === 'chart-title') config.title = value;

        // B. Handle Radio Buttons (Timeframe)
        if (name === 'timeframe') {
            config.timeframe = value;
            if (!document.getElementById('step-5')) this.renderNextStep();
        }

        // C. Special Logic for Split-By Checkboxes
        if (id === 'select-split-by') {
            this.renderSplitCheckboxes(value); // Moved to helper for cleanliness
        }

        // D. Auto-Advance Step 2
        if (this.state.step === 2 && this.isStep2Complete()) {
            if (!document.getElementById('step-3')) this.renderNextStep();
        }

        // E. Keep Title Updated
        if (this.state.step >= 2) {
            this.updateSuggestedTitle();
        }
    },

    renderSplitCheckboxes(val) {
        const container = document.getElementById('split-filter-container');
        const checkboxArea = document.getElementById('split-checkboxes');
        if (!container || !checkboxArea) return;

        checkboxArea.innerHTML = '';
        const fieldData = DATA_DICTIONARY[val];

        if (val && fieldData?.acceptedValues) {
            fieldData.acceptedValues.forEach((item, idx) => {
                const wrapper = document.createElement('div');
                wrapper.className = "checkbox-item";
                wrapper.innerHTML = `
                <input type="checkbox" id="chk-${idx}" name="split-filter-val" value="${item}" checked>
                <label for="chk-${idx}" style="display:inline; margin-left:5px;">${item}</label>
            `;
                checkboxArea.appendChild(wrapper);
            });
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    },

    isStep2Complete() {
        const { chartType } = this.state.config;
        if (chartType === 'line' || chartType === 'measure') return !!document.getElementById('select-y-axis').value;
        if (chartType === 'bar') return !!document.getElementById('select-y-axis').value && !!document.getElementById('select-x-axis').value;
        if (chartType === 'pie') return !!document.getElementById('select-category').value;
        return false;
    },

    /**
    * Updates the chart title input with a suggested title
    */
    updateSuggestedTitle() {
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

        const { chartType } = this.state.config;
        const yLabel = getLabel('select-y-axis');
        const xLabel = getLabel('select-x-axis');
        const cLabel = getLabel('select-category');
        const sLabel = getLabel('select-split-by');

        let suggested = '';

        switch (chartType) {
            case 'line':
                if (yLabel && sLabel) suggested = `${yLabel} split by ${sLabel}`;
                else if (yLabel) suggested = `Average ${yLabel} Over Time`;
                break;
            case 'bar':
                if (yLabel && xLabel) suggested = `Average ${yLabel} by ${xLabel}`;
                break;
            case 'pie':
                if (cLabel) suggested = `Queries by ${cLabel}`;
                break;
            case 'measure':
                if (yLabel) suggested = `Average ${yLabel}`;
                break;
        }

        if (suggested) {
            titleInput.value = suggested;
            this.state.config.title = suggested; // Sync with state
        }
    },

    async submitChart() {
        // get the included topics / subtopics if selected
        const includedValues = Array.from(
            document.querySelectorAll('input[name="split-filter-val"]:checked')
        ).map(cb => cb.value);

        const newConfig = {
            ...this.state.config,
            includedValues: includedValues,
            chartSize: document.getElementById('chart-size').value,
            title: document.getElementById('chart-title').value
        };

        const response = await fetch('api/graph', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });

        if (response.ok) {
            const result = await response.json();
            this.close();
            loadChartsFromDatabase();
        } else {
            alert("Error Creating Chart!");
            throw new Error("Error creating chart!");
        }


    }
}

/**
 * Helper: Build Select HTML
 */
function createSelect(id, label, fieldKeys) {
    let options = fieldKeys.map(key => `<option value="${key}">${DATA_DICTIONARY[key].label}</option>`).join('');
    return `<div class="field-group"><label>${label}:</label><select id="${id}"><option value="">-- Select --</option>${options}</select></div>`;
}

function getFieldsByType(type) {
    return Object.keys(DATA_DICTIONARY).filter(key => DATA_DICTIONARY[key].dataType === type);
}