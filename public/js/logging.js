import { initAILogModal } from './components/logs/AILogModal.js';
import ModalManager from './components/modals.js';

// --- GLOBAL STATE ---
let currentLogsPage = 1;
let currentAiLogsPage = 1;
let currentAiSummariesPage = 1;

// --- PERMISSION CHECKS ---
const hasPermission = (permission) => {
    return window.USER_PERMISSIONS && window.USER_PERMISSIONS.includes(permission);
};

// Tags State
const tagsCache = {};
const histTagsCache = {};
let openAILogModal;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {

    const modalManager = new ModalManager();
    let isLive = true;

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
        liveToggle: document.getElementById('live-update-toggle'),
        manageTagsBtn: document.getElementById('open-tags-modal-btn'),
    };

    // Initialize the Tag Modal Logic
    openAILogModal = initAILogModal(modalManager, {
        onSaveSuccess: () => {
            // Refresh the active view
            const activeView = document.querySelector('.log-tab-btn.active').dataset.view;
            if (activeView === 'ai') handleAiFilter(elements, currentAiLogsPage);
            if (activeView === 'summary') handleAiSummaryFilter(elements, currentAiSummariesPage);
        }
    });

    if (elements.liveToggle) {
        elements.liveToggle.addEventListener('change', async (e) => {
            isLive = e.target.checked;
            // Visual indicator that updates are paused
            alertLogBody.style.opacity = isLive ? "1" : "0.9";

            if (isLive) {
                await loadAlertHistory(currentHistoryPage);
            }
        });
    }

    // Load Tags
    await refreshTagCache();
    await refreshHistTagCache();

    // --- EVENT LISTENERS ---

    document.addEventListener('tagsUpdated', async () => {
        await refreshTagCache();
        await refreshHistTagCache();

        // Re-render current view to reflect color/name changes
        const activeView = document.querySelector('.log-tab-btn.active').dataset.view;
        if (activeView === 'ai') handleAiFilter(elements, currentAiLogsPage);
        else if (activeView === 'summary') handleAiSummaryFilter(elements, currentAiSummariesPage);
    });

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
        handleAiSummaryFilter(elements);
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


    // Standard Initial Render
    // (We only run these if there ISN'T a deep link, or we let them run then override)
    await handleUserFilter(elements, 1);

    if (window.DEEP_LINK && window.DEEP_LINK.view === 'ai') {
        // Handle the Deep Link
        const { id, page } = window.DEEP_LINK;

        // Switch to AI tab visually
        toggleViews('ai', elements);

        // Load the specific page
        await handleAiFilter(elements, page);

        // Highlight and Scroll to the log
        const targetElement = elements.aiLogAccordion.querySelector(`[data-id="${id}"]`);
        if (targetElement) {
            const header = targetElement.querySelector('.accordion-header');
            const body = targetElement.querySelector('.accordion-body');

            // Open it
            header.classList.add('active');
            body.classList.remove('hidden');

            // Scroll it into view
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Optional: Add a temporary highlight class
            targetElement.classList.add('highlight-flash');
            setTimeout(() => targetElement.classList.remove('highlight-flash'), 3000);
        }
    } else {
        // Normal load
        await handleAiFilter(elements, 1);
        await handleAiSummaryFilter(elements, 1);
    }
});

async function refreshTagCache() {
    try {
        // Use apiListTags (All tags) instead of HistTags
        const tData = await apiListTags();
        // Clear and refill to ensure we don't have stale data
        Object.keys(tagsCache).forEach(key => delete tagsCache[key]);
        (tData || []).forEach(t => tagsCache[t._id] = t);
    } catch (e) {
        console.warn('Tags load failed', e);
    }
}

async function refreshHistTagCache() {
    try {
        // Use apiListTags to get HistTags
        const tData = await apiListHistTags();
        // Clear and refill to ensure we don't have stale data
        Object.keys(histTagsCache).forEach(key => delete histTagsCache[key]);
        (tData || []).forEach(t => histTagsCache[t._id] = t);
    } catch (e) {
        console.warn('Hist Tags load failed', e);
    }
}


// --- VIEW TOGGLING ---

/**
 * Toggles between 'user' and 'ai' log views
 */
