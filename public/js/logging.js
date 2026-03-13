// -------------------------
// GLOBAL STATE
// -------------------------

let activeView = "user";
let isLive = true;

const paginationState = {
    pageSize: 10,
    totals: { user: 0, ai: 0, summary: 0 },
    pages: { user: 1, ai: 1, summary: 1 },
    total: 0
};

let pagination;
let paginationElements;
let elements;

class PaginationController {
    constructor(state, elements, getPage, setPage, onPageChange) {
        this.state = state;
        this.el = elements;
        this.getPage = getPage;
        this.setPage = setPage;
        this.onPageChange = onPageChange;
        this.attachEvents();
    }

    attachEvents() {
        this.el.paginationFirstPageBtn.onclick = () => this.goto(1);
        this.el.paginationPrevPageBtn.onclick = () => this.goto(this.getPage() - 1);
        this.el.paginationNextPageBtn.onclick = () => this.goto(this.getPage() + 1);
        this.el.paginationLastPageBtn.onclick = () => {
            const last = Math.ceil(this.state.total / this.state.pageSize);
            this.goto(last);
        };
        this.el.paginationPageInput.onchange = e => this.goto(parseInt(e.target.value));
        this.el.paginationSizeSelect.onchange = e => {
            const newSize = parseInt(e.target.value);
            this.state.pageSize = newSize;

            for (const view in this.state.pages) {
                const total = this.state.totals[view] || 0;
                const totalPages = Math.max(1, Math.ceil(total / newSize));
                if (this.state.pages[view] > totalPages) {
                    this.state.pages[view] = totalPages;
                }
            }

            const currentPage = this.state.pages[activeView] || 1;
            this.goto(currentPage);
        };
    }

    goto(page) {
        const totalPages = Math.max(1, Math.ceil(this.state.total / this.state.pageSize));
        const newPage = Math.max(1, Math.min(page, totalPages));
        this.setPage(newPage);
        this.onPageChange(newPage);
    }

    update() {
        const view = activeView;
        const total = this.state.totals[view] || 0;
        this.state.total = total;

        const page = this.getPage();
        const size = this.state.pageSize;
        const totalPages = Math.max(1, Math.ceil(total / size));
        const start = total === 0 ? 0 : (page - 1) * size + 1;
        const end = Math.min(page * size, total);

        this.el.paginationSlice.textContent = `${start} - ${end} of ${total} items`;
        this.el.paginationPageInput.value = page;
        this.el.paginationPageTotal.textContent = `of ${totalPages}`;

        this.el.paginationFirstPageBtn.disabled = page === 1;
        this.el.paginationPrevPageBtn.disabled = page === 1;
        this.el.paginationNextPageBtn.disabled = page >= totalPages;
        this.el.paginationLastPageBtn.disabled = page >= totalPages;
    }
}

// -------------------------
// LOAD DATA
// -------------------------

async function loadCurrentPage() {
    if (activeView === "user") return loadUserLogs();
    if (activeView === "ai") return loadAiLogs();
    if (activeView === "summary") return loadAiSummaries();
}

async function loadUserLogs() {
    elements.userLogTbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    const params = new URLSearchParams();
    const page = paginationState.pages.user || 1;

    params.set("page", page);
    params.set("limit", paginationState.pageSize);

    const start = elements.userFilterForm.querySelector('#filter-start-date').value;
    const end = elements.userFilterForm.querySelector('#filter-end-date').value;
    const type = elements.userFilterForm.querySelector('#filter-event-type').value;
    const search = elements.userFilterForm.querySelector('#user-search').value;

    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (type && type !== "all") params.set("eventType", type);
    if (search) params.set("search", search);

    try {
        const res = await fetch(`logs/api/user?${params}`);
        const data = await res.json();
        renderUserLogs(data.logs, elements.userLogTbody);
        paginationState.totals.user = data.total;
        pagination.update();
    } catch (e) {
        console.error('Failed to fetch user logs', e);
        elements.userLogTbody.innerHTML = `<tr><td colspan="5">Error loading logs</td></tr>`;
    }
}

