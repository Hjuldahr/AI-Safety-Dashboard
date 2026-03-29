// --- GLOBAL STATE ---
let isGeneratingReport = false;
let lastPdfUrl = null;
let cutoffTimestamp = 0;
let templates = []; // Loaded from window.REPORT_TEMPLATES

// --- HELPER FUNCTION ---
const setButtonState = (elements, disabled, text) => {
    if (elements.submitBtn) {
        elements.submitBtn.disabled = disabled;
        elements.submitBtn.textContent = text;
    }
}

// ===============================================
// === TEMPLATE FUNCTIONS ========================
// ===============================================

/**
 * Applies a template by checking the corresponding field checkboxes.
 */
function applyTemplate(fields) {
    const checkboxes = document.querySelectorAll('input[name="fields"]');
    checkboxes.forEach(cb => cb.checked = false);

    fields.forEach(val => {
        const target = document.querySelector(`input[value="${val}"]`);
        if (target) target.checked = true;
    });
}

/**
 * Renders template pills into the container from the templates array.
 */
function renderTemplatePills() {
    const container = document.getElementById('template-pills');
    if (!container) return;

    container.innerHTML = '';

    templates.forEach(t => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'pill template-pill';
        pill.dataset.id = t._id;
        pill.textContent = `${t.icon || '📋'} ${t.name}`;
        pill.addEventListener('click', () => applyTemplate(t.fields));

        // Delete button (x) on each pill
        const delBtn = document.createElement('span');
        delBtn.className = 'pill-delete';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Delete template';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTemplate(t._id, t.name);
        });

        pill.appendChild(delBtn);
        container.appendChild(pill);
    });
}

/**
 * Deletes a template and re-renders the pills.
 */
async function deleteTemplate(id, name) {
    if (!confirm(`Delete template "${name}"?`)) return;

    try {
        const res = await fetch(`reports/templates/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Delete failed' }));
            alert(err.message);
            return;
        }
        templates = templates.filter(t => t._id !== id);
        renderTemplatePills();
    } catch (e) {
        console.error('Delete template error:', e);
        alert('Failed to delete template.');
    }
}

/**
 * Opens the save template modal using the global modal elements.
 */
function openSaveTemplateModal() {
    const selectedFields = Array.from(document.querySelectorAll('input[name="fields"]:checked'))
        .map(cb => cb.value);

    if (selectedFields.length === 0) {
        alert('Please select at least one field before saving a template.');
        return;
    }

    const overlay = document.getElementById('global-modal');
    const content = document.getElementById('global-modal-content');
    const title = document.getElementById('global-modal-title');
    const body = document.getElementById('global-modal-body');
    const footer = document.getElementById('global-modal-footer');

    title.innerText = 'Save Report Template';
    content.className = 'modal-content medium-modal';

    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Template Name</label>
            <input type="text" id="template-name-input" placeholder="e.g. My Custom Template"
                   style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px; box-sizing:border-box;" />
        </div>
        <div style="margin-bottom: 16px;">
            <label style="display:block; font-weight:600; margin-bottom:6px;">Icon (optional emoji)</label>
            <input type="text" id="template-icon-input" placeholder="e.g. 🔥" maxlength="4"
                   style="width:80px; padding:10px; border:1px solid #e2e8f0; border-radius:6px; font-size:1.2rem; text-align:center;" />
        </div>
        <div>
            <label style="display:block; font-weight:600; margin-bottom:6px;">Fields to save</label>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${selectedFields.map(f => `<span style="padding:4px 10px; background:#f0f4ff; border:1px solid #e2e8f0; border-radius:14px; font-size:0.8rem;">${f}</span>`).join('')}
            </div>
        </div>
    `;

    footer.innerHTML = `
        <button id="save-template-confirm" class="btn-primary" style="padding:10px 20px;">
            <i class="fa-solid fa-floppy-disk"></i> Save Template
        </button>
        <button class="close-modal-btn btn-secondary" style="padding:10px 20px; margin-left:8px;">Cancel</button>
    `;

    // Wire up save button
    document.getElementById('save-template-confirm').addEventListener('click', async () => {
        const name = document.getElementById('template-name-input').value.trim();
        const icon = document.getElementById('template-icon-input').value.trim();

        if (!name) {
            alert('Please enter a template name.');
            return;
        }

        try {
            const res = await fetch('reports/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, icon, fields: selectedFields })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Save failed' }));
                alert(err.message);
                return;
            }

            const newTemplate = await res.json();
            templates.push(newTemplate);
            renderTemplatePills();

            // Close modal
            overlay.style.display = 'none';
            body.innerHTML = '';
        } catch (e) {
            console.error('Save template error:', e);
            alert('Failed to save template.');
        }
    });

    // Wire up cancel/close
    footer.querySelector('.close-modal-btn').addEventListener('click', () => {
        overlay.style.display = 'none';
        body.innerHTML = '';
    });

    overlay.style.display = 'flex';
}

// ===============================================
// === FIDELITY FUNCTIONS ========================
// ===============================================

/**
 * Checks the selected dates against the cutoff time and
 * adjusts the UI (enabling/disabling seconds, and the appendix checkbox).
 */
