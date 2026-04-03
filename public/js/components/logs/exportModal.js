/**
 * Export Modal for the Logs page.
 * Opens a modal that lets the user pick a date range and format (CSV / HDF5),
 * then triggers a file download for the currently active log view.
 */

const VIEW_CONFIG = {
    user:    { label: 'User Logs',    csvPath: 'logs/api/user/export/csv',    hdf5Path: 'logs/api/user/export/hdf5' },
    ai:      { label: 'AI Logs',      csvPath: 'logs/api/ai/export/csv',      hdf5Path: 'logs/api/ai/export/hdf5' },
    summary: { label: 'AI Summaries', csvPath: 'logs/api/summary/export/csv', hdf5Path: 'logs/api/summary/export/hdf5' }
};

/**
 * @param {ModalManager} modalManager
 * @param {object} opts
 * @param {string} opts.activeView   - 'user' | 'ai' | 'summary'
 * @param {object} opts.currentFilters - { startDate, endDate, modelName, eventType }
 */
export function openExportModal(modalManager, { activeView, currentFilters }) {
    const config = VIEW_CONFIG[activeView];
    if (!config) return;

    // --- Build modal body ---
    const body = document.createElement('div');
    body.className = 'export-modal-body';
    body.innerHTML = `
        <p>Export <strong>${config.label}</strong> for the selected time range.</p>

        <div class="export-modal-field">
            <label for="export-start-date">Start Date</label>
            <input type="date" id="export-start-date" value="${currentFilters.startDate || ''}">
        </div>

        <div class="export-modal-field">
            <label for="export-end-date">End Date</label>
            <input type="date" id="export-end-date" value="${currentFilters.endDate || ''}">
        </div>

        <div class="export-modal-field">
            <label>Format</label>
            <div class="export-format-options">
                <label class="export-radio-label">
                    <input type="radio" name="export-format" value="csv" checked> CSV
                </label>
                <label class="export-radio-label">
                    <input type="radio" name="export-format" value="hdf5"> HDF5
                </label>
            </div>
        </div>

        <p id="export-error-msg" class="export-error" style="display:none;"></p>
    `;

    // --- Build modal footer ---
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.gap = '8px';
    footer.style.justifyContent = 'flex-end';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => modalManager.close());

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-primary';
    exportBtn.textContent = 'Export';
    exportBtn.addEventListener('click', () => handleExport(body, config, currentFilters, exportBtn, modalManager));

    footer.appendChild(cancelBtn);
    footer.appendChild(exportBtn);

    modalManager.open(`Export ${config.label}`, body, footer, 'medium-modal');
}

async function handleExport(body, config, currentFilters, exportBtn, modalManager) {
    const startDate = body.querySelector('#export-start-date').value;
    const endDate = body.querySelector('#export-end-date').value;
    const format = body.querySelector('input[name="export-format"]:checked').value;
    const errorMsg = body.querySelector('#export-error-msg');

    errorMsg.style.display = 'none';

    const endpoint = format === 'hdf5' ? config.hdf5Path : config.csvPath;

    const payload = {};
    if (startDate) payload.startDate = startDate;
    if (endDate) payload.endDate = endDate;
    if (currentFilters.modelName && currentFilters.modelName !== 'all') {
        payload.modelName = currentFilters.modelName;
    }
    if (currentFilters.eventType && currentFilters.eventType !== 'all') {
        payload.eventType = currentFilters.eventType;
    }

    exportBtn.disabled = true;
    exportBtn.textContent = 'Exporting...';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({ message: 'Export failed.' }));
            errorMsg.textContent = errData.message;
            errorMsg.style.display = 'block';
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');

        let filename = `export.${format === 'hdf5' ? 'h5' : 'csv'}`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        modalManager.close();
    } catch (err) {
        console.error('Export error:', err);
        errorMsg.textContent = 'An unexpected error occurred during export.';
        errorMsg.style.display = 'block';
    } finally {
        exportBtn.disabled = false;
        exportBtn.textContent = 'Export';
    }
}

export default { openExportModal };
