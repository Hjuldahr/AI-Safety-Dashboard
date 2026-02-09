// --- GLOBAL STATE ---
let isGeneratingReport = false;
let lastPdfUrl = null; // object URL of last generated PDF

// --- PERMISSION CHECKS ---
const hasPermission = (permission) => {
    return window.USER_PERMISSIONS && window.USER_PERMISSIONS.includes(permission);
};

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
        const response = await fetch('reports', {
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

        if (elements.statusText) elements.statusText.textContent = 'Report ready. Preview below or click "Download PDF".';

    } catch (error) {
        console.error('Failed to generate report:', error);
        if (elements.statusText) elements.statusText.textContent = `Error: ${error.message}`;
        alert('Failed to generate report. Check console for details.');
    } finally {
        isGeneratingReport = false;
        setButtonState(elements, false, 'Generate Report');
    }
};


const handleDownload = (elements, endpoint) => {
    const formData = new FormData(elements.form);
    const payload = Object.fromEntries(formData.entries());

    // Construct the query string from the form data (startDate, endDate, modelName)
    const params = new URLSearchParams({
        startDate: payload.startDate,
        endDate: payload.endDate,
        modelName: payload.modelName,
    }).toString();
    
    // Use the provided endpoint with the query parameters
    const downloadUrl = `${endpoint}?${params}`;

    // Create a temporary anchor element and click it to trigger the download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = true; // Ensures the browser initiates a download
    document.body.appendChild(a);
    a.click();
    a.remove();
}

const handlePostDownload = async (elements, path) => {
    const formEl = elements.form;
    if (!formEl) return alert('Report form not found.');

    try {
        const formData = new FormData(formEl);
        
        // Build the payload (same structure as PDF generation)
        const payload = {
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            modelName: formData.get('modelName')
            // Only need the filters
        };

        const response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload) // Send data in the body
        });

        if (!response.ok) {
            // Handle the 404/No data found case gracefully
            const errorData = await response.json().catch(() => ({ message: 'Server error during download.' }));
            alert(`Download Failed: ${errorData.message}`);
            return;
        }

        // --- Critical step: Force browser to download the streamed response ---
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        
        // Extract filename from header (e.g., attachment; filename="ai-aggregates-all-to-all.csv")
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
        window.URL.revokeObjectURL(url); // Clean up memory

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
        downloadCsvBtn: document.getElementById('report-download-csv'),
        downloadAggregatesCsvBtn: document.getElementById('report-download-csv-aggregates'),
        previewWrapper: document.getElementById('report-preview-wrapper'),
        previewFrame: document.getElementById('report-preview'),
        statusText: document.getElementById('report-status')
    };

    // Check permissions and hide/disable buttons accordingly
    if (elements.submitBtn && !hasPermission('create:report')) {
        elements.submitBtn.style.display = 'none';
    }
    
    if (elements.downloadBtn && !hasPermission('export:report')) {
        elements.downloadBtn.style.display = 'none';
    }
    
    if (elements.downloadCsvBtn && !hasPermission('export:report')) {
        elements.downloadCsvBtn.style.display = 'none';
    }
    
    if (elements.downloadAggregatesCsvBtn && !hasPermission('export:report')) {
        elements.downloadAggregatesCsvBtn.style.display = 'none';
    }

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

    if (elements.downloadCsvBtn) {
        elements.downloadCsvBtn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-csv'); // Now uses generic function
        });
    }

    if (elements.downloadAggregatesCsvBtn) {
        elements.downloadAggregatesCsvBtn.addEventListener('click', () => {
            handlePostDownload(elements, 'reports/download-aggregates'); // Now uses generic function
        });
    }

    // Set initial button state
    setButtonState(elements, false, 'Generate Report');
});