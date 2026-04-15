(() => {
    const charts = window.DashboardApp.charts;
    const loadChartsFromDatabase = window.DashboardApp.actions.loadCharts; // get the helper method exposed in the chartDataManager.js file.
    const { ZOOM_LEVELS } = window.CONSTANTS;


    // ---------- Reorder ----------
    async function saveNewOrder() {
        const mainContainer = document.querySelector('.charts-container');
        if (!mainContainer) return;

        const newOrderArray = [];

        for (const child of mainContainer.children) {
            if (child.classList.contains('chart-card') && child.dataset.id) {
                newOrderArray.push({ id: child.dataset.id });
            }
            if (child.classList.contains('tiny-group-wrapper')) {
                for (const tinyCard of child.children) {
                    if (tinyCard.dataset.id) newOrderArray.push({ id: tinyCard.dataset.id });
                }
            }
        }

        try {
            const response = await fetch('api/reorder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newOrder: newOrderArray })
            });
            if (!response.ok) throw new Error('Server failed to save new order.');
            console.log('New chart order saved.');
            alert('Chart order saved!');

            await loadChartsFromDatabase();
        } catch (error) {
            console.error('Error saving chart order:', error);
        }
    }

    // ---------- Chart Edit Modal ----------
    let _modalBound = false;

    function _bindModalClose() {
        if (_modalBound) return;
        _modalBound = true;
        const overlay = document.getElementById("global-modal");
        overlay.querySelectorAll(".close-modal-btn").forEach(btn => {
            btn.addEventListener("click", () => closeChartEditModal());
        });
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeChartEditModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && overlay.style.display !== "none") closeChartEditModal();
        });
    }

    function openChartEditModal(title, bodyNode, footerNode) {
        const overlay = document.getElementById("global-modal");
        const content = document.getElementById("global-modal-content");
        const body = document.getElementById("global-modal-body");
        const titleEl = document.getElementById("global-modal-title");
        const footer = document.getElementById("global-modal-footer");

        _bindModalClose();

        titleEl.innerText = title;
        body.replaceChildren(bodyNode);
        footer.replaceChildren(footerNode);
        content.className = "modal-content large-modal";
        overlay.style.display = "flex";
    }

    function closeChartEditModal() {
        const overlay = document.getElementById("global-modal");
        const body = document.getElementById("global-modal-body");
        const footer = document.getElementById("global-modal-footer");
        body.innerHTML = "";
        footer.innerHTML = "";
        overlay.style.display = "none";
    }

    // ---------- Editor ----------
    async function openEditForm(id) {
        try {
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
                        <div class="card-edit-filter-form" style="margin-top:10px; padding:10px; border-radius:4px;">
                            <strong style="display:block; margin-bottom:5px;">Filter ${dictEntry.label}:</strong>
                            ${checkboxes}
                        </div>
                    `;
                }
            }



            const timeframeOptions = window.CONSTANTS.ZOOM_LEVELS.map(z => `
                <div class="timeframe-option">
                    <input type="radio" id="edit-tf-${id}-${z}" name="edit-timeframe-${id}" value="${z}" ${config.chartTimeRange === z ? 'checked' : ''}>
                    <label for="edit-tf-${id}-${z}">${z}</label>
                </div>
            `).join('');

            // Build form body for the modal
            const bodyNode = document.createElement('div');
            bodyNode.className = 'edit-chart-form';
            bodyNode.style.display = 'flex';
            bodyNode.innerHTML = `
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
            `;

            // Build footer with action buttons
            const footerNode = document.createElement('div');
            footerNode.className = 'form-actions';
            footerNode.innerHTML = `
                <button type="button" class="cancel-edit-btn" data-id="${id}">Cancel</button>
                <button type="button" class="save-edit-btn" data-id="${id}">Save</button>
            `;

            openChartEditModal('Edit Chart', bodyNode, footerNode);
        } catch (error) {
            console.error('Error opening edit form:', error);
        }
    }

    function closeEditForm(id) {
        closeChartEditModal();
    }

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

        try {
            const response = await fetch('api/graph', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    title: newTitle,
                    chartSize: newSize,
                    chartTimeRange: newTimeframe,
                    includedValues: newIncludedValues
                })
            });
            if (!response.ok) throw new Error('Failed to save changes.');
            closeChartEditModal();
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