async function loadAiLogs() {
    elements.aiLogAccordion.innerHTML = "<p>Loading...</p>";
    const params = new URLSearchParams();
    const page = paginationState.pages.ai || 1;

    params.set("page", page);
    params.set("limit", paginationState.pageSize);

    const model = elements.aiFilterForm.querySelector('#filter-model').value;
    const search = elements.aiFilterForm.querySelector('#ai-search').value;
    const start = elements.aiFilterForm.querySelector('#ai-filter-start-date').value;
    const end = elements.aiFilterForm.querySelector('#ai-filter-end-date').value;

    if (model && model !== "all") params.set("modelName", model);
    if (search) params.set("search", search);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);

    try {
        const res = await fetch(`logs/api/ai?${params}`);
        const data = await res.json();
        renderAiAccordion(data.logs, elements.aiLogAccordion, false);
        paginationState.totals.ai = data.total;
        pagination.update();
    } catch (e) {
        console.error('Failed to fetch AI logs', e);
        elements.aiLogAccordion.innerHTML = "<p>Error loading logs</p>";
    }
}

async function loadAiSummaries() {
    elements.aiSummaryAccordion.innerHTML = "<p>Loading...</p>";
    const params = new URLSearchParams();
    const page = paginationState.pages.summary || 1;

    params.set("page", page);
    params.set("limit", paginationState.pageSize);

    const model = elements.aiSummaryFilterForm.querySelector('#summary-filter-model').value;
    const search = elements.aiSummaryFilterForm.querySelector('#ai-summary-search').value;
    const start = elements.aiSummaryFilterForm.querySelector('#summary-filter-start-date').value;
    const end = elements.aiSummaryFilterForm.querySelector('#summary-filter-end-date').value;

    if (model && model !== "all") params.set("modelName", model);
    if (search) params.set("search", search);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);

    try {
        const res = await fetch(`logs/api/summary?${params}`);
        const data = await res.json();
        renderAiAccordion(data.logs, elements.aiSummaryAccordion, true);
        paginationState.totals.summary = data.total;
        pagination.update();
    } catch (e) {
        console.error('Failed to fetch AI summaries', e);
        elements.aiSummaryAccordion.innerHTML = "<p>Error loading summaries</p>";
    }
}

// -------------------------
// RENDER FUNCTIONS
// -------------------------

