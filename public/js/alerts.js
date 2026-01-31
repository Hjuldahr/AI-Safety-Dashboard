document.addEventListener('DOMContentLoaded', async function () {

    // --- DOM REFERENCES ---
    const alertModal = document.getElementById('alert-modal');
    const manageModal = document.getElementById('manage-modal');
    const tagsModal = document.getElementById('tags-modal');
    const modalTitle = document.getElementById('modal-title');
    
    const openCreateBtn = document.getElementById('open-create-modal-btn');
    const openManageBtn = document.getElementById('open-manage-modal-btn');
    const openTagsBtn = document.getElementById('open-tags-modal-btn');
    const saveAlertBtn = document.getElementById('save-alert-btn');
    const saveTagsBtn = document.getElementById('save-tags-btn');
    
    // Close Buttons
    const closeBtns = document.querySelectorAll('.close-modal-btn');
    const closeManageBtns = document.querySelectorAll('.close-manage-btn');
    const closeTagsBtns = document.querySelectorAll('.close-tags-btn');

    // Stats
    const countCrit = document.getElementById('count-critical');
    const countHigh = document.getElementById('count-high');
    const countMed = document.getElementById('count-medium');
    const countInfo = document.getElementById('count-info');
    const statCards = document.querySelectorAll('.stat-card');

    // Builder
    const alertNameInput = document.getElementById('alert-name');
    const alertLevelSelect = document.getElementById('alert-level');
    const modelSelect = document.getElementById('model-name');
    const rulesContainer = document.getElementById('rules-container');
    const logicalOperatorsContainer = document.querySelector('.logical-operators-container');
    
    // Manage/History
    const liveAlertsList = document.getElementById('live-alerts-list');
    const alertLogBody = document.getElementById('alert-log-body');
    const historyPagination = document.getElementById('history-pagination');
    const historyFilterForm = document.getElementById('history-filter-form');
    const tagManagerRows = document.getElementById('tag-manager-rows');
    const addTagRowBtn = document.getElementById('add-tag-row-btn');

    // State
    const liveAlertsCache = {};
    const tagsCache = {};
    const selectedTags = []; // For Rule Builder
    let currentEditId = null;
    let currentHistoryPage = 1;
    let deletedTagIds = []; // For Tag Manager

    // Constants
    const { DATA_DICTIONARY, KNOWN_MODELS } = window.CONSTANTS || { DATA_DICTIONARY: {}, KNOWN_MODELS: [] };
    
    // OPERATORS (Includes 'eq' / Equal To)
    const OPERATOR_MAP = { 'gt': '$gt', 'gte': '$gte', 'lt': '$lt', 'lte': '$lte', 'eq': '$eq' };
    const OP_REVERSE_MAP = { '$gt': 'gt', '$gte': 'gte', '$lt': 'lt', '$lte': 'lte', '$eq': 'eq' };


    // --- 1. INITIALIZATION ---
    async function init() {
        try {
            const tData = await apiListTags();
            (tData || []).forEach(t => tagsCache[t._id] = t);
        } catch (e) { console.warn('Tags load failed', e); }

        // Populate dropdowns AFTER tags are loaded
        populateModelDropdowns();

        await loadLiveAlerts();
        await loadLiveAlerts();
        await loadLiveAlerts();
        await loadAlertHistory(1);
        await initCharts();
        setupLiveUpdates();
    }

    // --- CHART LOGIC ---
    const chartRangeSelect = document.getElementById('chart-range-select');

    async function initCharts() {
        if(chartRangeSelect) {
            chartRangeSelect.addEventListener('change', () => fetchAndRenderCharts());
        }
        await fetchAndRenderCharts();
    }

    async function fetchAndRenderCharts() {
        try {
            const range = chartRangeSelect ? chartRangeSelect.value : '24h';
            const end = new Date();
            let start = new Date();
            if(range === '24h') start.setTime(end.getTime() - 24*60*60*1000);
            else if(range === '7d') start.setTime(end.getTime() - 7*24*60*60*1000);
            else if(range === '30d') start.setTime(end.getTime() - 30*24*60*60*1000);

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
        } catch(e) { console.error('Chart load failed', e); }
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
            const sorted = Object.values(tagsCache).sort((a,b) => (a.name||'').localeCompare(b.name||''));
            sorted.forEach(t => html += `<option value="${t._id}">${t.name}</option>`);
            tagFilter.innerHTML = html;
        }
    }


    // --- 2. MODAL CONTROLS ---

    // Rule Builder
    function openBuilder(isEdit = false) {
        alertModal.style.display = 'flex';
        modalTitle.textContent = isEdit ? 'Edit Alert Rule' : 'Create New Alert Rule';
        saveAlertBtn.textContent = isEdit ? 'Update Alert' : 'Save Alert';
    }
    function closeBuilder() {
        alertModal.style.display = 'none';
        currentEditId = null;
        resetBuilderForm();
    }
    function resetBuilderForm() {
        alertNameInput.value = ''; alertLevelSelect.value = ''; 
        if(modelSelect) modelSelect.value = '';
        rulesContainer.innerHTML = ''; addEmptyRuleRow();
        selectedTags.length = 0; renderDualLists();
    }
    openCreateBtn.addEventListener('click', () => { resetBuilderForm(); openBuilder(false); });
    closeBtns.forEach(b => b.addEventListener('click', closeBuilder));

    // Manage Rules Modal
    openManageBtn.addEventListener('click', () => { manageModal.style.display = 'flex'; });
    closeManageBtns.forEach(b => b.addEventListener('click', () => { manageModal.style.display = 'none'; }));

    // Tag Manager Modal
    if (openTagsBtn) {
        openTagsBtn.addEventListener('click', () => {
            deletedTagIds = [];
            renderTagManager();
            tagsModal.style.display = 'flex';
        });
    }
    closeTagsBtns.forEach(b => b.addEventListener('click', () => { tagsModal.style.display = 'none'; }));


    // --- 3. TAG MANAGER LOGIC ---
    function renderTagManager() {
        tagManagerRows.innerHTML = '';
        const tags = Object.values(tagsCache).sort((a,b)=>a.name.localeCompare(b.name));
        tags.forEach(t => addTagRowUI(t._id, t.name, t.color));
        if(tags.length === 0) addTagRowUI(null, '', '#888888');
    }

    function addTagRowUI(id, name, color) {
        const row = document.createElement('div');
        row.className = 'tag-edit-row';
        row.innerHTML = `
            <input type="text" placeholder="Tag Name" value="${name||''}" class="tag-name-input" data-original-id="${id||''}">
            <input type="color" value="${color||'#888888'}" class="tag-color-input">
            <button class="btn btn-secondary delete-tag-btn"><i class="fa-solid fa-trash"></i></button>
        `;
        row.querySelector('.delete-tag-btn').addEventListener('click', () => {
            if(id) deletedTagIds.push(id);
            row.remove();
        });
        tagManagerRows.appendChild(row);
    }

    if (addTagRowBtn) {
        addTagRowBtn.addEventListener('click', () => {
            addTagRowUI(null, '', '#888888');
            tagManagerRows.scrollTop = tagManagerRows.scrollHeight;
        });
    }

    if (saveTagsBtn) {
        saveTagsBtn.addEventListener('click', async () => {
            const rows = tagManagerRows.querySelectorAll('.tag-edit-row');
            const originalIds = [], newNames = [], colors = [];
            let isValid = true; const seen = new Set();
            
            rows.forEach(r => {
                const name = r.querySelector('.tag-name-input').value.trim();
                const color = r.querySelector('.tag-color-input').value;
                const oid = r.querySelector('.tag-name-input').dataset.originalId || null;
                if(!name) return;
                if(seen.has(name.toLowerCase())) { alert(`Duplicate: ${name}`); isValid = false; return; }
                seen.add(name.toLowerCase());
                newNames.push(name); colors.push(color); originalIds.push(oid);
            });
            if(!isValid) return;

            try {
                await apiSyncTags({ originalIds, newNames, colors, deletions: deletedTagIds });
                // Reload Tags
                const updated = await apiListTags();
                Object.keys(tagsCache).forEach(k=>delete tagsCache[k]);
                updated.forEach(t=>tagsCache[t._id]=t);
                // Refresh UIs
                renderDualLists(); 
                populateModelDropdowns(); // updates filter
                loadAlertHistory(currentHistoryPage);
                tagsModal.style.display = 'none';
                alert('Tags saved.');
            } catch(e) { alert('Save failed: '+e.message); }
        });
    }


    // --- 4. LIVE ALERTS (STATS & LIST) ---
    async function loadLiveAlerts() {
        try {
            const data = await apiGetLiveAlerts();
            const alerts = data.alerts || [];
            Object.keys(liveAlertsCache).forEach(k=>delete liveAlertsCache[k]);
            alerts.forEach(a => liveAlertsCache[a._id] = a);

            const counts = { Critical: 0, High: 0, Medium: 0, Info: 0 };
            alerts.forEach(a => { if(counts[a.alertLevel] !== undefined) counts[a.alertLevel]++; });
            
            countCrit.innerText = counts.Critical;
            countHigh.innerText = counts.High;
            countMed.innerText = counts.Medium;
            countInfo.innerText = counts.Info;

            renderManageList(alerts);
        } catch(e) { console.error(e); }
    }

    function renderManageList(alerts) {
        liveAlertsList.innerHTML = '';
        if(alerts.length === 0) { liveAlertsList.innerHTML = '<li style="color:#888;">No active rules.</li>'; return; }
        alerts.forEach(a => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div><span class="level-badge ${a.alertLevel.toLowerCase()}">${a.alertLevel}</span> <strong>${a.alertName}</strong></div>
                <div class="alert-actions">
                    <button class="btn btn-secondary btn-icon edit-alert-btn" data-id="${a._id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-secondary btn-icon delete-alert-btn" data-id="${a._id}" style="color:#dc2626;"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            liveAlertsList.appendChild(li);
        });
    }

    liveAlertsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if(!btn) return;
        const id = btn.dataset.id;
        if(btn.classList.contains('delete-alert-btn')) {
            if(confirm('Delete rule?')) { await apiDeleteAlert(id); await loadLiveAlerts(); }
        }
        if(btn.classList.contains('edit-alert-btn')) {
            const obj = liveAlertsCache[id];
            if(obj) startEdit(obj);
        }
    });

    function startEdit(obj) {
        currentEditId = obj._id;
        alertNameInput.value = obj.alertName;
        alertLevelSelect.value = obj.alertLevel;
        if(modelSelect) modelSelect.value = obj.modelName || '';
        rulesContainer.innerHTML = '';
        populateRuleBuilderFromRule(obj.alertRule);
        selectedTags.length = 0;
        if(obj.tags) obj.tags.forEach(t => selectedTags.push(t._id));
        renderDualLists();
        manageModal.style.display = 'none';
        openBuilder(true);
    }
    
    statCards.forEach(c => c.addEventListener('click', () => {
        document.getElementById('filter-level').value = c.dataset.level;
        loadAlertHistory(1);
    }));


    // --- 5. RULE BUILDER ---
    function createRuleRowHTML(op) {
        const del = op ? '<button class="btn btn-secondary btn-icon delete-rule-btn">&times;</button>' : '';
        const opts = Object.keys(DATA_DICTIONARY).filter(k=>DATA_DICTIONARY[k].dataType==='numeric')
            .map(k=>`<option value="${k}">${DATA_DICTIONARY[k].label}</option>`).join('');
        
        // English operators
        return `
            <span class="logic-separator" style="font-weight:bold; font-size:0.8rem; margin-right:8px;">${op}</span>
            <select class="data-type"><option value="">-- Data --</option>${opts}</select>
            <select class="operator-type">
                <option value="">-- Operator --</option>
                <option value="gt">Greater Than</option>
                <option value="gte">Greater Than or Equal To</option>
                <option value="lt">Less Than</option>
                <option value="lte">Less Than or Equal To</option>
                <option value="eq">Equal To</option>
            </select>
            <input type="text" placeholder="Value" class="value-input" style="width:80px;">
            ${del}
        `;
    }
    function addEmptyRuleRow() {
        const d = document.createElement('div'); d.className='rule-row'; d.innerHTML=createRuleRowHTML('');
        rulesContainer.appendChild(d);
    }
    logicalOperatorsContainer.addEventListener('click', e => {
        if(e.target.classList.contains('add-rule-btn')) {
            const d = document.createElement('div'); d.className='rule-row';
            d.innerHTML=createRuleRowHTML(e.target.dataset.logic);
            rulesContainer.appendChild(d);
        }
    });
    rulesContainer.addEventListener('click', e => {
        if(e.target.classList.contains('delete-rule-btn')) e.target.closest('.rule-row').remove();
    });

    function buildRuleJSON() {
        const rows = rulesContainer.querySelectorAll('.rule-row');
        const conds = []; let logic = null; let valid = true;
        rows.forEach((r, i) => {
            const type = r.querySelector('.data-type').value;
            const op = r.querySelector('.operator-type').value;
            const val = r.querySelector('.value-input').value;
            const sep = r.querySelector('.logic-separator');
            if(i>0 && sep && !logic) logic = sep.textContent.trim()==='AND'?'$and':'$or';
            if(type && op && val) {
                const c = {}; c[DATA_DICTIONARY[type].dbPath] = {}; c[DATA_DICTIONARY[type].dbPath][OPERATOR_MAP[op]] = parseFloat(val);
                conds.push(c);
            } else valid = false;
        });
        if(!valid || conds.length===0) return null;
        if(conds.length===1) return conds[0];
        const f = {}; f[logic||'$and'] = conds;
        return f;
    }

    function populateRuleBuilderFromRule(rule) {
        let parts = [];
        if (rule.$and) parts = rule.$and.map(x => ({...x, logic: 'AND'}));
        else if (rule.$or) parts = rule.$or.map(x => ({...x, logic: 'OR'}));
        else parts = [{...rule, logic: ''}];

        parts.forEach((p, i) => {
            const dbField = Object.keys(p).find(k => k !== 'logic');
            const inner = p[dbField];
            const mongoOp = Object.keys(inner)[0];
            const val = inner[mongoOp];
            const dictKey = Object.keys(DATA_DICTIONARY).find(k => DATA_DICTIONARY[k].dbPath === dbField);
            
            const row = document.createElement('div');
            row.className = 'rule-row';
            row.innerHTML = createRuleRowHTML(i > 0 ? (i===1 ? (rule.$and?'AND':'OR') : 'AND') : ''); 
            if(dictKey) row.querySelector('.data-type').value = dictKey;
            if(OP_REVERSE_MAP[mongoOp]) row.querySelector('.operator-type').value = OP_REVERSE_MAP[mongoOp];
            row.querySelector('.value-input').value = val;
            rulesContainer.appendChild(row);
        });
        if(parts.length === 0) addEmptyRuleRow();
    }


    // --- 6. DUAL LIST (RULE BUILDER) ---
    function renderDualLists() {
        const left = document.getElementById('tag-dual-left');
        const right = document.getElementById('tag-dual-right');
        if(!left) return;
        left.innerHTML=''; right.innerHTML='';
        Object.values(tagsCache).sort((a,b)=>a.name.localeCompare(b.name)).forEach(t => {
            const el = document.createElement('div');
            el.className = 'dual-item'; el.textContent = t.name; el.style.backgroundColor = t.color; el.dataset.id = t._id;
            el.onclick = () => el.classList.toggle('selected');
            if(selectedTags.includes(t._id)) right.appendChild(el); else left.appendChild(el);
        });
    }
    const moveTags = (srcId, isAll) => {
        const src = document.getElementById(srcId);
        const items = isAll ? src.querySelectorAll('.dual-item') : src.querySelectorAll('.dual-item.selected');
        items.forEach(el => {
            const id = el.dataset.id;
            if(srcId.includes('left')) { if(!selectedTags.includes(id)) selectedTags.push(id); }
            else { const idx=selectedTags.indexOf(id); if(idx>-1) selectedTags.splice(idx,1); }
        });
        renderDualLists();
    };
    document.getElementById('move-selected-right').onclick = () => moveTags('tag-dual-left', false);
    document.getElementById('move-all-right').onclick = () => moveTags('tag-dual-left', true);
    document.getElementById('move-selected-left').onclick = () => moveTags('tag-dual-right', false);
    document.getElementById('move-all-left').onclick = () => moveTags('tag-dual-right', true);

    saveAlertBtn.addEventListener('click', async () => {
        const name = alertNameInput.value, level = alertLevelSelect.value, rule = buildRuleJSON();
        if(!name || !level || !rule) return alert('Fill required fields');
        const payload = { alertName: name, alertLevel: level, alertRule: rule, modelName: modelSelect.value, tags: selectedTags };
        try {
            if(currentEditId) await apiUpdateAlert(currentEditId, payload);
            else { payload.created=Date.now(); await apiCreateAlert(payload); }
            closeBuilder(); await loadLiveAlerts(); await loadAlertHistory(1);
        } catch(e) { alert(e.message); }
    });


    // --- 7. HISTORY TABLE (with + LOG TAGGING) ---
    async function loadAlertHistory(page = 1) {
        currentHistoryPage = page;
        if(alertLogBody) alertLogBody.innerHTML = '<tr><td colspan="6">Loading...</td></tr>';
        const params = new URLSearchParams(new FormData(historyFilterForm));
        params.set('page', page); params.set('limit', 10);
        try {
            const res = await fetch(`alerts/api/history?${params.toString()}`);
            const data = await res.json();
            if(alertLogBody) {
                alertLogBody.innerHTML = '';
                if(!data.logs || data.logs.length===0) { alertLogBody.innerHTML = '<tr><td colspan="6">No history.</td></tr>'; return; }
                
                data.logs.forEach(log => {
                    const tr = createAlertRow(log);
                    alertLogBody.appendChild(tr);
                });
            }
            if(historyPagination) Pagination.render(historyPagination, data.pages, data.page, (newPage) => loadAlertHistory(newPage));
        } catch(e) { console.error(e); }
    }

    function createAlertRow(log) {
        const tr = document.createElement('tr');
        const date = new Date(log.created || log.timestamp).toLocaleString('en-CA', {hour12:true}).replace(',','');
        const tagsHtml = (log.tags||[]).map(t => `<span class="tag-pill" style="background:${t.color}">${t.name}</span>`).join('');
        const tagIds = (log.tags||[]).map(t=>t._id).join(',');
        const snapshot = log.alertSnapshot || {}; 
        
        // Handle flattened or nested structure
        const level = log.level || snapshot.alertLevel || 'Info';
        const alertName = log.alertName || snapshot.alertName || 'Alert';
        const modelName = log.modelName || snapshot.modelName || '-';
        
        // Use server-sent humanRule, or fallback to snapshot (which might be raw for old logs)
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

    // --- 8. LOG TAGGING MODAL (Dynamic) ---
    if (alertLogBody) {
        alertLogBody.addEventListener('click', (e) => {
            if (!e.target.classList.contains('add-log-tag-btn')) return;
            const logId = e.target.dataset.id;
            const currentIds = (e.target.dataset.tags || '').split(',').filter(Boolean);
            openLogTagModal(logId, currentIds);
        });
    }

    function openLogTagModal(logId, currentTagIds) {
        // Create a temporary modal in the DOM
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        
        const modal = document.createElement('div');
        modal.className = 'modal-content medium-modal';
        
        modal.innerHTML = `
            <div class="modal-header"><h2>Tag Alert Log</h2><button class="close-dyn-btn">&times;</button></div>
            <div class="modal-body">
                <div class="dual-list-container">
                    <div class="dual-list-col"><span class="sub-label">Available</span><div id="dyn-left" class="dual-list-box"></div></div>
                    <div class="dual-list-actions">
                        <button id="dyn-mr" class="btn btn-secondary btn-icon">▶</button>
                        <button id="dyn-ml" class="btn btn-secondary btn-icon">◀</button>
                    </div>
                    <div class="dual-list-col"><span class="sub-label">Selected</span><div id="dyn-right" class="dual-list-box"></div></div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-dyn-btn">Cancel</button>
                <button id="dyn-save" class="btn btn-primary">Save Tags</button>
            </div>
        `;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // State for this modal
        const selected = [...currentTagIds];
        const left = modal.querySelector('#dyn-left');
        const right = modal.querySelector('#dyn-right');

        function renderDyn() {
            left.innerHTML = ''; right.innerHTML = '';
            Object.values(tagsCache).sort((a,b)=>a.name.localeCompare(b.name)).forEach(t => {
                const el = document.createElement('div');
                el.className = 'dual-item'; el.textContent = t.name; el.style.backgroundColor = t.color; el.dataset.id = t._id;
                el.onclick = () => el.classList.toggle('selected');
                if(selected.includes(t._id)) right.appendChild(el); else left.appendChild(el);
            });
        }
        renderDyn();

        // Handlers
        modal.querySelector('#dyn-mr').onclick = () => {
            left.querySelectorAll('.selected').forEach(el => { if(!selected.includes(el.dataset.id)) selected.push(el.dataset.id); });
            renderDyn();
        };
        modal.querySelector('#dyn-ml').onclick = () => {
            right.querySelectorAll('.selected').forEach(el => { const idx=selected.indexOf(el.dataset.id); if(idx>-1) selected.splice(idx,1); });
            renderDyn();
        };
        
        const close = () => { document.body.removeChild(overlay); };
        modal.querySelectorAll('.close-dyn-btn').forEach(b => b.onclick = close);

        modal.querySelector('#dyn-save').onclick = async () => {
            try {
                await fetch(`alerts/api/logs/${logId}/tags`, {
                    method: 'PUT', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ tags: selected })
                });
                close();
                loadAlertHistory(currentHistoryPage);
            } catch(e) { alert('Failed to update tags'); }
        };
    }

    // --- PAGINATION (Function Removed - Uses Shared Component) ---

    if (historyFilterForm) {
        historyFilterForm.addEventListener('submit', e => { e.preventDefault(); loadAlertHistory(1); });
        document.querySelector('.clear-filters').addEventListener('click', () => { historyFilterForm.reset(); loadAlertHistory(1); });
    }

    // --- 9. LIVE UPDATES (SSE) ---
    function setupLiveUpdates() {
        try {
            const evtSource = new EventSource('events');
            
            evtSource.addEventListener('alert', (event) => {
                try {
                    const alertData = JSON.parse(event.data);
                    
                    // 1. Live Counters & Charts
                    loadLiveAlerts();
                    fetchAndRenderCharts();

                    // 2. Log Table (Prepend if on page 1)
                    if (currentHistoryPage === 1 && alertLogBody) {
                        // Remove "No history" row if present
                        if(alertLogBody.children.length === 1 && alertLogBody.firstElementChild.innerText.includes('No history')) {
                            alertLogBody.innerHTML = '';
                        }
                        
                        const tr = createAlertRow(alertData);
                        alertLogBody.prepend(tr);

                        // Keep list size managed
                        if(alertLogBody.children.length > 10) {
                            alertLogBody.lastElementChild.remove();
                        }
                    }
                } catch(e) { console.error('SSE Error', e); }
            });

            window.addEventListener('beforeunload', () => evtSource.close());
        } catch(e) { console.error('SSE Setup Failed', e); }
    }

    // --- API WRAPPERS ---
    async function apiGetLiveAlerts() { return fetch('alerts/live').then(r=>r.json()); }
    async function apiListTags() { return fetch('/tags').then(r=>r.json()).then(d=>d.tags); }
    async function apiCreateAlert(p) { return fetch('alerts', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)}).then(r=>r.json()); }
    async function apiUpdateAlert(id, p) { return fetch(`alerts/${id}`, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)}).then(r=>r.json()); }
    async function apiDeleteAlert(id) { return fetch(`alerts/${id}`, {method:'DELETE'}).then(r=>r.json()); }
    async function apiSyncTags(p) { return fetch('/tags/sync', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(p)}).then(r=>r.json()); }

    init();
});