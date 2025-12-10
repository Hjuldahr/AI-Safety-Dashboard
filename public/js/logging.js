// --- GLOBAL STATE ---
let currentLogsPage = 1;
let currentAiLogsPage = 1;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Get all required elements
    const elements = {
        userLogsBtn: document.getElementById('user-logs-btn'),
        aiLogsBtn: document.getElementById('ai-logs-btn'),
        userFilterForm: document.getElementById('user-filter-form'),
        aiFilterForm: document.getElementById('ai-filter-form'),
        userLogView: document.getElementById('user-log-view'),
        aiLogView: document.getElementById('ai-log-view'),
        userLogTbody: document.getElementById('user-log-tbody'),
        aiLogAccordion: document.getElementById('ai-log-accordion'),
        userClearBtn: document.querySelector('#user-filter-form .clear-filters'),
        aiClearBtn: document.querySelector('#ai-filter-form .clear-filters'),
        paginationControls: document.getElementById('pagination-controls'),
        aiPaginationControls: document.getElementById('ai-pagination-controls')
    };

    // --- EVENT LISTENERS ---

    // Tab switching
    elements.userLogsBtn.addEventListener('click', () => toggleViews('user', elements));
    elements.aiLogsBtn.addEventListener('click', () => toggleViews('ai', elements));

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

    // --- INITIAL RENDER ---
    handleUserFilter(elements, 1);
    handleAiFilter(elements, 1);
});


// --- VIEW TOGGLING ---

/**
 * Toggles between 'user' and 'ai' log views
 */
function toggleViews(viewToShow, elements) {
    const isUser = viewToShow === 'user';
    elements.userLogsBtn.classList.toggle('active', isUser);
    elements.aiLogsBtn.classList.toggle('active', !isUser);
    elements.userLogView.classList.toggle('hidden', !isUser);
    elements.aiLogView.classList.toggle('hidden', isUser);
    elements.userFilterForm.classList.toggle('hidden', !isUser);
    elements.aiFilterForm.classList.toggle('hidden', isUser);
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
 * Populates the AI Logs accordion (still uses mock data)
 */
function renderAiLogs(logs, accordion) {
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
 * Renders pagination buttons in a specific container
 * @param {HTMLElement} container - The pagination div to populate
 * @param {number} totalPages - Total number of pages from API
 * @param {number} currentPage - Current page number from API
 * @param {object} elements - The DOM elements
 * @param {Function} handlerFunction - The fetch handler (handleUserFilter or handleAiFilter)
 */
function renderPagination(container, totalPages, currentPage, elements, handlerFunction) {
    container.innerHTML = ''; // Clear old buttons

    if (totalPages <= 1) return;

    // Helper: Creates a clickable page button
    const createPageBtn = (page) => {
        const btn = document.createElement('button');
        btn.textContent = page;
        if (page === currentPage) btn.classList.add('active');
        btn.addEventListener('click', () => handlerFunction(elements, page));
        return btn;
    };

    // Helper: Creates a non-clickable "..." span/button
    const createDots = () => {
        const span = document.createElement('span');
        span.textContent = '...';
        span.className = 'pagination-dots'; // Add CSS for styling if needed
        return span;
    };

    // "Previous" Button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '« Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => handlerFunction(elements, currentPage - 1));
    container.appendChild(prevBtn);

    // Logic to determine which numbers to show
    const siblings = 1; 
    
    // If total pages is small (e.g., 7 or less), just show them all to avoid complex dot logic
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) {
            container.appendChild(createPageBtn(i));
        }
    } else {
        // Complex Logic: Start, End, Current, and Dots
        const showLeftDots = currentPage > siblings + 2;
        const showRightDots = currentPage < totalPages - (siblings + 1);

        // Always show Page 1
        container.appendChild(createPageBtn(1));

        // Logic for Left "..."
        if (showLeftDots) {
            container.appendChild(createDots());
        }

        // Calculate the range of middle buttons
        let start = Math.max(2, currentPage - siblings);
        let end = Math.min(totalPages - 1, currentPage + siblings);

        if (currentPage <= siblings + 2) end = siblings + 4; // Extend range if near start
        if (currentPage >= totalPages - (siblings + 1)) start = totalPages - (siblings + 3); // Extend range if near end
        
        // Sanity check to keep bounds within 2 and total-1
        start = Math.max(2, start);
        end = Math.min(totalPages - 1, end);

        // Render the middle range
        for (let i = start; i <= end; i++) {
            container.appendChild(createPageBtn(i));
        }

        // Logic for Right "..."
        if (showRightDots) {
            container.appendChild(createDots());
        }

        // Always show Last Page
        container.appendChild(createPageBtn(totalPages));
    }

    // "Next" Button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next »';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => handlerFunction(elements, currentPage + 1));
    container.appendChild(nextBtn);
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
        case 'Alert_Deleted': case 'Report_Deleted': case 'Failed_Login': case 'Chart_Deleted':  return 'log-dot-delete';
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
        renderPagination(elements.paginationControls, data.pages, data.page, elements, handleUserFilter);

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
        renderAiLogs(data.logs, elements.aiLogAccordion);
        renderPagination(elements.aiPaginationControls, data.pages, data.page, elements, handleAiFilter);

    } catch (error) {
        console.error('Failed to fetch AI logs:', error);
        elements.aiLogAccordion.innerHTML = `<p>Error loading logs. ${error.message}</p>`;
    }
}