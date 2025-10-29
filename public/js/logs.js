// --- MOCK DATA ---
// We'll use this to populate the UI until the backend is ready.

const MOCK_USER_LOGS = [
    {
        _id: '67c66c8f8d9g',
        userID: 'admin@example.com',
        eventType: 'Login',
        details: 'Successful login from IP 192.168.1.1',
        createdAt: '2025-10-29T13:30:00Z'
    },
    {
        _id: '67c66c8f8d9h',
        userID: 'data-analyst@example.com',
        eventType: 'Alert_Created',
        details: 'Created alert "Policy Compliance < 90%"',
        createdAt: '2025-10-29T13:15:10Z'
    },
    {
        _id: '67c66c8f8d9i',
        userID: 'admin@example.com',
        eventType: 'Report_Created',
        details: 'Generated report "Q3-Summary.pdf"',
        createdAt: '2025-10-29T11:05:00Z'
    },
    {
        _id: '67c66c8f8d9j',
        userID: 'data-analyst@example.com',
        eventType: 'Alert_Deleted',
        details: 'Deleted alert "Old Response Time Alert"',
        createdAt: '2025-10-28T16:22:00Z'
    },
    {
        _id: '67c66c8f8d9k',
        userID: 'admin@example.com',
        eventType: 'Logout',
        details: 'User logged out.',
        createdAt: '2025-10-28T09:00:30Z'
    }
];

const MOCK_AI_LOGS = [
    {
        modelName: "GoodModel",
        policyCompliance: 94.8021,
        responseHelpfulness: 4.6910,
        responseTime: 17.8709,
        energyConsumption: 53.5128,
        responseTimestamp: 1761755680783
    },
    {
        modelName: "FastModel",
        policyCompliance: 91.2310,
        responseHelpfulness: 4.1002,
        responseTime: 9.1201,
        energyConsumption: 32.1122,
        responseTimestamp: 1761755670123
    },
    {
        modelName: "GoodModel",
        policyCompliance: 95.1111,
        responseHelpfulness: 4.7123,
        responseTime: 18.0012,
        energyConsumption: 54.0123,
        responseTimestamp: 1761755660555
    }
];

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
        aiClearBtn: document.querySelector('#ai-filter-form .clear-filters')
    };

    // --- EVENT LISTENERS ---

    // Tab switching
    elements.userLogsBtn.addEventListener('click', () => toggleViews('user', elements));
    elements.aiLogsBtn.addEventListener('click', () => toggleViews('ai', elements));

    // Filter form submission
    elements.userFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserFilter(elements);
    });

    elements.aiFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAiFilter(elements);
    });

    // Clear filters buttons
    elements.userClearBtn.addEventListener('click', () => {
        elements.userFilterForm.reset();
        handleUserFilter(elements);
    });
    elements.aiClearBtn.addEventListener('click', () => {
        elements.aiFilterForm.reset();
        handleAiFilter(elements);
    });

    // --- INITIAL RENDER ---
    // Populate the page on first load
    renderUserLogs(MOCK_USER_LOGS, elements.userLogTbody);
    renderAiLogs(MOCK_AI_LOGS, elements.aiLogAccordion);
});


// --- VIEW TOGGLING ---

/**
 * Toggles between 'user' and 'ai' log views
 * @param {'user' | 'ai'} viewToShow - The view to display
 * @param {object} elements - The collection of cached DOM elements
 */
function toggleViews(viewToShow, elements) {
    const isUser = viewToShow === 'user';

    // Toggle tab 'active' class
    elements.userLogsBtn.classList.toggle('active', isUser);
    elements.aiLogsBtn.classList.toggle('active', !isUser);

    // Toggle view container visibility
    elements.userLogView.classList.toggle('hidden', !isUser);
    elements.aiLogView.classList.toggle('hidden', isUser);

    // Toggle filter form visibility
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
    // Clear existing logs
    tbody.innerHTML = '';

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No logs found matching your criteria.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');

        // Format timestamp to be human-readable
        const timestamp = new Date(log.createdAt).toLocaleString();

        // Get the correct CSS class for the dot
        const dotClass = getDotClass(log.eventType);

        tr.innerHTML = `
      <td><span class="log-dot ${dotClass}"></span></td>
      <td>${timestamp}</td>
      <td>${log.userID}</td>
      <td>${log.eventType.replace('_', ' ')}</td>
      <td>${log.details}</td>
    `;
        tbody.appendChild(tr);
    });
}

/**
 * Populates the AI Logs accordion
 * @param {Array<object>} logs - Array of AI log objects
 * @param {HTMLElement} accordion - The accordion container element
 */
function renderAiLogs(logs, accordion) {
    // Clear existing logs
    accordion.innerHTML = '';

    if (logs.length === 0) {
        accordion.innerHTML = '<p>No AI logs found.</p>';
        return;
    }

    logs.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'accordion-item';

        const timestamp = new Date(log.responseTimestamp).toLocaleString();

        // Create header
        const header = document.createElement('button');
        header.className = 'accordion-header';
        header.innerHTML = `
      <span><strong>Model:</strong> ${log.modelName}</span>
      <span>${timestamp}</span>
    `;

        // Create body
        const body = document.createElement('div');
        body.className = 'accordion-body hidden';

        // Pretty-print the JSON
        const pre = document.createElement('pre');
        pre.textContent = JSON.stringify(log, null, 2);
        body.appendChild(pre);

        // Add click event to toggle
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            body.classList.toggle('hidden');
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}


// --- HELPER FUNCTIONS ---

/**
 * Returns a CSS class name based on the event type
 * @param {string} eventType - The log's eventType
 * @returns {string} The corresponding CSS class
 */
function getDotClass(eventType) {
    switch (eventType) {
        case 'Login':
        case 'Signup':
            return 'log-dot-login';
        case 'Logout':
            return 'log-dot-logout';
        case 'Alert_Created':
        case 'Alert_Modified':
            return 'log-dot-alert';
        case 'Report_Created':
            return 'log-dot-report';
        case 'Alert_Deleted':
        case 'Report_Deleted':
        case 'Failed_Login':
            return 'log-dot-delete';
        default:
            return 'log-dot-default';
    }
}

/**
 * (MOCK) Filters the user logs based on form input
 */
function handleUserFilter(elements) {
    const startVal = elements.userFilterForm.querySelector('#filter-start-date').value;
    const endVal = elements.userFilterForm.querySelector('#filter-end-date').value;
    const eventType = elements.userFilterForm.querySelector('#filter-event-type').value;

    // Convert dates to timestamps (or null if empty)
    // Add 1 day to end date to make it inclusive
    const startTime = startVal ? new Date(startVal).getTime() : null;
    const endTime = endVal ? new Date(endVal).setDate(new Date(endVal).getDate() + 1) : null;

    const filteredLogs = MOCK_USER_LOGS.filter(log => {
        const logTime = new Date(log.createdAt).getTime();

        const inDateRange =
            (!startTime || logTime >= startTime) &&
            (!endTime || logTime <= endTime);

        const matchesEventType =
            (eventType === 'all' || log.eventType === eventType);

        return inDateRange && matchesEventType;
    });

    renderUserLogs(filteredLogs, elements.userLogTbody);
}

/**
 * (MOCK) Filters the AI logs based on form input
 */
function handleAiFilter(elements) {
    const modelName = elements.aiFilterForm.querySelector('#filter-model').value;

    const filteredLogs = MOCK_AI_LOGS.filter(log => {
        return (modelName === 'all' || log.modelName === modelName);
    });

    renderAiLogs(filteredLogs, elements.aiLogAccordion);
}