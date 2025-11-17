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

    // --------------------------------------------------
    // Config / constant mappings
    // --------------------------------------------------
    const FIELD_MAP = {
        'Policy Compliance': 'policyCompliance',
        'Response Helpfulness': 'responseHelpfulness',
        'Response Time': 'responseTime',
        'Energy Consumption': 'energyConsumption'
    };

    const REVERSE_FIELD_MAP = {
        'policyCompliance': 'Policy Compliance',
        'responseHelpfulness': 'Response Helpfulness',
        'responseTime': 'Response Time',
        'energyConsumption': 'Energy Consumption'
    };

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
        // Only include a delete button for non-first rows (logicalOperator set for 2nd+ rows)
        const deleteBtn = logicalOperator ? '<button class="delete-rule-btn">&times;</button>' : '';
        return `
      <span class="logic-separator">${logicalOperator}</span>
      <select class="data-type">
          <option value="">-- select data type --</option>
          <option value="Policy Compliance">Policy Compliance</option>
          <option value="Response Helpfulness">Response Helpfulness</option>
          <option value="Response Time">Response Time</option>
          <option value="Energy Consumption">Energy Consumption</option>
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

            const dataType = dataTypeSelect ? dataTypeSelect.value : '';
            const operatorValue = operatorSelect ? operatorSelect.value : '';
            const rawValue = valueInput ? valueInput.value : '';

            if (index > 0 && logicalOperatorSpan && !firstLogicOperator) {
                firstLogicOperator = logicalOperatorSpan.textContent.trim().toLowerCase() === 'and' ? '$and' : '$or';
            }

            if (dataType && operatorValue && rawValue) {
                const dbField = FIELD_MAP[dataType];
                const mongoOperator = OPERATOR_MAP[operatorValue];
                const numericValue = parseFloat(rawValue);
                if (!dbField || !mongoOperator || Number.isNaN(numericValue)) {
                    alert(`Invalid data in rule ${index + 1}. Please ensure value is a number.`);
                    hasIncompleteRow = true;
                    return;
                }
                const condition = {};
                condition[dbField] = {};
                condition[dbField][mongoOperator] = numericValue;
                conditions.push(condition);
            } else if (dataType || operatorValue || rawValue) {
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
            const dataType = dataTypeSelect ? dataTypeSelect.value : '';
            const operatorValue = operatorSelect ? operatorSelect.value : '';
            const value = valueInput ? valueInput.value : '';
            if (dataType && operatorValue && value) {
                const prefix = (index > 0 && logicalOperatorSpan) ? ` ${logicalOperatorSpan.textContent} ` : '';
                parts.push(prefix + `"${dataType}" ${OPERATOR_READABLE[operatorValue]} ${value}`);
            }
        });
        return parts.join('').trim() + '.';
    }

    function resetAlertBuilder() {
        alertNameInput.value = '';
        alertLevelSelect.selectedIndex = 0;
        if (modelSelect) modelSelect.selectedIndex = 0;
        while (rulesContainer.children.length > 1) rulesContainer.removeChild(rulesContainer.lastChild);
        const firstRuleRow = rulesContainer.querySelector('.rule-row');
        if (firstRuleRow) {
            const dt = firstRuleRow.querySelector('.data-type');
            const op = firstRuleRow.querySelector('.operator-type');
            const val = firstRuleRow.querySelector('.value-input');
            if (dt) dt.selectedIndex = 0;
            if (op) op.selectedIndex = 0;
            if (val) val.value = '';
            const delBtn = firstRuleRow.querySelector('.delete-rule-btn');
            if (delBtn) delBtn.remove();
        }
    }

    function populateRuleBuilderFromRule(ruleObj) {
        while (rulesContainer.firstChild) rulesContainer.removeChild(rulesContainer.firstChild);
        let parts = [];
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
            const displayField = REVERSE_FIELD_MAP[dbField] || dbField;
            const operator = OP_REVERSE_MAP[opKey] || 'gt';
            const logic = idx > 0 ? (ruleObj && ruleObj.$or ? 'OR' : 'AND') : '';
            const newRuleRow = document.createElement('div');
            newRuleRow.className = 'rule-row';
            newRuleRow.innerHTML = createRuleRowHTML(logic);
            rulesContainer.appendChild(newRuleRow);
            const dataTypeSelect = newRuleRow.querySelector('.data-type');
            const operatorSelect = newRuleRow.querySelector('.operator-type');
            const valueInput = newRuleRow.querySelector('.value-input');
            if (dataTypeSelect) dataTypeSelect.value = displayField;
            if (operatorSelect) operatorSelect.value = operator;
            if (valueInput) valueInput.value = val;
        });
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

    function prependAlertLogRow(serverAlert, humanRule) {
        const newRow = document.createElement('tr');
        const createdTs = serverAlert && serverAlert.created ? new Date(serverAlert.created) : new Date();
        const timeString = formatTimeISO(createdTs);
        const level = (serverAlert && serverAlert.alertLevel) || 'Info';
        const levelClass = level.toLowerCase();
        newRow.innerHTML = `
            <td><span class="level-tag ${levelClass}">${(serverAlert && serverAlert.alertLevel) || level}</span></td>
            <td class="time-cell">${timeString} <span>Eastern Standard Time</span></td>
            <td>${(serverAlert && serverAlert.alertName) || ''}</td>
            <td class="model-cell">${(serverAlert && (serverAlert.modelName || serverAlert.alertSnapshot && serverAlert.alertSnapshot.modelName)) || '-'}</td>
            <td class="details-cell">${humanRule || ''}</td>
        `;
        alertLogBody.prepend(newRow);
    }

    // --------------------------------------------------
    // API wrappers
    // --------------------------------------------------
    async function apiCreateAlert(payload) {
        const resp = await fetch('/alerts/create', {
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
        const resp = await fetch('/alerts/live');
        if (!resp.ok) throw new Error('Failed to load live alerts');
        return resp.json();
    }

    async function apiDeleteAlert(id) {
        const resp = await fetch(`/alerts/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'same-origin' });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.message || resp.statusText || 'Failed to delete');
        return data;
    }

    async function apiUpdateAlert(id, payload) {
        const resp = await fetch(`/alerts/${encodeURIComponent(id)}`, {
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
    // Initialization
    // --------------------------------------------------
    loadLiveAlerts();
});