const evaluateFidelityState = () => {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const appendixCheckbox = document.querySelector('input[value="flaggedOutputs"]');

    if (!cutoffTimestamp) return;

    const startMs = startInput.value ? new Date(startInput.value).getTime() : Date.now();
    const endMs = endInput.value ? new Date(endInput.value).getTime() : Date.now();

    if (endMs < cutoffTimestamp) {
        startInput.step = "60";
        endInput.step = "60";
        if (appendixCheckbox) {
            appendixCheckbox.checked = false;
            appendixCheckbox.disabled = true;
            appendixCheckbox.parentElement.style.opacity = '0.5';
            appendixCheckbox.parentElement.title = 'Raw flagged outputs are not available for dates older than the retention period.';
        }
    } else {
        startInput.step = "1";
        endInput.step = "1";
        if (appendixCheckbox) {
            appendixCheckbox.disabled = false;
            appendixCheckbox.parentElement.style.opacity = '1';
            appendixCheckbox.parentElement.title = '';
        }
    }
};

// ===============================================
// === REPORT GENERATION =========================
// ===============================================

const handleReportSubmit = async (elements) => {
    if (isGeneratingReport) return;
    isGeneratingReport = true;

    if (elements.statusText) elements.statusText.textContent = 'Generating report... Please wait.';
    setButtonState(elements, true, 'Generating...');

    if (elements.previewWrapper) elements.previewWrapper.style.display = 'none';

    try {
        const formEl = elements.form;
        if (!formEl) throw new Error('Report form not found');

        const formData = new FormData(formEl);
        const selectedFields = formData.getAll('fields');

        if (selectedFields.length === 0) {
            throw new Error('Please select at least one data field to generate a report.');
        }

        const payload = {
            reportTitle: formData.get('reportTitle'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            modelName: formData.get('modelName'),
            fields: selectedFields
        };

        const response = await fetch('reports', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            let errorMessage = `HTTP ${response.status} failed.`;
            try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
            }
            throw new Error(errorMessage);
        }

        const pdfBlob = await response.blob();

        if (lastPdfUrl) {
            URL.revokeObjectURL(lastPdfUrl);
            lastPdfUrl = null;
        }

        const pdfUrl = URL.createObjectURL(pdfBlob);
        lastPdfUrl = pdfUrl;

        if (elements.previewWrapper && elements.previewFrame) {
            elements.previewFrame.src = pdfUrl;
            elements.previewWrapper.style.display = 'block';
        }

        if (elements.statusText) elements.statusText.textContent = 'Report ready. Preview below or click "Download PDF".';

    } catch (error) {
        console.error('Failed to generate report:', error);
        if (elements.statusText) elements.statusText.textContent = `Error: ${error.message}`;
        alert(`Failed to generate report: ${error.message}`);
    } finally {
        isGeneratingReport = false;
        setButtonState(elements, false, 'Generate Report');
    }
};

const handlePostDownload = async (elements, path) => {
    const formEl = elements.form;
    if (!formEl) return alert('Report form not found.');

    try {
        const formData = new FormData(formEl);
        const selectedFields = formData.getAll('fields');

        const payload = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            modelName: formData.get('modelName'),
            fields: selectedFields
        };

        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Server error during download.' }));
            alert(`Download Failed: ${errorData.message}`);
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');

        let filename = 'download.csv';
        if (contentDisposition && contentDisposition.indexOf('filename=') !== -1) {
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

    } catch (e) {
        console.error("CSV Download Error:", e);
        alert('An unexpected error occurred during the CSV download.');
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        form: document.getElementById('report-form'),
        submitBtn: document.getElementById('report-submit'),
        downloadBtn: document.getElementById('report-download'),
        downloadAILogsBtn: document.getElementById('report-download-ai-logs'),
        downloadAISummariesBtn: document.getElementById('report-download-ai-summaries'),
        downloadAggregatesCsvBtn: document.getElementById('report-download-csv-aggregates'),
        downloadHDF5Btn: document.getElementById("report-download-hdf5"),
        previewWrapper: document.getElementById('report-preview-wrapper'),
        previewFrame: document.getElementById('report-preview'),
        statusText: document.getElementById('report-status')
    };

    // --- Initialize Fidelity Logic ---
    const bodyCutoff = document.body.getAttribute('data-cutoff');
    if (bodyCutoff) {
        cutoffTimestamp = parseInt(bodyCutoff, 10);

        const cutoffDateObj = new Date(cutoffTimestamp);
        const displaySpan = document.getElementById('cutoff-display-date');
        if (displaySpan) {
            displaySpan.textContent = cutoffDateObj.toLocaleString();
        }
    }

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.addEventListener('change', evaluateFidelityState);
    if (endInput) endInput.addEventListener('change', evaluateFidelityState);

    // --- Initialize Templates ---
    templates = window.REPORT_TEMPLATES || [];
    renderTemplatePills();

    // Save template button
    const saveBtn = document.getElementById('save-template-btn');
    if (saveBtn) saveBtn.addEventListener('click', openSaveTemplateModal);

    // --- Bind Form Events ---
    if (elements.form) {
        elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleReportSubmit(elements);
        });
    }

    if (elements.downloadBtn) {
        elements.downloadBtn.addEventListener('click', () => {
            if (!lastPdfUrl) {
                alert('No report available. Generate a report first.');
                return;
            }
            const a = document.createElement('a');
            a.href = lastPdfUrl;
            const title = (elements.form && elements.form.querySelector('#reportTitle'))?.value || 'dashboard-report';
            a.download = `${title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    }

    if (elements.downloadAILogsBtn) {
        elements.downloadAILogsBtn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-logs');
        });
    }

    if (elements.downloadAISummariesBtn) {
        elements.downloadAISummariesBtn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-summaries');
        });
    }

    if (elements.downloadAggregatesCsvBtn) {
        elements.downloadAggregatesCsvBtn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-aggregates');
        });
    }

    if (elements.downloadHDF5Btn) {
        elements.downloadHDF5Btn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-hdf5');
        });
    }

    setButtonState(elements, false, 'Generate Report');
    evaluateFidelityState();
});
