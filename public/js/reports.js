// --- GLOBAL STATE ---
let isGeneratingReport = false;
let lastPdfUrl = null; // object URL of last generated PDF

// --- HELPER FUNCTION ---

const setButtonState = (elements, disabled, text) => {
    if (elements.submitBtn) {
        elements.submitBtn.disabled = disabled;
        elements.submitBtn.textContent = text;
    }
}

const handleReportSubmit = async (elements) => {
    if (isGeneratingReport) return;
    isGeneratingReport = true;

    if (elements.statusText) elements.statusText.textContent = 'Generating report... Please wait.';
    setButtonState(elements, true, 'Generating...');
    
    // Clear previous preview
    if (elements.previewWrapper) elements.previewWrapper.style.display = 'none';

    try {
        const formData = new FormData(elements.form);
        const payload = Object.fromEntries(formData.entries());

        const response = await fetch('/reports/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // FIX: Robust error handling
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            let errorMessage = `HTTP ${response.status} failed.`;

            // Attempt to parse JSON error message from the server
            try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // Not JSON, use the status text
                errorMessage = `Server Error (${response.status}): ${text.substring(0, 100)}...`;
            }
            throw new Error(errorMessage);
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
        setButtonState(elements, false, 'Generate Report');
    }
};

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

    // Set initial button state
    setButtonState(elements, false, 'Generate Report');
});