// --- GLOBAL STATE ---
let isGeneratingReport = false;
let lastPdfUrl = null; // object URL of last generated PDF

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        form: document.getElementById('report-form'),
        submitBtn: document.getElementById('report-submit'),
        downloadBtn: document.getElementById('report-download'),
        previewWrapper: document.getElementById('report-preview-wrapper'),
        previewFrame: document.getElementById('report-preview'),
        statusText: document.getElementById('report-status')
    };

    // Bind events (guard for missing elements)
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
            // trigger download of last generated PDF
            const a = document.createElement('a');
            a.href = lastPdfUrl;
            const title = (elements.form && elements.form.querySelector('#reportTitle'))?.value || 'dashboard-report';
            a.download = `${title}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        });
    }
});


// --- MAIN HANDLER ---

/**
 * Collects form inputs, sends them to the server (/reports/create),
 * displays inline PDF and caches URL for download.
 * Matches the style of your logs.js: small, clear, explicit error handling.
 */
async function handleReportSubmit(elements) {
    if (isGeneratingReport) return;

    isGeneratingReport = true;
    if (elements.submitBtn) {
        elements.submitBtn.disabled = true;
        elements.submitBtn.textContent = 'Generating...';
    }
    if (elements.statusText) elements.statusText.textContent = 'Generating report...';

    try {
        const formEl = elements.form;
        if (!formEl) throw new Error('Report form not found');

        const formData = new FormData(formEl);

        // Build payload using the same naming as the controller expects
        const payload = {
            reportTitle: formData.get('reportTitle'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            reportType: formData.get('reportType'),
            modelName: formData.get('modelName'),
            notes: formData.get('notes')
        };

        // POST to the chosen route
        const response = await fetch('reports/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`HTTP ${response.status} ${text}`);
        }

        const pdfBlob = await response.blob();

        // Clean up previous object URL
        if (lastPdfUrl) {
            URL.revokeObjectURL(lastPdfUrl);
            lastPdfUrl = null;
        }

        const pdfUrl = URL.createObjectURL(pdfBlob);
        lastPdfUrl = pdfUrl;

        // Show preview iframe
        if (elements.previewWrapper && elements.previewFrame) {
            elements.previewFrame.src = pdfUrl;
            elements.previewWrapper.style.display = 'block';
        }

        if (elements.statusText) elements.statusText.textContent = 'Report ready. Preview below or click "Download Last".';

    } catch (error) {
        console.error('Failed to generate report:', error);
        if (elements.statusText) elements.statusText.textContent = `Error: ${error.message}`;
        alert('Failed to generate report. Check console for details.');
    } finally {
        isGeneratingReport = false;
        if (elements.submitBtn) {
            elements.submitBtn.disabled = false;
            elements.submitBtn.textContent = 'Generate Report';
        }
    }
}
