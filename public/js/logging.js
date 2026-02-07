// --- GLOBAL STATE ---
let currentLogsPage = 1;
let currentAiLogsPage = 1;
let currentAiSummariesPage = 1;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Get all required elements
    const elements = {
        userLogsBtn: document.getElementById('user-logs-btn'),
        aiLogsBtn: document.getElementById('ai-logs-btn'),
        aiSummariesBtn: document.getElementById('ai-summaries-btn'),
        userFilterForm: document.getElementById('user-filter-form'),
        aiFilterForm: document.getElementById('ai-filter-form'),
        aiSummaryFilterForm: document.getElementById('ai-summary-filter-form'),
        userLogView: document.getElementById('user-log-view'),
        aiLogView: document.getElementById('ai-log-view'),
        aiSummaryView: document.getElementById('ai-summary-view'),
        userLogTbody: document.getElementById('user-log-tbody'),
        aiLogAccordion: document.getElementById('ai-log-accordion'),
        aiSummaryAccordion: document.getElementById('ai-summary-accordion'),
        userClearBtn: document.querySelector('#user-filter-form .clear-filters'),
        aiClearBtn: document.querySelector('#ai-filter-form .clear-filters'),
        aiSummaryClearBtn: document.querySelector('#ai-summary-filter-form .clear-filters'),
        paginationControls: document.getElementById('pagination-controls'),
        aiPaginationControls: document.getElementById('ai-pagination-controls'),
        aiSummaryPaginationControls: document.getElementById('ai-summary-pagination-controls'),
    };

    // --- EVENT LISTENERS ---

    // Tab switching
    elements.userLogsBtn.addEventListener('click', () => toggleViews('user', elements));
    elements.aiLogsBtn.addEventListener('click', () => toggleViews('ai', elements));
    elements.aiSummariesBtn.addEventListener("click", () => toggleViews('summary', elements))

    // Filter form submission
    elements.userFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Reset to page 1 when applying a new filter
        handleUserFilter(elements, 1);
    });

    elements.aiFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAiFilter(elements); // Stays as-is for now
    });


    elements.aiSummaryFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAiSummaryFilter(elements); //ToDo:make this method
    });


    // Clear filters buttons
    elements.userClearBtn.addEventListener('click', () => {
        elements.userFilterForm.reset();
        // Reset to page 1
        handleUserFilter(elements, 1);
    });

    elements.aiClearBtn.addEventListener('click', () => {
        elements.aiFilterForm.reset();
        handleAiFilter(elements);
    });

    elements.aiSummaryClearBtn.addEventListener('click', () => {
        elements.aiSummaryFilterForm.reset();
        handleAiSummaryFilter(elements);
    });


    // --- INITIAL RENDER ---
    handleUserFilter(elements, 1);
    handleAiFilter(elements, 1);
    handleAiSummaryFilter(elements, 1);
});


// --- VIEW TOGGLING ---

/**
 * Toggles between 'user' and 'ai' log views
 */
function toggleViews(viewToShow, elements) {
    // ToDo: This is the stupidest fucking code ive ever written
    if (viewToShow === "user") {
        elements.userLogsBtn.classList.toggle('active', true);
        elements.aiLogsBtn.classList.toggle('active', false);
        elements.aiSummariesBtn.classList.toggle('active', false);

        elements.userLogView.classList.toggle('hidden', false);
        elements.aiLogView.classList.toggle('hidden', true);
        elements.aiSummaryView.classList.toggle('hidden', true);

        elements.userFilterForm.classList.toggle('hidden', false);
        elements.aiFilterForm.classList.toggle('hidden', true);
        elements.aiSummaryFilterForm.classList.toggle('hidden', true);
    }
    else if (viewToShow === "ai") {
        elements.userLogsBtn.classList.toggle('active', false);
        elements.aiLogsBtn.classList.toggle('active', true);
        elements.aiSummariesBtn.classList.toggle('active', false);

        elements.userLogView.classList.toggle('hidden', true);
        elements.aiLogView.classList.toggle('hidden', false);
        elements.aiSummaryView.classList.toggle('hidden', true);

        elements.userFilterForm.classList.toggle('hidden', true);
        elements.aiFilterForm.classList.toggle('hidden', false);
        elements.aiSummaryFilterForm.classList.toggle('hidden', true);
    }
    else if (viewToShow === "summary") {
        elements.userLogsBtn.classList.toggle('active', false);
        elements.aiLogsBtn.classList.toggle('active', false);
        elements.aiSummariesBtn.classList.toggle('active', true);

        elements.userLogView.classList.toggle('hidden', true);
        elements.aiLogView.classList.toggle('hidden', true);
        elements.aiSummaryView.classList.toggle('hidden', false);

        elements.userFilterForm.classList.toggle('hidden', true);
        elements.aiFilterForm.classList.toggle('hidden', true);
        elements.aiSummaryFilterForm.classList.toggle('hidden', false);
    }
}


// --- RENDER FUNCTIONS ---

/**
 * Populates the User Logs table
 * @param {Array<object>} logs - Array of user log objects
 * @param {HTMLElement} tbody - The table body element to populate
 */
function renderUserLogs(logs, tbody) {
    tbody.innerHTML = ''; // Clear existing logs

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No logs found matching your criteria.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const timestamp = new Date(log.createdAt).toLocaleString();
        const dotClass = getDotClass(log.eventType);

        // **KEY CHANGE**: Access the populated user email.
        // Use optional chaining (?. ) for safety in case population fails.
        const userDisplay = log.userID?.email || log.userID || 'N/A';

        tr.innerHTML = `
      <td><span class="log-dot ${dotClass}"></span></td>
      <td>${timestamp}</td>
      <td>${userDisplay}</td>
      <td>${log.eventType.replace('_', ' ')}</td>
      <td>${log.details}</td>
    `;
        tbody.appendChild(tr);
    });
}

