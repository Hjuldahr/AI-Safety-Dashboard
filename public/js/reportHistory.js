import ModalManager from './components/modals.js';

// --- STATE ---
let currentPage = 1;
let modalManager;

// --- HELPERS ---

const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const fidelityBadge = (fidelity) => {
    const map = {
        high: { label: 'High Fidelity', cls: 'badge-high' },
        low: { label: 'Low Fidelity', cls: 'badge-low' },
        split: { label: 'Split Fidelity', cls: 'badge-split' }
    };
    const info = map[fidelity] || map.high;
    return `<span class="fidelity-badge ${info.cls}">${info.label}</span>`;
};

/**
 * Resolves a field dbPath (e.g., "tokensUsed") to a human label using DATA_DICTIONARY.
 */
const fieldLabel = (fieldValue) => {
    const dict = window.CONSTANTS?.DATA_DICTIONARY || {};
    for (const key in dict) {
        if (dict[key].dbPath === fieldValue || key === fieldValue) {
            return dict[key].label;
        }
    }
    return fieldValue;
};

// --- FETCH & RENDER ---

const fetchHistory = async (page = 1) => {
    const res = await fetch(`reports/history?page=${page}`);
    if (!res.ok) throw new Error('Failed to fetch report history');
    return res.json();
};

const renderHistoryList = (reports) => {
    const container = document.getElementById('history-list');
    const emptyState = document.getElementById('history-empty');

    if (!reports.length) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    emptyState.classList.add('hidden');

    container.innerHTML = reports.map(r => `
        <div class="history-row" data-id="${r._id}">
            <div class="history-row-info">
                <div class="history-row-title">${r.title}</div>
                <div class="history-row-meta">
                    <span>${r.modelName}</span>
                    <span class="meta-sep">|</span>
                    <span>${formatDate(r.startDate)} &ndash; ${formatDate(r.endDate)}</span>
                    <span class="meta-sep">|</span>
                    ${fidelityBadge(r.fidelity)}
                </div>
                <div class="history-row-created">Generated: ${formatDate(r.createdAt)}</div>
            </div>
            <div class="history-row-actions">
                <button class="btn-download pdf" data-action="pdf" title="View PDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
                <button class="btn-download ai-logs" data-action="logs" title="Download AI Logs"><i class="fa-solid fa-database"></i> Logs</button>
                <button class="btn-download ai-summaries" data-action="summaries" title="Download Summaries"><i class="fa-solid fa-list"></i> Summaries</button>
                <button class="btn-download agg" data-action="aggregates" title="Download Aggregates"><i class="fa-solid fa-chart-bar"></i> Aggregates</button>
                <button class="btn-download ai-logs" data-action="hdf5" title="Download HDF5"><i class="fa-solid fa-cube"></i> HDF5</button>
                <button class="btn-delete" data-action="delete" title="Delete Report"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `).join('');
};

const loadPage = async (page) => {
    currentPage = page;
    try {
        const data = await fetchHistory(page);
        renderHistoryList(data.reports);

        const paginationEl = document.getElementById('history-pagination');
        Pagination.render(paginationEl, data.totalPages, data.page, loadPage);
    } catch (err) {
        console.error('Failed to load report history:', err);
    }
};

// --- ACTIONS ---

const openPdf = (id) => {
    window.open(`reports/history/${id}/pdf`, '_blank');
};

const triggerDownload = async (id, type) => {
    try {
        const response = await fetch(`reports/history/${id}/download/${type}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Download failed' }));
            alert(err.message);
            return;
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `report-${type}.csv`;
        if (contentDisposition && contentDisposition.includes('filename=')) {
            filename = contentDisposition.split('filename=')[1].replace(/"/g, '');
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('Download error:', e);
        alert('An unexpected error occurred during download.');
    }
};

const deleteReportRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this report? This cannot be undone.')) return;

    try {
        const res = await fetch(`reports/history/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Delete failed' }));
            alert(err.message);
            return;
        }
        loadPage(currentPage);
    } catch (e) {
        console.error('Delete error:', e);
        alert('Failed to delete report.');
    }
};

const openDetailModal = (report) => {
    const body = document.createElement('div');
    body.className = 'report-detail-modal';

    const fieldsHtml = (report.fields || [])
        .map(f => `<span class="detail-field-pill">${fieldLabel(f)}</span>`)
        .join('');

    body.innerHTML = `
        <div class="detail-section">
            <label>Model</label>
            <span>${report.modelName}</span>
        </div>
        <div class="detail-section">
            <label>Time Range</label>
            <span>${formatDate(report.startDate)} &ndash; ${formatDate(report.endDate)}</span>
        </div>
        <div class="detail-section">
            <label>Fidelity</label>
            ${fidelityBadge(report.fidelity)}
        </div>
        <div class="detail-section">
            <label>Generated</label>
            <span>${formatDate(report.createdAt)}</span>
        </div>
        <div class="detail-section">
            <label>Included Fields</label>
            <div class="detail-fields-grid">${fieldsHtml || '<em>None</em>'}</div>
        </div>
    `;

    const footer = document.createElement('div');
    footer.className = 'report-detail-footer';
    footer.innerHTML = `
        <button class="btn-download pdf" data-action="pdf"><i class="fa-solid fa-file-pdf"></i> View PDF</button>
        <button class="btn-download ai-logs" data-action="logs"><i class="fa-solid fa-database"></i> Logs</button>
        <button class="btn-download ai-summaries" data-action="summaries"><i class="fa-solid fa-list"></i> Summaries</button>
        <button class="btn-download agg" data-action="aggregates"><i class="fa-solid fa-chart-bar"></i> Aggregates</button>
        <button class="btn-download ai-logs" data-action="hdf5"><i class="fa-solid fa-cube"></i> HDF5</button>
    `;

    footer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action === 'pdf') openPdf(report._id);
        else triggerDownload(report._id, action);
    });

    modalManager.open(report.title, body, footer, 'medium-modal');
};

// --- TAB SWITCHING ---

const initTabs = () => {
    const tabBtns = document.querySelectorAll('.report-tab-btn');
    const views = {
        generator: document.getElementById('generator-view'),
        history: document.getElementById('history-view')
    };

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.view;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            Object.entries(views).forEach(([key, el]) => {
                if (key === target) el.classList.remove('hidden');
                else el.classList.add('hidden');
            });

            // Load history data when switching to that tab
            if (target === 'history') {
                loadPage(1);
            }
        });
    });
};

// --- EVENT DELEGATION ---

const initHistoryActions = () => {
    const container = document.getElementById('history-list');

    container.addEventListener('click', async (e) => {
        const actionBtn = e.target.closest('[data-action]');
        const row = e.target.closest('.history-row');
        if (!row) return;

        const id = row.dataset.id;

        if (actionBtn) {
            e.stopPropagation();
            const action = actionBtn.dataset.action;

            switch (action) {
                case 'pdf': return openPdf(id);
                case 'delete': return deleteReportRecord(id);
                default: return triggerDownload(id, action);
            }
        }

        // Clicking on the row itself (not a button) opens the detail modal
        // We need the full report data — fetch from the currently rendered list
        const data = await fetchHistory(currentPage);
        const report = data.reports.find(r => r._id === id);
        if (report) openDetailModal(report);
    });
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    modalManager = new ModalManager();
    initTabs();
    initHistoryActions();
});
