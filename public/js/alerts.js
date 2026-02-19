import { initCreateAlertModal } from './components/alerts/createAlertModal.js';
import { initActiveAlertsModal } from './components/alerts/activeAlertsModal.js';
import { initLogTagModal } from './components/alerts/logTagModal.js';
import { initAlertLogModal } from "./components/alerts/alertLogModal.js";
import TagSelect from './components/tags/tagSelect.js';
import ModalManager from './components/modals.js';

document.addEventListener('DOMContentLoaded', async function () {

    const hasPermission = (permission) => {
        return window.USER_PERMISSIONS && window.USER_PERMISSIONS.includes(permission);
    };

    // --- DOM REFERENCES ---
    const addAlertBtn = document.getElementById('add-alert-btn');

    // Stats
    const countCrit = document.getElementById('count-critical');
    const countHigh = document.getElementById('count-high');
    const countMed = document.getElementById('count-medium');
    const countInfo = document.getElementById('count-info');
    const statCards = document.querySelectorAll('.stat-card');

    // Manage/History
    const alertLogBody = document.getElementById('alert-log-body');
    const historyPagination = document.getElementById('history-pagination');
    const historyFilterForm = document.getElementById('history-filter-form');

    // State
    const liveAlertsCache = {};
    const tagsCache = {};
    let currentHistoryPage = 1;

    const liveToggle = document.getElementById('live-update-toggle');
    let isLive = true;

    if (liveToggle) {
        liveToggle.addEventListener('change', async (e) => {
            isLive = e.target.checked;
            // Visual indicator that updates are paused
            alertLogBody.style.opacity = isLive ? "1" : "0.9";

            if (isLive) {
                await loadAlertHistory(currentHistoryPage);
            }
        });
    }


    // Constants
    const { DATA_DICTIONARY, KNOWN_MODELS } = window.CONSTANTS;

    // Hide add alert button if user doesn't have permission
    if (addAlertBtn && !hasPermission('create:alert')) {
        addAlertBtn.style.display = 'none';
    }

    // --- POPUP MODALS ---
    const modalManager = new ModalManager();

    // Initialize the components
    // Create Alert
    const openCreateAlertModal = initCreateAlertModal(modalManager, {
        tagsCache,
        DATA_DICTIONARY: window.CONSTANTS.DATA_DICTIONARY,
        KNOWN_MODELS: window.CONSTANTS.KNOWN_MODELS,
        onSaveSuccess: () => {
            loadLiveAlerts();
            loadAlertHistory(1);
        }
    });

    // Active Alerts
    const openActiveAlertsModal = initActiveAlertsModal(modalManager, {
        onEdit: (alertObj) => {
            // Re-use your existing edit logic
            const tagIds = (alertObj.tags || []).map(t => t._id || t);
            alertTagSelect.setSelectedIds(tagIds);
            openCreateAlertModal(alertObj);
        },
        onDeleteSuccess: () => {
            loadLiveAlerts(); // Refresh dashboard stats
        }
    });

    // Adding / Editing Alert Log Tags
    const openLogTagModal = initLogTagModal(modalManager, {
        tagsCache,
        onSaveSuccess: () => {
            loadAlertHistory(currentHistoryPage);
        }
    });

    const alertTagSelect = new TagSelect({
        containerId: 'tags-input-container',
        searchInputId: 'tags-search-input',
        dropdownId: 'tags-dropdown-list'
    });

    const openAlertLogModal = initAlertLogModal(modalManager);

    // --- CHART LOGIC ---
    const chartRangeSelect = document.getElementById('chart-range-select');


    // --- INITIALIZATION ---
    async function init() {
        try {
            const tData = await apiListTags();
            (tData || []).forEach(t => tagsCache[t._id] = t);
        } catch (e) { console.warn('Tags load failed', e); }

        // Populate dropdowns AFTER tags are loaded
        populateModelDropdowns();

        await alertTagSelect.init();

        await loadLiveAlerts();
        await loadAlertHistory(1);
        await initCharts();
        setupLiveUpdates();
    }


    // --- EVENT LISTENERS ---

    // Open Manage Rules
    const openManageBtn = document.getElementById('open-manage-modal-btn');
    if (openManageBtn) {
        openManageBtn.addEventListener('click', openActiveAlertsModal);
    }

    // Open Create Rule
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    if (openCreateBtn) {
        openCreateBtn.addEventListener('click', () => openCreateAlertModal());
    }

    // Open Edit Alert Log Tags
    if (alertLogBody) {
        alertLogBody.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-log-tag-btn')) return;

            const logId = e.target.dataset.id;
            const currentIds = (e.target.dataset.tags || '').split(',').filter(Boolean);

            // Call our new clean refactored function
            openLogTagModal(logId, currentIds);
        });
    }

    // Sets up listeners for clicking on alert log
    if (alertLogBody) {
        alertLogBody.addEventListener('click', (e) => {
            // Ignore clicks if they hit the "Add Tag" button or its icon
            if (e.target.closest('.add-log-tag-btn')) return;

            // Find the closest row to get the log ID
            const tr = e.target.closest('tr');
            if (tr) {
                // We need to store the ID on the row itself when creating it
                const logId = tr.dataset.logId;
                if (logId) openAlertLogModal(logId);
            }
        });
    }

    async function initCharts() {
        if (chartRangeSelect) {
            chartRangeSelect.addEventListener('change', () => fetchAndRenderCharts());
        }
        await fetchAndRenderCharts();
    }

    async function fetchAndRenderCharts() {
        try {
            const range = chartRangeSelect ? chartRangeSelect.value : '24h';
            const end = new Date();
            let start = new Date();
            if (range === '24h') start.setTime(end.getTime() - 24 * 60 * 60 * 1000);
            else if (range === '7d') start.setTime(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            else if (range === '30d') start.setTime(end.getTime() - 30 * 24 * 60 * 60 * 1000);

            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString()
            });

            const res = await fetch(`alerts/api/stats?${params.toString()}`);
            const data = await res.json();

            // Use new AlertCharts builder
            if (window.AlertCharts) {
                window.AlertCharts.render(data);
            }
        } catch (e) { console.error('Chart load failed', e); }
    }

    function populateModelDropdowns() {
        const selects = document.querySelectorAll('.model-select-dynamic');
        selects.forEach(sel => {
            const isFilter = sel.id.includes('filter');
            let html = isFilter ? '<option value="all">All Models</option>' : '<option value="">-- All Models --</option>';
            KNOWN_MODELS.forEach(m => html += `<option value="${m}">${m}</option>`);
            sel.innerHTML = html;
        });
        const tagFilter = document.getElementById('filter-tag');
        if (tagFilter) {
            let html = '<option value="all">All Tags</option>';
            // Sort tags alphabetically
            const sorted = Object.values(tagsCache).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            sorted.forEach(t => html += `<option value="${t._id}">${t.name}</option>`);
            tagFilter.innerHTML = html;
        }
    }

    // --- LIVE ALERTS (STATS & LIST) ---
    async function loadLiveAlerts() {
        try {
            const data = await apiGetLiveAlerts();
            const alerts = data.alerts || [];
            Object.keys(liveAlertsCache).forEach(k => delete liveAlertsCache[k]);
            alerts.forEach(a => liveAlertsCache[a._id] = a);

            const counts = { Critical: 0, High: 0, Medium: 0, Info: 0 };
            alerts.forEach(a => { if (counts[a.alertLevel] !== undefined) counts[a.alertLevel]++; });

            countCrit.innerText = counts.Critical;
            countHigh.innerText = counts.High;
            countMed.innerText = counts.Medium;
            countInfo.innerText = counts.Info;
        } catch (e) { console.error(e); }
    }

    statCards.forEach(c => c.addEventListener('click', () => {
        document.getElementById('filter-level').value = c.dataset.level;
        loadAlertHistory(1);
    }));


    // tagsUpdated is called by tagModal.js when updating tags
    document.addEventListener('tagsUpdated', () => {
        // Refresh the local data
        populateModelDropdowns();
        loadAlertHistory(currentHistoryPage);
    });


    // --- HISTORY TABLE ---
    async function loadAlertHistory(page = 1) {
        currentHistoryPage = page;
        if (alertLogBody) alertLogBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
        const params = new URLSearchParams(new FormData(historyFilterForm));
        params.set('page', page); params.set('limit', 10);
        try {
            const res = await fetch(`alerts/api/history?${params.toString()}`);
            const data = await res.json();
            if (alertLogBody) {
                alertLogBody.innerHTML = '';
                if (!data.logs || data.logs.length === 0) { alertLogBody.innerHTML = '<tr><td colspan="6">No history.</td></tr>'; return; }

                data.logs.forEach(log => {
                    const tr = createAlertRow(log);
                    alertLogBody.appendChild(tr);
                });
            }
            if (historyPagination) Pagination.render(historyPagination, data.pages, data.page, (newPage) => loadAlertHistory(newPage));
        } catch (e) { console.error(e); }
    }

    function createAlertRow(log) {
        const tr = document.createElement('tr');
        tr.dataset.logId = log._id;
        tr.style.cursor = 'pointer';
        const date = new Date(log.created || log.timestamp).toLocaleString('en-CA', { hour12: true }).replace(',', '');
        const tagsHtml = (log.tags || []).map(t => `<span class="tag-pill" style="background:${t.color}">${t.name}</span>`).join('');
        const tagIds = (log.tags || []).map(t => t._id).join(',');
        const snapshot = log.alertSnapshot || {};

        // Handle flattened or nested structure
        const level = log.level || snapshot.alertLevel || 'Info';
        const alertName = log.alertName || snapshot.alertName || 'Alert';
        const modelName = log.modelName || snapshot.modelName || '-';

        // Use server-sent humanRule, or fallback to snapshot
        // Logic relying on backend format now.
        const humanRule = log.humanRule || (snapshot.alertRule ? JSON.stringify(snapshot.alertRule) : '');

        tr.innerHTML = `
            <td data-label="Level"><span class="level-badge ${level.toLowerCase()}">${level}</span></td>
            <td data-label="Time">${date}</td>
            <td data-label="Alert">${alertName}</td>
            <td data-label="Model">${modelName}</td>
            <td data-label="Triggered By">${humanRule}</td>
            <td data-label="Tags">
                <div class="tags-cell">
                    ${tagsHtml}
                    <button class="add-log-tag-btn" data-id="${log._id}" data-tags="${tagIds}">+</button>
                </div>
            </td>
        `;
        // Add animation class for new rows
        tr.classList.add('fade-in-row');

        return tr;
    }

    // --- LOG TAGGING MODAL (Dynamic) ---
    // ToDo: Refactor this to use ModalManager
    if (alertLogBody) {
        alertLogBody.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-log-tag-btn')) return;
            const logId = e.target.dataset.id;
            const currentIds = (e.target.dataset.tags || '').split(',').filter(Boolean);
            openLogTagModal(logId, currentIds);
        });
    }

    if (historyFilterForm) {
        historyFilterForm.addEventListener('submit', e => { e.preventDefault(); loadAlertHistory(1); });
        document.querySelector('.clear-filters').addEventListener('click', () => { historyFilterForm.reset(); loadAlertHistory(1); });
    }

    // --- LIVE UPDATES (SSE) ---
    function setupLiveUpdates() {
        try {
            const evtSource = new EventSource('events');

            evtSource.addEventListener('alert', (event) => {
                if (!isLive) return;
                try {
                    const alertData = JSON.parse(event.data);

                    // Live Counters & Charts
                    loadLiveAlerts();
                    fetchAndRenderCharts();

                    // Log Table (Prepend if on page 1)
                    if (currentHistoryPage === 1 && alertLogBody) {
                        // --- Giant Filter Section ---
                        // This section just checks the incoming logs and doesn't
                        // display them if they should be filtered out.
                        const formData = new FormData(historyFilterForm);
                        const filterLevel = formData.get('level'); // Ensure these 'name' attributes match your HTML
                        const filterModel = formData.get('modelName');
                        const filterTag = formData.get('tag');
                        const alert = alertData.alertSnapshot;
                        const startDateVal = formData.get('startDate');
                        const endDateVal = formData.get('endDate');
                        const alertTime = new Date(alertData.timestamp).getTime();

                        if (startDateVal) {
                            const startTs = new Date(startDateVal).getTime();
                            if (alertTime < startTs) return; // Alert is too old for this filter
                        }

                        if (endDateVal) {
                            const endTs = new Date(endDateVal).getTime();
                            if (alertTime > endTs) return; // Alert is newer than the selected range
                        }

                        // Check Level (if not 'all')
                        if (filterLevel && filterLevel !== 'all' && alert.alertLevel !== filterLevel) {
                            return;
                        }

                        // Check Model (if not 'all')
                        if (filterModel && filterModel !== 'all' && alert.modelName !== filterModel) {
                            return;
                        }

                        // Check Tag (if not 'all')
                        if (filterTag && filterTag !== 'all') {
                            const hasTag = (alertData.originalTagIDs || []).some(t => t._id === filterTag);
                            if (!hasTag) return;
                        }

                        // Remove "No history" row if present
                        if (alertLogBody.children.length === 1 && alertLogBody.firstElementChild.innerText.includes('No history')) {
                            alertLogBody.innerHTML = '';
                        }

                        const tr = createAlertRow(alertData);
                        alertLogBody.prepend(tr);

                        // Keep list size managed
                        if (alertLogBody.children.length > 10) {
                            alertLogBody.lastElementChild.remove();
                        }
                    }
                } catch (e) { console.error('SSE Error', e); }
            });

            window.addEventListener('beforeunload', () => evtSource.close());
        } catch (e) { console.error('SSE Setup Failed', e); }
    }

    // --- API WRAPPERS ---
    async function apiGetLiveAlerts() { return fetch('alerts/live').then(r => r.json()); }
    async function apiListTags() { return fetch('tags').then(r => r.json()).then(d => d.tags); }
    async function apiDeleteAlert(id) { return fetch(`alerts/${id}`, { method: 'DELETE' }).then(r => r.json()); }

    init();
});