/**
 * Populates the AI Logs + Summaries accordion
 */
function renderAiAccordion(logs, accordion) {
    accordion.innerHTML = '';
    if (logs.length === 0) {
        accordion.innerHTML = '<p>No AI logs found.</p>';
        return;
    }
    logs.forEach((log) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';
        const timestamp = new Date(log.responseTimestamp).toLocaleString();
        const header = document.createElement('button');
        header.className = 'accordion-header';
        header.innerHTML = `
      <span><strong>Model:</strong> ${log.modelName}</span>
      <span>${timestamp}</span>
    `;
        const body = document.createElement('div');
        body.className = 'accordion-body hidden';
        const pre = document.createElement('pre');
        // replace fields starting with '_'
        const replacer = (key, value) => {
            if (typeof key === 'string' && key.startsWith('_')) {
                return undefined;
            }
            return value;
        };
        //use the replacer
        pre.textContent = JSON.stringify(log, replacer, 2);
        body.appendChild(pre);
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            body.classList.toggle('hidden');
        });
        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}


/**
 * Renders pagination buttons using the shared Pagination component (window.Pagination).
 * See public/js/components/pagination.js
 */


// --- HELPER FUNCTIONS ---

/**
 * Returns a CSS class name based on the event type
 */
function getDotClass(eventType) {
    switch (eventType) {
        case 'Login': case 'Signup': return 'log-dot-login';
        case 'Logout': return 'log-dot-logout';
        case 'Chart_Modified': case 'Alert_Created': case 'Alert_Modified': return 'log-dot-alert';
        case 'Chart_Created': case 'Report_Created': return 'log-dot-report';
        case 'Alert_Deleted': case 'Report_Deleted': case 'Failed_Login': case 'Chart_Deleted': return 'log-dot-delete';
        default: return 'log-dot-default';
    }
}

/**
 * (UPDATED) Fetches and filters user logs from the API
 * @param {object} elements - The DOM elements
 * @param {number} page - The page number to fetch
 */
async function handleUserFilter(elements, page = 1) {
    currentLogsPage = page; // Update global state

    // Show loading state
    elements.userLogTbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    elements.paginationControls.innerHTML = ''; // Clear pagination

    const startVal = elements.userFilterForm.querySelector('#filter-start-date').value;
    const endVal = elements.userFilterForm.querySelector('#filter-end-date').value;
    const eventType = elements.userFilterForm.querySelector('#filter-event-type').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Or make this a configurable constant
    if (startVal) params.set('startDate', startVal);
    if (endVal) params.set('endDate', endVal);
    if (eventType && eventType !== 'all') params.set('eventType', eventType);
    // Note: We're not sending userID, so the backend will fetch logs for *all* users.

    try {
        // Fetch data from the API
        const response = await fetch(`logs/api/user?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // { logs, total, page, pages }

        // Render data and pagination
        renderUserLogs(data.logs, elements.userLogTbody);
        Pagination.render(elements.paginationControls, data.pages, data.page, (newPage) => handleUserFilter(elements, newPage));

    } catch (error) {
        console.error('Failed to fetch logs:', error);
        elements.userLogTbody.innerHTML = `<tr><td colspan="5">Error loading logs. ${error.message}</td></tr>`;
    }
}

/**
 * Fetches and filters AI logs from the API
 * @param {object} elements - The DOM elements
 * @param {number} page - The page number to fetch
 */
async function handleAiFilter(elements, page = 1) {
    currentAiLogsPage = page; // Set AI page state

    // Show loading state
    elements.aiLogAccordion.innerHTML = '<p>Loading...</p>';
    elements.aiPaginationControls.innerHTML = ''; // Clear AI pagination

    const modelName = elements.aiFilterForm.querySelector('#filter-model').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Using same limit as user logs
    if (modelName && modelName !== 'all') {
        params.set('modelName', modelName);
    }

    try {
        // Fetch data from the API
        const response = await fetch(`logs/api/ai?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // { logs, total, page, pages }

        // Render data and pagination
        renderAiAccordion(data.logs, elements.aiLogAccordion);
        Pagination.render(elements.aiPaginationControls, data.pages, data.page, (newPage) => handleAiFilter(elements, newPage));

    } catch (error) {
        console.error('Failed to fetch AI logs:', error);
        elements.aiLogAccordion.innerHTML = `<p>Error loading logs. ${error.message}</p>`;
    }
}

/**
 * Fetches and filters AI Summaries from the API
 * @param {object} elements - The DOM elements
 * @param {number} page - The page number to fetch
 */
async function handleAiSummaryFilter(elements, page = 1) {
    currentAiSummariesPage = page; // Set AI page state

    // Show loading state
    elements.aiSummaryAccordion.innerHTML = '<p>Loading...</p>';
    elements.aiSummaryPaginationControls.innerHTML = ''; // Clear AI pagination

    const modelName = elements.aiSummaryFilterForm.querySelector('#summary-filter-model').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Using same limit as user logs
    if (modelName && modelName !== 'all') {
        params.set('modelName', modelName);
    }

    try {
        // Fetch data from the API
        const response = await fetch(`logs/api/summary?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // { logs, total, page, pages }

        // Render data and pagination
        renderAiAccordion(data.logs, elements.aiSummaryAccordion);
        Pagination.render(elements.aiSummaryPaginationControls, data.pages, data.page, elements, handleAiSummaryFilter);

    } catch (error) {
        console.error('Failed to fetch AI summaries:', error);
        elements.aiSummaryAccordion.innerHTML = `<p>Error loading summaries. ${error.message}</p>`;
    }
}