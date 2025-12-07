(() => {
    const charts = window.DashboardApp.charts;
    const loadChartsFromDatabase = window.DashboardApp.actions.loadCharts; // get the helper method exposed in the chartDataManager.js file.


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
            const response = await fetch('/api/reorder', {
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
            alert('Error: Could not save chart order.');
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
            const ALL_SIZE_CLASSES = ['chart-tiny', 'chart-regular', 'chart-large', 'chart-massive'];
            let originalSize = ALL_SIZE_CLASSES.find(c => chartCard.classList.contains(c)) || 'chart-regular';
            chartCard.dataset.originalSize = originalSize;

            if (originalSize === 'chart-tiny') {
                const wrapper = chartCard.closest('.tiny-group-wrapper');
                if (wrapper) {
                    // BUG FIX: Ensure the wrapper has an ID so we can find it later
                    if (!wrapper.id) {
                        wrapper.id = 'tiny-wrapper-' + Math.random().toString(36).substr(2, 9);
                    }

                    chartCard.dataset.wrapperId = wrapper.id;
                    wrapper.parentNode.insertBefore(chartCard, wrapper);
                }
                chartCard.classList.remove('chart-tiny');
                chartCard.classList.add('chart-regular');
            }

            if (originalSize === 'chart-tiny') {
                const wrapper = chartCard.closest('.tiny-group-wrapper');
                if (wrapper) {
                    chartCard.dataset.wrapperId = wrapper.id;
                    wrapper.parentNode.insertBefore(chartCard, wrapper);
                }
                chartCard.classList.remove('chart-tiny');
                chartCard.classList.add('chart-regular');
            }

            const canvas = chartCard.querySelector('canvas');
            const kpiWrapper = chartCard.querySelector('.kpi-content-wrapper');
            if (canvas) canvas.style.display = 'none';
            if (kpiWrapper) kpiWrapper.style.display = 'none';

            const response = await fetch(`/api/getChartConfig/${id}`);
            if (!response.ok) throw new Error('Failed to fetch config');
            const { config } = await response.json();

            let filterHtml = '';
            if (config.chartType === 'line' && config.splitBy) {
                const dictEntry = window.CONSTANTS.DATA_DICTIONARY[config.splitBy];

                if (dictEntry && dictEntry.acceptedValues) {
                    const checkboxes = dictEntry.acceptedValues.map((val, idx) => {
                        // If includedValues is empty, it means "Show All", so check everything.
                        // If it has items, check only those items.
                        const isChecked = (!config.includedValues || config.includedValues.length === 0)
                            ? true
                            : config.includedValues.includes(val);

                        return `
                        <div style="margin-bottom: 4px;">
                            <input type="checkbox" id="edit-filter-${id}-${idx}" name="edit-filter-val-${id}" value="${val}" ${isChecked ? 'checked' : ''}>
                            <label for="edit-filter-${id}-${idx}">${val}</label>
                        </div>
                    `;
                    }).join('');

                    filterHtml = `
                    <div class="card-edit-filter-form">
                        <strong style="display:block; margin-bottom:5px;">Filter ${dictEntry.label}:</strong>
                        ${checkboxes}
                    </div>
                `;
                }
            }

            formContainer.innerHTML = `
            <label for="edit-title-${id}">Chart Title:</label>
            <input type="text" id="edit-title-${id}" value="${config.title}">
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

        // Revert Size Class
        const originalSize = chartCard.dataset.originalSize || 'chart-regular';

        // Remove ALL size classes to be safe, then add the original
        chartCard.classList.remove('chart-tiny', 'chart-regular', 'chart-large', 'chart-massive');
        chartCard.classList.add(originalSize);

        // Revert DOM Position (for Tiny charts)
        if (chartCard.dataset.wrapperId) {
            const wrapper = document.getElementById(chartCard.dataset.wrapperId);
            if (wrapper) {
                // Append it back into the tiny group
                wrapper.appendChild(chartCard);
            }
            delete chartCard.dataset.wrapperId;
        }

        delete chartCard.dataset.originalSize;

        // Restore Visibility
        if (canvas) canvas.style.display = 'block';
        if (kpiWrapper) kpiWrapper.style.display = 'flex';

        // Hide Form
        formContainer.style.display = 'none';
        formContainer.innerHTML = '';
    }

    async function handleSaveEdit(id) {
        const newTitle = document.getElementById(`edit-title-${id}`).value;
        const newSize = document.querySelector(`input[name="edit-size-${id}"]:checked`).value;

        let newIncludedValues = null; // Default to null if we aren't editing filters
        const checkboxes = document.querySelectorAll(`input[name="edit-filter-val-${id}"]:checked`);

        // Only process this if checkboxes actually appeared in the DOM
        if (document.querySelector(`input[name="edit-filter-val-${id}"]`)) {
            newIncludedValues = [];
            checkboxes.forEach(cb => newIncludedValues.push(cb.value));
        }

        try {
            const response = await fetch('/api/updateGraph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id,
                    newTitle,
                    newSize,
                    includedValues: newIncludedValues
                })
            });
            if (!response.ok) throw new Error('Failed to save changes.');
            alert("Chart Updated Successfully!")
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
            const response = await fetch('/api/deleteGraph', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!response.ok) throw new Error('Failed to delete graph from server');
            if (charts[id] instanceof Chart) charts[id].destroy();
            delete charts[id];
            chartCardElement.remove();
            alert('Chart deleted successfully.')
        } catch (error) {
            console.error('Error deleting Chart:', error);
            alert("Error Deleting Chart!");
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
                window.location.reload();
            }
        }
        if (e.target.classList.contains('cancel-edit-btn')) {
            closeEditForm(id);
        }
        if (e.target.classList.contains('save-edit-btn')) {
            await handleSaveEdit(id);
            window.location.reload();
        }
    });

    // EXPORT functions to the public namespace
    window.DashboardApp.admin.saveNewOrder = saveNewOrder;
    window.DashboardApp.admin.openEditForm = openEditForm;
    window.DashboardApp.admin.closeEditForm = closeEditForm;
    window.DashboardApp.admin.handleSaveEdit = handleSaveEdit;
    window.DashboardApp.admin.deleteGraph = deleteGraph;
})();