function toggleViews(viewToShow, elements) {
    // Reset classes
    [elements.userLogsBtn, elements.aiLogsBtn, elements.aiSummariesBtn].forEach(b => b.classList.remove('active'));
    [elements.userLogView, elements.aiLogView, elements.aiSummaryView].forEach(v => v.classList.add('hidden'));
    [elements.userFilterForm, elements.aiFilterForm, elements.aiSummaryFilterForm].forEach(f => f.classList.add('hidden'));

    if (viewToShow === "user") {
        elements.manageTagsBtn.classList.add("hidden");
        elements.userLogsBtn.classList.add('active');
        elements.userLogView.classList.remove('hidden');
        elements.userFilterForm.classList.remove('hidden');
    }
    else if (viewToShow === "ai") {
        elements.manageTagsBtn.classList.remove("hidden");
        elements.aiLogsBtn.classList.add('active');
        elements.aiLogView.classList.remove('hidden');
        elements.aiFilterForm.classList.remove('hidden');
    }
    else if (viewToShow === "summary") {
        elements.manageTagsBtn.classList.remove("hidden");
        elements.aiSummariesBtn.classList.add('active');
        elements.aiSummaryView.classList.remove('hidden');
        elements.aiSummaryFilterForm.classList.remove('hidden');
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
function renderAiAccordion(logs, accordion, isSummary = false) {
    accordion.innerHTML = '';
    if (logs.length === 0) {
        accordion.innerHTML = '<p>No AI logs found.</p>';
        return;
    }
    logs.forEach((log) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';
        item.dataset.id = log._id;

        const timestamp = new Date(log.responseTimestamp).toLocaleString();

        const tagsHtml = (log.tags || []).map(tagId => {
            // Handle if tagId is populated object or just ID
            const id = tagId._id || tagId;
            const t = histTagsCache[id];
            if (!t) return ''; // Skip if not found in cache (or render generic)
            return `<span class="tag-pill" style="background:${t.color};">${t.name}</span>`;
        }).join('');

        const tagHeaderHTML = `<div class="tags-cell">${tagsHtml}</div>`;

        // Summaries don't get the info/tagging button
        const infoBtnHTML = isSummary
            ? ""
            : `<button class="btn btn-sm ai-log-info-btn" style="margin-right: 8px;">AI Log Info</button>`;

        const contentBtnText = isSummary ? "AI Summary Content" : "AI Log Content";

        const contentBtnHTML = `<button class="btn btn-secondary ai-log-content-btn">${contentBtnText}</button>`;

        // Create the header
        const header = document.createElement('div');
        header.className = 'accordion-header';

        header.innerHTML = `
            <div class="accordion-header-content">
                <div class="accordion-header-left-content">
                    <strong>${log.modelName}</strong> 
                    <span>${timestamp}</span>
                </div>

                <div class="accordion-header-right-content">
                        ${isSummary ? "" : tagHeaderHTML}
                    
                    <div class="accordion-actions">
                        ${infoBtnHTML}
                        ${contentBtnHTML}
                    </div>
                </div>
            </div>
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

        if (!isSummary) {
            // Add tag button
            const infoBtn = header.querySelector('.ai-log-info-btn');
            infoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openAILogModal(log._id, log.tags);
            });
        }


        const contentBtn = header.querySelector('.ai-log-content-btn');
        contentBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Toggle active states
            header.classList.toggle('active');
            body.classList.toggle('hidden');

            const isHidden = body.classList.contains('hidden');
            contentBtn.innerText = isHidden ? contentBtnText : "Hide Content";
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}

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
    const searchVal = elements.userFilterForm.querySelector('#user-search').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Or make this a configurable constant
    if (startVal) params.set('startDate', startVal);
    if (endVal) params.set('endDate', endVal);
    if (eventType && eventType !== 'all') params.set('eventType', eventType);
    if (searchVal) params.set('search', searchVal);
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
    const searchVal = elements.aiFilterForm.querySelector('#ai-search').value;
    const startVal = elements.aiFilterForm.querySelector('#ai-filter-start-date').value;
    const endVal = elements.aiFilterForm.querySelector('#ai-filter-end-date').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Using same limit as user logs
    if (modelName && modelName !== 'all') {
        params.set('modelName', modelName);
    }
    if (searchVal) params.set('search', searchVal);
    if (startVal) params.set('startDate', startVal);
    if (endVal) params.set('endDate', endVal);

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
    const searchVal = elements.aiSummaryFilterForm.querySelector('#ai-summary-search').value;
    const startVal = elements.aiSummaryFilterForm.querySelector('#summary-filter-start-date').value;
    const endVal = elements.aiSummaryFilterForm.querySelector('#summary-filter-end-date').value;

    // Build URL query string
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', 10); // Using same limit as user logs
    if (modelName && modelName !== 'all') {
        params.set('modelName', modelName);
    }
    if (searchVal) params.set('search', searchVal);
    if (startVal) params.set('startDate', startVal);
    if (endVal) params.set('endDate', endVal);

    try {
        // Fetch data from the API
        const response = await fetch(`logs/api/summary?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json(); // { logs, total, page, pages }

        // Render data and pagination
        renderAiAccordion(data.logs, elements.aiSummaryAccordion, true);
        Pagination.render(elements.aiSummaryPaginationControls, data.pages, data.page, (newPage) => handleAiSummaryFilter(elements, newPage));

    } catch (error) {
        console.error('Failed to fetch AI summaries:', error);
        elements.aiSummaryAccordion.innerHTML = `<p>Error loading summaries. ${error.message}</p>`;
    }
}


// API Helper Functions
async function apiListTags() {
    return fetch('tags').then(r => r.json()).then(d => d.tags);
}

async function apiListHistTags() {
    return fetch('tags/hist').then(r => r.json()).then(d => d.tags);
}