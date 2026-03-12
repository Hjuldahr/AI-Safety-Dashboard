// -------------------------
// GLOBAL STATE
// -------------------------

let activeView = "user";
let isLive = true;

const paginationState = {
    pageSize: 10,
    totals: { user: 0, ai: 0, summary: 0 },
    pages: { user: 1, ai: 1, summary: 1 }
};

let pagination;
let paginationElements;
let elements;

class PaginationController {
    constructor(state, elements, getPage, setPage, onPageChange) {
        this.state = state;
        this.el = elements;
        this.getPage = getPage;   // function returning current page
        this.setPage = setPage;   // function to update current page
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

            // Clamp all views' pages to new max pages
            for (const view in this.state.pages) {
                const total = this.state.totals[view] || 0;
                const totalPages = Math.max(1, Math.ceil(total / newSize));
                if (this.state.pages[view] > totalPages) {
                    this.state.pages[view] = totalPages;
                }
            }

            // Reload current view at proper page
            const currentPage = this.state.pages[activeView] || 1;
            this.goto(currentPage);
        };
    }

    goto(page) {
        const totalPages = Math.max(1, Math.ceil(this.state.total / this.state.pageSize));
        const newPage = Math.max(1, Math.min(page, totalPages));
        this.setPage(newPage);           // store per-view
        this.onPageChange(newPage);      // reload
    }

    update() {
        const view = activeView;
        const total = this.state.totals[view] || 0;
        this.state.total = total; // optional, for legacy calculations

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

async function loadCurrentPage() {

    if (activeView === "user")
        return loadUserLogs();

    if (activeView === "ai")
        return loadAiLogs();

    if (activeView === "summary")
        return loadAiSummaries();
}

async function loadUserLogs() {

    elements.userLogTbody.innerHTML =
        '<tr><td colspan="5">Loading...</td></tr>';

    const params = new URLSearchParams();

    params.set("page", paginationState.page);
    params.set("limit", paginationState.pageSize);

    const start = elements.userFilterForm.querySelector('#filter-start-date').value;
    const end = elements.userFilterForm.querySelector('#filter-end-date').value;
    const type = elements.userFilterForm.querySelector('#filter-event-type').value;
    const search = elements.userFilterForm.querySelector('#user-search').value;

    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (search) params.set("search", search);
    if (type && type !== "all") params.set("eventType", type);

    const res = await fetch(`logs/api/user?${params}`);

    const data = await res.json();

    renderUserLogs(data.logs, elements.userLogTbody);

    paginationState.totals.user = data.total;
    pagination.update(data.total);
}

async function loadAiLogs() {

    elements.aiLogAccordion.innerHTML = "<p>Loading...</p>";

    const params = new URLSearchParams();

    params.set("page", paginationState.page);
    params.set("limit", paginationState.pageSize);

    const model = elements.aiFilterForm.querySelector('#filter-model').value;
    const search = elements.aiFilterForm.querySelector('#ai-search').value;

    if (model && model !== "all") params.set("modelName", model);
    if (search) params.set("search", search);

    const res = await fetch(`logs/api/ai?${params}`);

    const data = await res.json();

    renderAiAccordion(data.logs, elements.aiLogAccordion, elements);

    paginationState.totals.ai = data.total;
    pagination.update(data.total);
}

async function loadAiSummaries() {

    elements.aiSummaryAccordion.innerHTML = "<p>Loading...</p>";

    const params = new URLSearchParams();

    params.set("page", paginationState.page);
    params.set("limit", paginationState.pageSize);

    const res = await fetch(`logs/api/summary?${params}`);

    const data = await res.json();

    renderAiAccordion(
        data.logs,
        elements.aiSummaryAccordion,
        elements,
        true
    );

    paginationState.totals.summary = data.total;
    pagination.update(data.total);
}

function setView(view) {
    activeView = view;

    toggleViews(view, elements);

    // Recreate or reconfigure pagination controller to use the right page for this view
    pagination.getPage = () => paginationState.pages[view];
    pagination.setPage = (newPage) => { paginationState.pages[view] = newPage; };

    loadCurrentPage();
}

function renderUserLogs(logs, tbody) {
    tbody.innerHTML = ''; // Clear existing logs

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

function renderAiAccordion(logs, accordion, elements, isSummary = false) {
    accordion.innerHTML = '';
    if (!logs || logs.length === 0) {
        accordion.innerHTML = `<p>No AI ${isSummary ? 'summaries' : 'logs'} found.</p>`;
        return;
    }

    logs.forEach((log, index) => {
        const item = document.createElement('div');
        item.className = 'accordion-item fade-in-row';
        item.dataset.id = log._id;

        const timestamp = new Date(log.responseTimestamp || log.createdAt).toLocaleString();

        const headerText = isSummary
            ? `${log.modelName || 'Unknown Model'} - Summary #${index + 1} - ${timestamp}`
            : `${log.modelName || 'Unknown Model'} - ${timestamp}`;

        // Header
        const header = document.createElement('div');
        header.className = 'accordion-header';
        header.innerHTML = `
            <div class="accordion-header-content">
                <div class="accordion-header-left-content">
                    <p>${headerText}</p>
                </div>
            </div>
        `;

        // Body
        const body = document.createElement('div');
        body.className = 'accordion-body hidden';
        const pre = document.createElement('pre');

        // Show AI content or summary
        if (isSummary) {
            pre.textContent = log.summary || log.content || JSON.stringify(log, null, 2);
        } else {
            pre.textContent = log.content || JSON.stringify(log, null, 2);
        }

        body.appendChild(pre);

        header.addEventListener('click', () => {
            body.classList.toggle('hidden');
            header.classList.toggle('active');
        });

        item.appendChild(header);
        item.appendChild(body);
        accordion.appendChild(item);
    });
}


// Helper for dot class
function getDotClass(eventType) {
    switch (eventType) {
        case 'Login':
        case 'Signup': return 'log-dot-login';
        case 'Logout': return 'log-dot-logout';
        case 'Chart_Modified':
        case 'Alert_Created':
        case 'Alert_Modified': return 'log-dot-alert';
        case 'Chart_Created':
        case 'Report_Created': return 'log-dot-report';
        case 'Alert_Deleted':
        case 'Report_Deleted':
        case 'Failed_Login':
        case 'Chart_Deleted': return 'log-dot-delete';
        default: return 'log-dot-default';
    }
}

function toggleViews(view, elements) {
    // Hide all views and deactivate buttons
    [elements.userLogTbody.parentElement, elements.aiLogAccordion.parentElement, elements.aiSummaryAccordion.parentElement].forEach(v => v.classList.add('hidden'));
    [elements.userLogsBtn, elements.aiLogsBtn, elements.aiSummariesBtn].forEach(b => b.classList.remove('active'));

    if (view === 'user') {
        elements.userLogsBtn.classList.add('active');
        elements.userLogTbody.parentElement.classList.remove('hidden');
    } else if (view === 'ai') {
        elements.aiLogsBtn.classList.add('active');
        elements.aiLogAccordion.parentElement.classList.remove('hidden');
    } else if (view === 'summary') {
        elements.aiSummariesBtn.classList.add('active');
        elements.aiSummaryAccordion.parentElement.classList.remove('hidden');
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // -------------------------
    // Cache DOM elements
    // -------------------------

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
        liveToggle: document.getElementById("live-update-toggle"),
        liveUpdatesContainer: document.getElementById("live-updates-container")
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
    // Create Pagination Controller
    // -------------------------

    pagination = new PaginationController(
    paginationState,
    paginationElements,
    () => paginationState.pages[activeView], // default getter
    (page) => { paginationState.pages[activeView] = page; }, // default setter
    loadCurrentPage
);

    // -------------------------
    // Tab Switching
    // -------------------------

    elements.userLogsBtn.onclick = () => setView("user");
    elements.aiLogsBtn.onclick = () => setView("ai");
    elements.aiSummariesBtn.onclick = () => setView("summary");

    // -------------------------
    // Initial Load
    // -------------------------

    await loadCurrentPage();
});