function renderUserLogs(logs, tbody) {
    tbody.innerHTML = '';
    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No logs found.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        const timestamp = new Date(log.createdAt).toLocaleString();
        const userDisplay = log.userID?.email || log.userID || 'N/A';
        const dotClass = getDotClass(log.eventType);

        tr.innerHTML = `
            <td><span class="log-dot ${dotClass}"></span></td>
            <td>${timestamp}</td>
            <td>${userDisplay}</td>
            <td>${log.eventType.replace('_', ' ')}</td>
            <td>${log.details || ''}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderAiAccordion(logs, accordion, isSummary = false) {
    accordion.innerHTML = '';
    if (!logs || logs.length === 0) {
        accordion.innerHTML = `<p>No ${isSummary ? 'summaries' : 'logs'} found.</p>`;
        return;
    }

    logs.forEach(log => accordion.appendChild(createAiAccordionItem(log, isSummary)));

    /*
    logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'accordion-item fade-in-row';
        item.dataset.id = log._id;

        // Timestamp
        const timestamp = new Date(log.responseTimestamp || log.createdAt).toLocaleString();

        // Header
        const header = document.createElement('div');
        header.className = 'accordion-header';
        const modelName = log.modelName || 'Unknown Model';
        const headerText = isSummary ? `${modelName} - Summary - ${timestamp}` : `${modelName} - ${timestamp}`;
        header.innerHTML = `<p>${headerText}</p>`;

        // Body
        const body = document.createElement('div');
        body.className = 'accordion-body hidden';
        const pre = document.createElement('pre');

        // Use content/summary fields or fallback to full JSON
        const data = log._doc || log;
        if (isSummary) {
            pre.textContent = data.summary || data.content || JSON.stringify(data, null, 2);
        } else {
            pre.textContent = data.content || JSON.stringify(data, null, 2);
        }

        body.appendChild(pre);

        // Toggle body visibility on header click
        header.addEventListener('click', () => {
            body.classList.toggle('hidden');
            header.classList.toggle('active');
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
    */
}

function createAiAccordionItem(log, isSummary = false) {
    const item = document.createElement('div');
    item.className = 'accordion-item fade-in-row';
    item.dataset.id = log._id;

    // Timestamp
    const timestamp = new Date(log.responseTimestamp || log.createdAt).toLocaleString();

    // Header
    const header = document.createElement('div');
    header.className = 'accordion-header';
    const modelName = log.modelName || 'Unknown Model';
    const headerText = isSummary ? `${modelName} - Summary - ${timestamp}` : `${modelName} - ${timestamp}`;
    header.innerHTML = `<p>${headerText}</p>`;

    // Body
    const body = document.createElement('div');
    body.className = 'accordion-body hidden';
    const pre = document.createElement('pre');

    const data = log._doc || log;
    if (isSummary) {
        pre.textContent = data.summary || data.content || JSON.stringify(data, null, 2);
    } else {
        pre.textContent = data.content || JSON.stringify(data, null, 2);
    }
    body.appendChild(pre);

    // Toggle body visibility
    header.addEventListener('click', () => {
        body.classList.toggle('hidden');
        header.classList.toggle('active');
    });

    item.appendChild(header);
    item.appendChild(body);

    return item;
}

// -------------------------
// HELPERS
// -------------------------

function getDotClass(eventType) {
    switch (eventType) {
        // Authentication
        case 'Login':
        case 'Signup': 
            return 'log-dot-login';
        case 'Logout': 
            return 'log-dot-logout';
        // User management
        case 'User_Created':
        case 'User_Updated':
            return 'log-dot-user';
        case 'User_Deleted':
            return 'log-dot-delete';
        // Role management
        case 'Role_Created':
        case 'Role_Changed':
            return 'log-dot-role';
        case 'Role_Deleted':
            return 'log-dot-delete';
        // Alerts
        case 'Alert_Created':
        case 'Alert_Modified': 
            return 'log-dot-alert';
        case 'Alert_Deleted': 
            return 'log-dot-delete';
        // Reports
        case 'Report_Created': 
            return 'log-dot-report';
        case 'Report_Deleted': 
            return 'log-dot-delete';
        // Charts
        case 'Chart_Created': 
            return 'log-dot-report';
        case 'Chart_Modified': 
            return 'log-dot-alert';
        case 'Chart_Deleted': 
            return 'log-dot-delete';
        // Fallback
        case 'Failed_Login':
        case 'Unspecified_Event':
        default: 
            return 'log-dot-default';
    }
}

function setView(view) {
    activeView = view;

    // Hide all log views
    [elements.userLogTbody.parentElement, elements.aiLogAccordion.parentElement, elements.aiSummaryAccordion.parentElement]
        .forEach(v => v.classList.add('hidden'));

    // Deactivate all tab buttons
    [elements.userLogsBtn, elements.aiLogsBtn, elements.aiSummariesBtn]
        .forEach(b => b.classList.remove('active'));

    // Hide all filter forms first
    [elements.userFilterForm, elements.aiFilterForm, elements.aiSummaryFilterForm]
        .forEach(f => {
            f.classList.add('hidden');
            f.reset(); // reset values when switching tabs
        });

    // Toggle the selected view
    if (view === 'user') {
        elements.userLogsBtn.classList.add('active');
        elements.userLogTbody.parentElement.classList.remove('hidden');
        elements.userFilterForm.classList.remove('hidden');

        elements.manageTagsBtn.classList.add('hidden');
        elements.liveUpdatesContainer.classList.add('hidden');
    } else if (view === 'ai') {
        elements.aiLogsBtn.classList.add('active');
        elements.aiLogAccordion.parentElement.classList.remove('hidden');
        elements.aiFilterForm.classList.remove('hidden');

        elements.manageTagsBtn.classList.remove('hidden');
        elements.liveUpdatesContainer.classList.remove('hidden');
    } else if (view === 'summary') {
        elements.aiSummariesBtn.classList.add('active');
        elements.aiSummaryAccordion.parentElement.classList.remove('hidden');
        elements.aiSummaryFilterForm.classList.remove('hidden');

        elements.manageTagsBtn.classList.remove('hidden');
        elements.liveUpdatesContainer.classList.remove('hidden');
    }

    // Reconnect pagination getter/setter
    pagination.getPage = () => paginationState.pages[view];
    pagination.setPage = (page) => { paginationState.pages[view] = page; };

    // Load data for the current view
    loadCurrentPage();
}

// -------------------------
// INITIALIZATION
// -------------------------

document.addEventListener("DOMContentLoaded", async () => {

    elements = {
        userLogTbody: document.getElementById("user-log-tbody"),
        aiLogAccordion: document.getElementById("ai-log-accordion"),
        aiSummaryAccordion: document.getElementById("ai-summary-accordion"),

        userFilterForm: document.getElementById("user-filter-form"),
        aiFilterForm: document.getElementById("ai-filter-form"),
        aiSummaryFilterForm: document.getElementById("ai-summary-filter-form"),

        userLogsBtn: document.getElementById("user-logs-btn"),
        aiLogsBtn: document.getElementById("ai-logs-btn"),
        aiSummariesBtn: document.getElementById("ai-summaries-btn"),

        manageTagsBtn: document.getElementById("open-tags-modal-btn"),
        liveUpdatesContainer: document.getElementById("live-updates-container"),
        liveToggle: document.getElementById("live-update-toggle")
    };

    paginationElements = {
        paginationSizeSelect: document.getElementById("paginationSize"),
        paginationSlice: document.getElementById("paginationSlice"),
        paginationFirstPageBtn: document.getElementById("paginationFirstPage"),
        paginationPrevPageBtn: document.getElementById("paginationPrevPage"),
        paginationPageInput: document.getElementById("paginationPage"),
        paginationPageTotal: document.getElementById("paginationTotal"),
        paginationNextPageBtn: document.getElementById("paginationNextPage"),
        paginationLastPageBtn: document.getElementById("paginationLastPage")
    };

    // -------------------------
    // Pagination Controller
    // -------------------------
    pagination = new PaginationController(
        paginationState,
        paginationElements,
        () => paginationState.pages[activeView],
        page => { paginationState.pages[activeView] = page; },
        loadCurrentPage
    );

    // -------------------------
    // Tab Switching
    // -------------------------
    elements.userLogsBtn.onclick = () => setView('user');
    elements.aiLogsBtn.onclick = () => setView('ai');
    elements.aiSummariesBtn.onclick = () => setView('summary');

    // -------------------------
    // Filters & search submit
    // -------------------------
    elements.userFilterForm.addEventListener('submit', e => { e.preventDefault(); paginationState.pages.user = 1; loadUserLogs(); });
    elements.aiFilterForm.addEventListener('submit', e => { e.preventDefault(); paginationState.pages.ai = 1; loadAiLogs(); });
    elements.aiSummaryFilterForm.addEventListener('submit', e => { e.preventDefault(); paginationState.pages.summary = 1; loadAiSummaries(); });

    // Clear filter buttons
    elements.userFilterForm.querySelector('.clear-filters').addEventListener('click', () => { elements.userFilterForm.reset(); paginationState.pages.user = 1; loadUserLogs(); });
    elements.aiFilterForm.querySelector('.clear-filters').addEventListener('click', () => { elements.aiFilterForm.reset(); paginationState.pages.ai = 1; loadAiLogs(); });
    elements.aiSummaryFilterForm.querySelector('.clear-filters').addEventListener('click', () => { elements.aiSummaryFilterForm.reset(); paginationState.pages.summary = 1; loadAiSummaries(); });

    // -------------------------
    // Initial Load
    // -------------------------
    await loadUserLogs();
    await loadAiLogs();
    await loadAiSummaries();

    // -------------------------
    // Deep link quicklinks
    // -------------------------
    if (window.DEEP_LINK) {
        const { view, id, page } = window.DEEP_LINK;
        setView(view);

        if (page) paginationState.pages[view] = page;
        await loadCurrentPage();

        let accordionEl;
        if (view === 'ai') accordionEl = elements.aiLogAccordion;
        if (view === 'summary') accordionEl = elements.aiSummaryAccordion;

        const target = accordionEl?.querySelector(`[data-id="${id}"]`);
        if (target) {
            // Scroll to the item
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Highlight flash
            target.classList.add('highlight-flash');
            setTimeout(() => target.classList.remove('highlight-flash'), 3000);

            // Open accordion body automatically
            const header = target.querySelector('.accordion-header');
            const body = target.querySelector('.accordion-body');
            if (header && body) {
                body.classList.remove('hidden');
                header.classList.add('active');
            }
        }
    }

    setupLiveUpdates(elements, () => isLive);
});

function setupLiveUpdates(elements, getIsLive) {
    try {
        const evtSource = new EventSource('events'); // Your SSE endpoint

        // Helper: Check if a log matches the active filters
        const passesFilters = (logData, formElement) => {
            const formData = new FormData(formElement);
            const filterModel = formData.get('modelName');
            const searchVal = formData.get('search');
            const startVal = formData.get('startDate');
            const endVal = formData.get('endDate');

            const logTime = new Date(logData.responseTimestamp || logData.createdAt).getTime();

            if (startVal && logTime < new Date(startVal).getTime()) return false;
            if (endVal && logTime > new Date(endVal).getTime()) return false;
            if (filterModel && filterModel !== 'all' && logData.modelName !== filterModel) return false;

            if (searchVal) {
                const searchLower = searchVal.toLowerCase();
                const logString = JSON.stringify(logData).toLowerCase();
                if (!logString.includes(searchLower)) return false;
            }

            return true;
        };

        // -------------------------
        // AI Logs Listener
        // -------------------------
        evtSource.addEventListener('update', (event) => {
            // Only run if live updates are enabled, we're on AI logs tab, and page 1
            if (!getIsLive() || activeView !== 'ai' || paginationState.pages.ai !== 1) return;

            try {
                const logData = JSON.parse(event.data);

                Object.values(logData).forEach(log => {
                    // Skip if this is actually a summary
                    if (log.summary) return;

                    // Skip logs that don't pass the current filters
                    if (!passesFilters(log, elements.aiFilterForm)) return;

                    // Remove "No logs found" placeholder if present
                    if (elements.aiLogAccordion.children.length === 1 &&
                        elements.aiLogAccordion.firstElementChild.tagName === 'P') {
                        elements.aiLogAccordion.innerHTML = '';
                    }

                    // Prepend new log
                    const newItem = createAiAccordionItem(log, false);
                    elements.aiLogAccordion.prepend(newItem);

                    // Maintain only pageSize items in DOM
                    while (elements.aiLogAccordion.children.length > paginationState.pageSize) {
                        elements.aiLogAccordion.lastElementChild.remove();
                    }

                    // Update total count and pagination slice
                    paginationState.totals.ai++;
                    const page = paginationState.pages.ai;
                    const total = paginationState.totals.ai;
                    const start = (page - 1) * paginationState.pageSize + 1;
                    const end = Math.min(page * paginationState.pageSize, total);

                    elements.paginationSlice.textContent = `${start} - ${end} of ${total} items`;
                    elements.paginationPageTotal.textContent = `of ${Math.ceil(total / paginationState.pageSize)}`;
                });
            } catch (err) {
                console.error('SSE AI Log Error', err);
            }
        });

        // -------------------------
        // AI Summaries Listener
        // -------------------------
        evtSource.addEventListener('summary', (event) => {
            if (!getIsLive() || paginationState.pages.summary !== 1) return;

            try {
                const summaryArray = JSON.parse(event.data);

                summaryArray.forEach(log => {
                    if (!passesFilters(log, elements.aiSummaryFilterForm)) return;

                    // Remove "No summaries found" placeholder if present
                    if (elements.aiSummaryAccordion.children.length === 1 && elements.aiSummaryAccordion.firstElementChild.tagName === 'P') {
                        elements.aiSummaryAccordion.innerHTML = '';
                    }

                    const newItem = createAiAccordionItem(log, elements, true);
                    elements.aiSummaryAccordion.prepend(newItem);

                    // Maintain max items per page
                    if (elements.aiSummaryAccordion.children.length > paginationState.pageSize) {
                        elements.aiSummaryAccordion.lastElementChild.remove();
                    }

                    paginationState.totals.summary++;
                    pagination.update();
                });
            } catch (err) {
                console.error('SSE AI Summary Error', err);
            }
        });

        // Close SSE connection when leaving page
        window.addEventListener('beforeunload', () => evtSource.close());
    } catch (err) {
        console.error('SSE Setup Failed', err);
    }
}