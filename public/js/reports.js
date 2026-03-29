// --- GLOBAL STATE ---
let isGeneratingReport = false;
let lastPdfUrl = null; 
let cutoffTimestamp = 0; // Will hold the value passed from EJS

// --- HELPER FUNCTION ---
const setButtonState = (elements, disabled, text) => {
    if (elements.submitBtn) {
        elements.submitBtn.disabled = disabled;
        elements.submitBtn.textContent = text;
    }
}

// Ensure your template function grabs the special checkbox too if 'all' is clicked
function applyTemplate(type) {
    const checkboxes = document.querySelectorAll('input[name="fields"]');
    checkboxes.forEach(cb => cb.checked = false); 

    const templates = {
        safety: ['policyCompliance', 'toxicityScore', 'piiDetected', 'flaggedCount', 'flaggedOutputs'],
        efficiency: ['responseTime', 'energyConsumption', 'tokensUsed', 'gigaFlopsUsed'],
        exec: ['policyCompliance', 'responseHelpfulness', 'queryCount'],
        all: Array.from(checkboxes).map(cb => cb.value)
    };

    templates[type].forEach(val => {
        const target = document.querySelector(`input[value="${val}"]`);
        if (target) target.checked = true;
    });
}

/**
 * Checks the selected dates against the cutoff time and 
 * adjusts the UI (enabling/disabling seconds, and the appendix checkbox).
 */
const evaluateFidelityState = () => {
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    const appendixCheckbox = document.querySelector('input[value="flaggedOutputs"]');
    
    // Safety check for the cutoff timestamp
    if (!cutoffTimestamp) return;

    // Use Date.now() as a fallback if the inputs are currently empty
    const startMs = startInput.value ? new Date(startInput.value).getTime() : Date.now();
    const endMs = endInput.value ? new Date(endInput.value).getTime() : Date.now();

    // If the entire timeframe is BEFORE the cutoff (Low Fidelity Only)
    if (endMs < cutoffTimestamp) {
        startInput.step = "60"; // Minutes only
        endInput.step = "60";
        // Appendix relies on AI_Logs, so disable it if we only have summaries
        if (appendixCheckbox) {
            appendixCheckbox.checked = false;
            appendixCheckbox.disabled = true;
            appendixCheckbox.parentElement.style.opacity = '0.5';
            appendixCheckbox.parentElement.title = 'Raw flagged outputs are not available for dates older than the retention period.';
        }
    } else {
        // High or Split Fidelity (Has some AI_Logs)
        startInput.step = "1"; // Allow seconds selection
        endInput.step = "1";
        if (appendixCheckbox) {
            appendixCheckbox.disabled = false;
            appendixCheckbox.parentElement.style.opacity = '1';
            appendixCheckbox.parentElement.title = '';
        }
    }
};

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
        
        // --- CRITICAL UPDATE: Extract Array of Fields ---
        // FormData.getAll() retrieves an array of all checked inputs with name="fields"
        const selectedFields = formData.getAll('fields');

        if (selectedFields.length === 0) {
            throw new Error('Please select at least one data field to generate a report.');
        }

        const payload = {
            reportTitle: formData.get('reportTitle'),
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            modelName: formData.get('modelName'),
            fields: selectedFields // Pass the array to the backend!
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
        setButtonState(elements, false, 'Generate Preview');
    }
};

const handlePostDownload = async (elements, path) => {
    const formEl = elements.form;
    if (!formEl) return alert('Report form not found.');

    try {
        const formData = new FormData(formEl);
        
        // Ensure CSV downloads also respect the selected fields if you ever update the CSV generator to be dynamic
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

        // ... rest of your handlePostDownload logic remains exactly the same ...
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
    
    // --- NEW: Initialize Fidelity Logic ---
    const bodyCutoff = document.body.getAttribute('data-cutoff');
    if (bodyCutoff) {
        cutoffTimestamp = parseInt(bodyCutoff, 10);
        
        // Format the timestamp to a readable date for the notice banner
        const cutoffDateObj = new Date(cutoffTimestamp);
        const displaySpan = document.getElementById('cutoff-display-date');
        if (displaySpan) {
            displaySpan.textContent = cutoffDateObj.toLocaleString();
        }
    }

    // Attach listeners to date inputs to re-evaluate fidelity dynamically
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    if (startInput) startInput.addEventListener('change', evaluateFidelityState);
    if (endInput) endInput.addEventListener('change', evaluateFidelityState);


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

    setButtonState(elements, false, 'Generate Preview');
    
    // Run initial evaluation on load
    evaluateFidelityState();
});