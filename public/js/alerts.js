document.addEventListener('DOMContentLoaded', function () {

    // --------------------------------------------------
    // DOM references
    // --------------------------------------------------
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertLogBody = document.getElementById('alert-log-body');
    const liveAlertsList = document.getElementById('live-alerts-list');
    const rulesContainer = document.getElementById('rules-container');
    const logicalOperatorsContainer = document.querySelector('.logical-operators-container');
    const alertNameInput = document.getElementById('alert-name');
    const alertLevelSelect = document.getElementById('alert-level');
    const modelSelect = document.getElementById('model-name');

    // History references
    const historyFilterForm = document.getElementById('history-filter-form');
    const historyClearBtn = document.querySelector('#history-filter-form .clear-filters');
    const historyPagination = document.getElementById('history-pagination');

    // Buttons used for edit flow (created once)
    const saveBtn = document.createElement('button');
    saveBtn.id = 'save-alert-btn';
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save';
    saveBtn.style.display = 'none';

    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-edit-btn';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.display = 'none';


    if (addAlertBtn && addAlertBtn.parentElement) {
        const actionWrapper = document.createElement('div');
        actionWrapper.className = 'alert-action-buttons';
        actionWrapper.style.display = 'inline-flex';
        actionWrapper.style.gap = '8px';
        actionWrapper.appendChild(cancelBtn);
        actionWrapper.appendChild(saveBtn);
        addAlertBtn.parentElement.appendChild(actionWrapper);
    }

    // Client-side cache and edit state
    const liveAlertsCache = {};
    let currentEditId = null;
    let currentHistoryPage = 1;

    // --------------------------------------------------
    // Config / constant mappings
    // --------------------------------------------------
    // Field mappings were removed — the rule builder uses `DATA_DICTIONARY` directly.

    const OPERATOR_MAP = { 'gt': '$gt', 'gte': '$gte', 'lt': '$lt', 'lte': '$lte' };
    const OPERATOR_READABLE = { 'gt': 'greater than', 'gte': 'greater than or equal to', 'lt': 'less than', 'lte': 'less than or equal to' };
    const OP_REVERSE_MAP = { '$gt': 'gt', '$gte': 'gte', '$lt': 'lt', '$lte': 'lte' };

    // --------------------------------------------------
    // Small helpers
    // --------------------------------------------------
    function isNumberLike(v) {
        return !Number.isNaN(Number(v));
    }

    function formatTimeISO(ts) {
        const d = ts ? new Date(ts) : new Date();
        return d.toLocaleString('en-CA', { hour12: true }).replace(',', '');
    }


    // --------------------------------------------------
    // Rule-builder helpers
    // --------------------------------------------------
    function createRuleRowHTML(logicalOperator) {
        const deleteBtn = logicalOperator ? '<button class="delete-rule-btn">&times;</button>' : '';
        
        // Dynamically insert options
        const optionsHtml = getDataTypeOptions();

        return `
      <span class="logic-separator">${logicalOperator}</span>
      <select class="data-type">
          <option value="">-- select data type --</option>
          ${optionsHtml}
      </select>
      <select class="operator-type">
          <option value="">-- select operator --</option>
          <option value="gt">Greater Than</option>
          <option value="gte">Greater Than or Equal To</option>
          <option value="lte">Less Than or Equal To</option>
          <option value="lt">Less Than</option>
      </select>
      <input type="text" placeholder="value" class="value-input">
      ${deleteBtn}
    `;
    }

    /**
     * Build a MongoDB-style rule object from the UI. Returns null and alerts
     * on validation errors.
     */
    function buildRuleJSON() {
        const ruleRows = rulesContainer.querySelectorAll('.rule-row');
        const conditions = [];
        let firstLogicOperator = null;
        let hasIncompleteRow = false;

        ruleRows.forEach((row, index) => {
            const dataTypeSelect = row.querySelector('.data-type');
            const operatorSelect = row.querySelector('.operator-type');
            const valueInput = row.querySelector('.value-input');
            const logicalOperatorSpan = row.querySelector('.logic-separator');

            // dataType is now the DICTIONARY KEY (e.g., 'responseHelpfulness')
            const dictKey = dataTypeSelect ? dataTypeSelect.value : '';
            const operatorValue = operatorSelect ? operatorSelect.value : '';
            const rawValue = valueInput ? valueInput.value : '';

            if (index > 0 && logicalOperatorSpan && !firstLogicOperator) {
                firstLogicOperator = logicalOperatorSpan.textContent.trim().toLowerCase() === 'and' ? '$and' : '$or';
            }

            if (dictKey && operatorValue && rawValue) {
                // LOOKUP: Get the actual DB path from the dictionary
                const dictEntry = DATA_DICTIONARY[dictKey];
                if (!dictEntry) {
                    alert('Invalid data type selected');
                    return;
                }
                const dbField = dictEntry.dbPath;
                const mongoOperator = OPERATOR_MAP[operatorValue];
                const numericValue = parseFloat(rawValue);

                if (!dbField || !mongoOperator || Number.isNaN(numericValue)) {
                    alert(`Invalid data in rule ${index + 1}.`);
                    hasIncompleteRow = true;
                    return;
                }

                const condition = {};
                condition[dbField] = {};
                condition[dbField][mongoOperator] = numericValue;
                conditions.push(condition);

            } else if (dictKey || operatorValue || rawValue) {
                hasIncompleteRow = true;
            }
        });

        if (hasIncompleteRow) {
            alert('Please fill out all fields for every rule, or remove incomplete rules.');
            return null;
        }
        if (conditions.length === 0) {
            alert('Please define at least one valid rule for the alert.');
            return null;
        }
        if (conditions.length === 1) return conditions[0];
        
        const topLevelOperator = firstLogicOperator || '$and';
        const finalRule = {};
        finalRule[topLevelOperator] = conditions;
        return finalRule;
    }

    function formatRuleReadableFromUI() {
        const ruleRows = rulesContainer.querySelectorAll('.rule-row');
        const parts = [];
        ruleRows.forEach((row, index) => {
            const dataTypeSelect = row.querySelector('.data-type');
            const operatorSelect = row.querySelector('.operator-type');
            const valueInput = row.querySelector('.value-input');
            const logicalOperatorSpan = row.querySelector('.logic-separator');

            // Use the TEXT of the option (The Label) for readability
            const dataTypeLabel = dataTypeSelect.options[dataTypeSelect.selectedIndex]?.text;
            const operatorValue = operatorSelect ? operatorSelect.value : '';
            const value = valueInput ? valueInput.value : '';

            if (dataTypeLabel && operatorValue && value) {
                const prefix = (index > 0 && logicalOperatorSpan) ? ` ${logicalOperatorSpan.textContent} ` : '';
                parts.push(prefix + `"${dataTypeLabel}" ${OPERATOR_READABLE[operatorValue]} ${value}`);
            }
        });
        return parts.join('').trim() + '.';
    }

    function resetAlertBuilder() {
        alertNameInput.value = '';
        alertLevelSelect.selectedIndex = 0;
        if (modelSelect) modelSelect.value = '';
        while (rulesContainer.children.length > 1) rulesContainer.removeChild(rulesContainer.lastChild);
        
        // Reset first row
        const firstRow = rulesContainer.querySelector('.rule-row');
        if(firstRow) firstRow.remove();
        
        const freshRow = document.createElement('div');
        freshRow.className = 'rule-row';
        freshRow.innerHTML = createRuleRowHTML('');
        rulesContainer.appendChild(freshRow);
    }

    function populateRuleBuilderFromRule(ruleObj) {
        while (rulesContainer.firstChild) rulesContainer.removeChild(rulesContainer.firstChild);
        let parts = [];
        // Flatten Mongo Query Structure
        if (ruleObj && typeof ruleObj === 'object') {
            const keys = Object.keys(ruleObj);
            if (keys.length === 1 && (keys[0] === '$and' || keys[0] === '$or')) parts = ruleObj[keys[0]];
            else parts = [ruleObj];
        }

        parts.forEach((cond, idx) => {
            const dbField = Object.keys(cond)[0];
            const opObj = cond[dbField];
            const opKey = Object.keys(opObj)[0];
            const val = opObj[opKey];

            // REVERSE LOOKUP: Find which dictionary key matches this dbPath
            const dictKey = Object.keys(DATA_DICTIONARY).find(k => DATA_DICTIONARY[k].dbPath === dbField);
            
            const operator = OP_REVERSE_MAP[opKey] || 'gt';
            const logic = idx > 0 ? (ruleObj && ruleObj.$or ? 'OR' : 'AND') : '';

            const newRuleRow = document.createElement('div');
            newRuleRow.className = 'rule-row';
            newRuleRow.innerHTML = createRuleRowHTML(logic);
            rulesContainer.appendChild(newRuleRow);

            const dataTypeSelect = newRuleRow.querySelector('.data-type');
            const operatorSelect = newRuleRow.querySelector('.operator-type');
            const valueInput = newRuleRow.querySelector('.value-input');

            if (dataTypeSelect && dictKey) dataTypeSelect.value = dictKey;
            if (operatorSelect) operatorSelect.value = operator;
            if (valueInput) valueInput.value = val;
        });

        // Add empty row if none existed
        if (rulesContainer.children.length === 0) {
            const firstRow = document.createElement('div');
            firstRow.className = 'rule-row';
            firstRow.innerHTML = createRuleRowHTML('');
            rulesContainer.appendChild(firstRow);
        }
    }

    // --------------------------------------------------
    // Rendering helpers
    // --------------------------------------------------
    function renderLiveAlertsList(alerts) {
        const categories = { Critical: [], High: [], Medium: [], Info: [] };
        alerts.forEach(alert => {
            const level = alert.alertLevel || 'Info';
            if (!categories[level]) categories[level] = [];
            categories[level].push(alert);
            liveAlertsCache[alert._id] = alert;
        });
        const order = ['Critical', 'High', 'Medium', 'Info'];
        let html = '';
        order.forEach(level => {
            const items = (categories[level] || []).map(a => `<li data-id="${a._id}"><span>${a.alertName}</span><div class="alert-actions"><button class="edit-btn">✎</button><button class="delete-btn">&times;</button></div></li>`).join('');
            const cls = level.toLowerCase();
            html += `<li><h3 class="alert-category ${cls}"><span class="color-dot"></span>${level} Alerts</h3><ul class="alert-items">${items}</ul></li>`;
        });
        liveAlertsList.innerHTML = html;
    }

    function populateModelDropdowns() {
        // Find all selects marked with our class
        const selects = document.querySelectorAll('.model-select-dynamic');
        selects.forEach(sel => {
            const isFilter = sel.id.includes('filter');
            let html = isFilter ? '<option value="all">All Models</option>' : '<option value="">-- all models --</option>';
            
            KNOWN_MODELS.forEach(m => {
                html += `<option value="${m}">${m}</option>`;
            });
            sel.innerHTML = html;
        });
    }

    // Generate <option> tags for Numeric fields only (alerts usually need math)
    function getDataTypeOptions() {
        return Object.keys(DATA_DICTIONARY)
            .filter(key => DATA_DICTIONARY[key].dataType === 'numeric')
            .map(key => `<option value="${key}">${DATA_DICTIONARY[key].label}</option>`)
            .join('');
    }

    // --------------------------------------------------
    // API wrappers
    // --------------------------------------------------
    async function apiCreateAlert(payload) {
        const resp = await fetch('alerts', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.message || resp.statusText || 'Failed to create');
        return data;
    }

    async function apiGetLiveAlerts() {
        const resp = await fetch('alerts/live');
        if (!resp.ok) throw new Error('Failed to load live alerts');
        return resp.json();
    }

    async function apiDeleteAlert(id) {
        const resp = await fetch(`alerts/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.message || resp.statusText || 'Failed to delete');
        return data;
    }

    async function apiUpdateAlert(id, payload) {
        const resp = await fetch(`alerts/${encodeURIComponent(id)}`, {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.message || resp.statusText || 'Failed to update');
        return data;
    }

    // --------------------------------------------------
    // History & Pagination Logic
    // --------------------------------------------------
    
    function renderPagination(container, totalPages, currentPage, handlerFunction) {
        container.innerHTML = '';
        if (totalPages <= 1) return;

        // Prev Button
        const prevBtn = document.createElement('button');
        prevBtn.textContent = '« Prev';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => handlerFunction(currentPage - 1));
        container.appendChild(prevBtn);

        // Page Numbers
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.textContent = i;
            if (i === currentPage) pageBtn.classList.add('active');
            pageBtn.addEventListener('click', () => handlerFunction(i));
            container.appendChild(pageBtn);
        }

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next »';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => handlerFunction(currentPage + 1));
        container.appendChild(nextBtn);
    }

    function renderHistoryTable(logs) {
        alertLogBody.innerHTML = ''; // clear existing
        if (!logs || logs.length === 0) {
            alertLogBody.innerHTML = '<tr><td colspan="5">No alert history found.</td></tr>';
            return;
        }

        logs.forEach(log => {
            const newRow = document.createElement('tr');
            const createdTs = log.created ? new Date(log.created) : new Date();
            const timeString = createdTs.toLocaleString('en-CA', { hour12: true }).replace(',', '');
            const level = log.level || 'Info';
            
            newRow.innerHTML = `
                <td><span class="level-tag ${level.toLowerCase()}">${level}</span></td>
                <td class="time-cell">${timeString} <span>Eastern Standard Time</span></td>
                <td>${log.alertName || ''}</td>
                <td class="model-cell">${log.modelName || '-'}</td>
                <td class="details-cell">${log.humanRule || ''}</td>
            `;
            alertLogBody.appendChild(newRow);
        });
    }

    async function loadAlertHistory(page = 1) {
        currentHistoryPage = page;
        
        // UI Loading state
        alertLogBody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
        historyPagination.innerHTML = '';

        // Get filter values
        const level = document.getElementById('filter-level').value;
        const model = document.getElementById('filter-model').value;
        const startDate = document.getElementById('filter-start-date') ? document.getElementById('filter-start-date').value : '';
        const endDate = document.getElementById('filter-end-date') ? document.getElementById('filter-end-date').value : '';

        // Build Params
        const params = new URLSearchParams();
        params.set('page', page);
        params.set('limit', 10); // Standard limit
        if (level && level !== 'all') params.set('level', level);
        if (model && model !== 'all') params.set('modelName', model);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        try {
            const resp = await fetch(`alerts/api/history?${params.toString()}`);
            if (!resp.ok) throw new Error('Failed to fetch history');
            
            const data = await resp.json(); // { logs: [], total: X, pages: Y, page: Z }
            
            renderHistoryTable(data.logs);
            renderPagination(historyPagination, data.pages, data.page, loadAlertHistory);
        } catch (err) {
            console.error('History load error:', err);
            alertLogBody.innerHTML = `<tr><td colspan="5">Error loading history: ${err.message}</td></tr>`;
        }
    }

    // --------------------------------------------------
    // Event handlers
    // --------------------------------------------------
    async function loadLiveAlerts() {
        try {
            const data = await apiGetLiveAlerts();
            const alerts = data.alerts || [];
            renderLiveAlertsList(alerts);
        } catch (err) {
            console.error('Error loading live alerts:', err);
        }
    }

    addAlertBtn.addEventListener('click', async function () {
        const alertName = alertNameInput.value || 'New Alert';
        const alertLevel = alertLevelSelect.value;
        const modelName = modelSelect ? (modelSelect.value || null) : null;
        if (!alertLevel) { alert('Please select an alert level.'); return; }
        const ruleJSON = buildRuleJSON();
        if (!ruleJSON) return;
        const uiReadable = formatRuleReadableFromUI();
        const created = Date.now();
        try {
            const data = await apiCreateAlert({ alertName, alertLevel, alertRule: ruleJSON, created, modelName });
            await loadLiveAlerts();
            
            // Reload history to show the new alert log (if triggered immediately or just to refresh state)
            await loadAlertHistory(1);

            // Visual flash for critical alerts (based on UI selection)
            if ((data && data.alert && data.alert.alertLevel || alertLevel) === 'Critical') {
                document.body.classList.add('critical-flash');
                setTimeout(() => document.body.classList.remove('critical-flash'), 1500);
            }
            resetAlertBuilder();
        } catch (err) {
            console.error('Error creating alert:', err);
            alert('Error creating alert: ' + err.message);
        }
    });

    logicalOperatorsContainer.addEventListener('click', function (e) {
        if (e.target.classList.contains('add-rule-btn')) {
            const logicalOperator = e.target.dataset.logic;
            const newRuleRow = document.createElement('div');
            newRuleRow.className = 'rule-row';
            newRuleRow.innerHTML = createRuleRowHTML(logicalOperator);
            rulesContainer.appendChild(newRuleRow);
        }
    });

    rulesContainer.addEventListener('click', function (e) {
        if (e.target.classList.contains('delete-rule-btn')) {
            const rows = rulesContainer.querySelectorAll('.rule-row');
            if (!rows || rows.length <= 1) {
                // Prevent deleting the last remaining rule
                alert('At least one rule must remain.');
                return;
            }
            e.target.parentElement.remove();
        }
    });

    liveAlertsList.addEventListener('click', async function (e) {
        // DELETE
        if (e.target && e.target.classList.contains('delete-btn')) {
            const li = e.target.closest('li[data-id]');
            if (!li) { e.target.parentElement.remove(); return; }
            const alertId = li.getAttribute('data-id');
            try {
                await apiDeleteAlert(alertId);
                li.remove();
                delete liveAlertsCache[alertId];
            } catch (err) {
                console.error('Failed to delete alert:', err);
                alert('Failed to delete alert: ' + err.message);
            }
            return;
        }
        // EDIT
        if (e.target && e.target.classList.contains('edit-btn')) {
            const li = e.target.closest('li[data-id]');
            if (!li) return;
            const alertId = li.getAttribute('data-id');
            const alertObj = liveAlertsCache[alertId];
            if (!alertObj) { alert('Alert data not available for editing. Please reload the page.'); return; }
            startEdit(alertObj);
        }
    });

    function startEdit(alertObj) {
        if (!alertObj) return;
        currentEditId = alertObj._id;
        alertNameInput.value = alertObj.alertName || '';
        alertLevelSelect.value = alertObj.alertLevel || 'Info';
        if (modelSelect) modelSelect.value = alertObj.modelName || '';
        populateRuleBuilderFromRule(alertObj.alertRule || {});
        addAlertBtn.style.display = 'none';
        saveBtn.style.display = '';
        cancelBtn.style.display = '';
        const builderEl = document.querySelector('.alert-builder');
        if (builderEl && typeof builderEl.scrollIntoView === 'function') builderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function cancelEdit() {
        currentEditId = null;
        resetAlertBuilder();
        addAlertBtn.style.display = '';
        saveBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    }

    saveBtn.addEventListener('click', async function () {
        if (!currentEditId) return alert('No alert selected for editing');
        const alertName = alertNameInput.value || 'New Alert';
        const alertLevel = alertLevelSelect.value;
        const modelName = modelSelect ? (modelSelect.value || null) : null;
        if (!alertLevel) return alert('Please select an alert level.');
        const ruleJSON = buildRuleJSON();
        if (!ruleJSON) return;
        try {
            await apiUpdateAlert(currentEditId, { alertName, alertLevel, alertRule: ruleJSON, modelName });
            await loadLiveAlerts();
            cancelEdit();
        } catch (err) {
            console.error('Failed to save alert edits:', err);
            alert('Failed to save edits: ' + err.message);
        }
    });

    cancelBtn.addEventListener('click', function () { cancelEdit(); });

    // --------------------------------------------------
    // History Filter Events
    // --------------------------------------------------
    if (historyFilterForm) {
        historyFilterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            loadAlertHistory(1); // Reset to page 1 on filter
        });

        historyClearBtn.addEventListener('click', () => {
            historyFilterForm.reset();
            loadAlertHistory(1);
        });
    }

    // --------------------------------------------------
    // Initialization
    // --------------------------------------------------
    populateModelDropdowns();
    resetAlertBuilder();
    loadLiveAlerts();
    loadAlertHistory(1);
});