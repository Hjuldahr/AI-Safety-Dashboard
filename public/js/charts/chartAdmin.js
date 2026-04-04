(() => {
    const charts = window.DashboardApp.charts;
    const loadChartsFromDatabase = window.DashboardApp.actions.loadCharts; // get the helper method exposed in the chartDataManager.js file.
    const { ZOOM_LEVELS } = window.CONSTANTS;


    // ---------- Reorder (Gridstack auto-saves via handleGridChange in chartDataManager) ----------
    async function saveNewOrder() {
        // Kept for backward compat — Gridstack auto-saves layout on change
        const grid = window.DashboardApp.gridInstance;
        if (!grid) return;

        const items = grid.save(false);
        const layout = items.map(item => ({
            id: item.id,
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
        }));

        try {
            const response = await fetch('api/gridLayout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layout })
            });
            if (!response.ok) throw new Error('Failed to save grid layout.');
            console.log('Grid layout saved.');
        } catch (error) {
            console.error('Error saving grid layout:', error);
        }
    }

    // ---------- Editor ----------
    async function openEditForm(id) {
        const formContainer = document.getElementById(`edit-form-${id}`);
        if (!formContainer) return;
        const chartCard = formContainer.closest('.chart-card');
        if (!chartCard) return;

        if (formContainer.innerHTML !== "") {
            closeEditForm(id);
            return;
        }

        try {
            // Expand the Gridstack widget to full width for editing
            const grid = window.DashboardApp.gridInstance;
            const widgetEl = chartCard.closest('.grid-stack-item');
            if (grid && widgetEl) {
                const node = widgetEl.gridstackNode;
                if (node) {
                    widgetEl.dataset.origW = node.w;
                    widgetEl.dataset.origH = node.h;
                    grid.update(widgetEl, { w: 12, h: 6 });
                }
            }

            const canvas = chartCard.querySelector('canvas');
            const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');
            if (canvas) canvas.style.display = 'none';
            if (kpiWrapper) kpiWrapper.style.display = 'none';

            const response = await fetch(`api/getChartConfig/${id}`);
            if (!response.ok) throw new Error('Failed to fetch config');
            const { config } = await response.json();

            // Determine which field holds the category/split info
            let splitField = null;
            if (config.chartType === 'line') splitField = config.splitBy;
            if (config.chartType === 'bar') splitField = config.xAxis;
            if (config.chartType === 'pie') splitField = config.category;

            let filterHtml = '';

            // If we have a field to split by, check the Data Dictionary for sub-values
            if (splitField) {
                const dictEntry = window.CONSTANTS.DATA_DICTIONARY[splitField];

                if (dictEntry && dictEntry.acceptedValues) {
                    const checkboxes = dictEntry.acceptedValues.map((val, idx) => {
                        // Check if this value was previously filtered
                        const isChecked = (!config.includedValues || config.includedValues.length === 0)
                            ? true
                            : config.includedValues.includes(val);

                        return `
                            <div style="margin-bottom: 4px;">
                                <input type="checkbox" id="edit-filter-${id}-${idx}" 
                                    name="edit-filter-val-${id}" value="${val}" 
                                    ${isChecked ? 'checked' : ''}>
                                <label for="edit-filter-${id}-${idx}">${val}</label>
                            </div>
                        `;
                                }).join('');

                                filterHtml = `
                        <div class="card-edit-filter-form" style="margin-top:10px; padding:10px; background:#f9f9f9; border-radius:4px;">
                            <strong style="display:block; margin-bottom:5px;">Filter ${dictEntry.label}:</strong>
                            ${checkboxes}
                        </div>
                    `;
                }
            }



            chartCard.classList.add('is-editing'); // Signal for CSS

            const timeframeOptions = window.CONSTANTS.ZOOM_LEVELS.map(z => `
                <div class="timeframe-option">
                    <input type="radio" id="edit-tf-${id}-${z}" name="edit-timeframe-${id}" value="${z}" ${config.chartTimeRange === z ? 'checked' : ''}>
                    <label for="edit-tf-${id}-${z}">${z}</label>
                </div>
            `).join('');

            formContainer.innerHTML = `
                <label for="edit-title-${id}">Chart Title:</label>
                <input type="text" id="edit-title-${id}" value="${config.title}">
                
                <label>Timeframe Range:</label>
                <div class="edit-timeframe-selector">
                    ${timeframeOptions}
                </div>

                <label>Chart Size:</label>
                <div class="size-selector">
                    <div><input type="radio" id="edit-size-tiny-${id}" name="edit-size-${id}" value="tiny" ${config.chartSize === 'tiny' ? 'checked' : ''}><label for="edit-size-tiny-${id}">Tiny</label></div>
                    <div><input type="radio" id="edit-size-regular-${id}" name="edit-size-${id}" value="regular" ${config.chartSize === 'regular' ? 'checked' : ''}><label for="edit-size-regular-${id}">Regular</label></div>
                    <div><input type="radio" id="edit-size-large-${id}" name="edit-size-${id}" value="large" ${config.chartSize === 'large' ? 'checked' : ''}><label for="edit-size-large-${id}">Large</label></div>
                    <div><input type="radio" id="edit-size-massive-${id}" name="edit-size-${id}" value="massive" ${config.chartSize === 'massive' ? 'checked' : ''}><label for="edit-size-massive-${id}">Massive</label></div>
                </div>

                ${filterHtml}

                <div class="form-actions">
                    <button type="button" class="cancel-edit-btn" data-id="${id}">Cancel</button>
                    <button type="button" class="save-edit-btn" data-id="${id}">Save</button>
                </div>
            `;
            formContainer.style.display = 'flex';
        } catch (error) {
            console.error('Error opening edit form:', error);
            formContainer.innerHTML = '<p style="color:red;">Error loading data.</p>';
            formContainer.style.display = 'block';
        }
    }

    function closeEditForm(id) {
        const formContainer = document.getElementById(`edit-form-${id}`);
        if (!formContainer) return;
        const chartCard = formContainer.closest('.chart-card');
        if (!chartCard) return;

        const canvas = chartCard.querySelector('canvas');
        const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');

        // Revert Gridstack widget to original size
        const grid = window.DashboardApp.gridInstance;
        const widgetEl = chartCard.closest('.grid-stack-item');
        if (grid && widgetEl && widgetEl.dataset.origW) {
            grid.update(widgetEl, {
                w: parseInt(widgetEl.dataset.origW),
                h: parseInt(widgetEl.dataset.origH)
            });
            delete widgetEl.dataset.origW;
            delete widgetEl.dataset.origH;
        }

        chartCard.classList.remove('is-editing');

        // Restore Visibility
        if (canvas) canvas.style.display = 'block';
        if (kpiWrapper) kpiWrapper.style.display = 'flex';

        // Resize Chart.js canvas after widget reverts
        const chartInstance = charts[id];
        if (chartInstance instanceof Chart) {
            setTimeout(() => chartInstance.resize(), 300);
        }

        // Hide Form
        formContainer.style.display = 'none';
        formContainer.innerHTML = '';
    }

    const SIZE_TO_GRID = {
        tiny:    { w: 2, h: 1 },
        regular: { w: 4, h: 2 },
        large:   { w: 6, h: 2 },
        massive: { w: 12, h: 4 }
    };

    async function handleSaveEdit(id) {
        const newTitle = document.getElementById(`edit-title-${id}`).value;
        const newSize = document.querySelector(`input[name="edit-size-${id}"]:checked`).value;
        const newTimeframe = document.querySelector(`input[name="edit-timeframe-${id}"]:checked`).value;

        let newIncludedValues = null; // Default to null if we aren't editing filters
        const checkboxes = document.querySelectorAll(`input[name="edit-filter-val-${id}"]:checked`);

        // Only process this if checkboxes actually appeared in the DOM
        if (document.querySelector(`input[name="edit-filter-val-${id}"]`)) {
            newIncludedValues = [];
            checkboxes.forEach(cb => newIncludedValues.push(cb.value));
        }

        // Compute new grid dimensions from size
        const dims = SIZE_TO_GRID[newSize] || SIZE_TO_GRID.regular;

        try {
            const response = await fetch('api/graph', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    title: newTitle,
                    chartSize: newSize,
                    chartTimeRange: newTimeframe,
                    includedValues: newIncludedValues,
                    gridW: dims.w,
                    gridH: dims.h
                })
            });
            if (!response.ok) throw new Error('Failed to save changes.');
            alert("Chart Updated Successfully!");

            // Update the UI
            await loadChartsFromDatabase();
        } catch (error) {
            console.error('Error saving chart:', error);
            alert("Error Updating Chart!")
        }
    }

    // ---------- Delete ----------
    async function deleteGraph(id, chartCardElement) {
        try {
            const isAdmin = document.querySelector("#isAdmin");
            if (!isAdmin) return;
            const response = await fetch('api/graph', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!response.ok) throw new Error('Failed to delete graph from server');
            if (charts[id] instanceof Chart) charts[id].destroy();
            delete charts[id];
            chartCardElement.remove();
            alert('Chart deleted successfully.')

            // Update the UI
            await loadChartsFromDatabase();
        } catch (error) {
            console.error('Error deleting Chart:', error);
            alert("Error Deleting Chart!");
        }
    }

    // ---------- Zoom In ----------
    async function handleZoom(id, direction) {
        try {
            // Get the config from the global state array, not the chart instance
            const config = window.DashboardApp.configs.find(c => c._id === id);

            if (!config) throw new Error("Chart config not found in local state");

            const currentTimeframe = config.chartTimeRange;
            let tfIndex = ZOOM_LEVELS.indexOf(currentTimeframe);

            if (direction === "in") {
                tfIndex--;
                if (tfIndex <= -1) {
                    alert("Can not zoom in any further.");
                    tfIndex = 0;
                }
            } else if (direction === "out") {
                tfIndex++;
                if (tfIndex >= ZOOM_LEVELS.length) {
                    alert("Can not zoom out any further.");
                    tfIndex = ZOOM_LEVELS.length - 1;
                }
            } else {
                throw new Error("Unsupported zoom direction: ", direction);
            }
            
            // Send update
            const response = await fetch('api/graph', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    chartTimeRange: ZOOM_LEVELS[tfIndex]
                })
            });

            if (!response.ok) throw new Error('Failed to save changes.');

            await loadChartsFromDatabase();

        } catch (error) {
            console.error("Error in Zoom Handler: ", error)
        }

    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================

    // ---------- Event Delegation for Admin Buttons ----------
    document.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('edit-chart-btn')) openEditForm(id);
        if (e.target.classList.contains('delete-chart-btn')) {
            const card = e.target.closest('.chart-card');
            if (card && confirm(`Are you sure you want to delete this chart?`)) {
                await deleteGraph(id, card);
            }
        }
        if (e.target.classList.contains('cancel-edit-btn')) closeEditForm(id);
        if (e.target.classList.contains('save-edit-btn')) await handleSaveEdit(id);
        if (e.target.classList.contains('zoom-in')) await handleZoom(id, "in");
        if (e.target.classList.contains('zoom-out')) await handleZoom(id, "out");
    });

    // EXPORT functions to the public namespace
    window.DashboardApp.admin.saveNewOrder = saveNewOrder;
    window.DashboardApp.admin.openEditForm = openEditForm;
    window.DashboardApp.admin.closeEditForm = closeEditForm;
    window.DashboardApp.admin.handleSaveEdit = handleSaveEdit;
    window.DashboardApp.admin.deleteGraph = deleteGraph;
})();