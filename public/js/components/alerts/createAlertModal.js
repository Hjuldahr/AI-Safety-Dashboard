// createAlertModal.js

const alertModal = document.getElementById('alert-modal');
const modalTitle = document.getElementById('modal-title');
const logicalOperatorsContainer = document.querySelector('.logical-operators-container');

// OPERATORS (Includes 'eq' / Equal To)
// ToDo: Move this to a constants file
const OPERATOR_MAP = { 'gt': '$gt', 'gte': '$gte', 'lt': '$lt', 'lte': '$lte', 'eq': '$eq' };
const OP_REVERSE_MAP = { '$gt': 'gt', '$gte': 'gte', '$lt': 'lt', '$lte': 'lte', '$eq': 'eq' };

export const initCreateAlertModal = (modalManager, options) => {
    const { tagsCache, onSaveSuccess, DATA_DICTIONARY, KNOWN_MODELS } = options;
    let currentEditId = null;
    let selectedTags = [];

    const content = getModalHTML();
    const footer = getFooterHTML();

    // Return an "Open" function
    return (editData = null) => {
        currentEditId = editData ? editData._id : null;
        const title = currentEditId ? 'Edit Alert Rule' : 'Create New Alert Rule';

        modalManager.open(title, content, footer, "large-modal", () => {
            attachListeners();
            if (editData) {
                fillEditAlertForm();
            } else {
                fillCreateAlertForm();
            }
        });
    };
};

function getModalHTML() {
    // ToDo: Write this method

    return "";
}

function getFooterHTML() {
    return `
        <button class="btn btn-secondary close-modal-btn">Cancel</button>
        <button id="save-alert-btn" class="btn btn-primary">Save Alert</button>
    `;
}

function attachListeners() {
    const saveBtn = document.getElementById('save-alert-btn');

    saveBtn.addEventListener('click', async () => {
        // Validate, build JSON, call API
        // On success: 
        // modalManager.close();
        // onSaveSuccess();
    });

    // ToDo: Add listeners for "Add Rule", "Delete Rule", "Tag Selection"
};

// Old Alerts.js Methods
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
    if (modelSelect) modelSelect.value = '';
    rulesContainer.innerHTML = ''; addEmptyRuleRow();
    selectedTags.length = 0; renderTagInput();
}

// --- 5. RULE BUILDER ---

function createRuleRowHTML(op) {
    const del = op ? '<button class="btn btn-secondary btn-icon delete-rule-btn">&times;</button>' : '';
    const opts = Object.keys(DATA_DICTIONARY).filter(k => DATA_DICTIONARY[k].dataType === 'numeric')
        .map(k => `<option value="${k}">${DATA_DICTIONARY[k].label}</option>`).join('');

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
    const d = document.createElement('div'); d.className = 'rule-row'; d.innerHTML = createRuleRowHTML('');
    rulesContainer.appendChild(d);
}

// these need to be run once the modal exists in the DOM

// logicalOperatorsContainer.addEventListener('click', e => {
//     if (e.target.classList.contains('add-rule-btn')) {
//         const d = document.createElement('div'); d.className = 'rule-row';
//         d.innerHTML = createRuleRowHTML(e.target.dataset.logic);
//         rulesContainer.appendChild(d);
//     }
// });

// rulesContainer.addEventListener('click', e => {
//     if (e.target.classList.contains('delete-rule-btn')) e.target.closest('.rule-row').remove();
// });

// saveAlertBtn.addEventListener('click', async () => {
//     const name = alertNameInput.value, level = alertLevelSelect.value, rule = buildRuleJSON();
//     if (!name || !level || !rule) return alert('Fill required fields');
//     const payload = { alertName: name, alertLevel: level, alertRule: rule, modelName: modelSelect.value, tags: selectedTags };
//     try {
//         if (currentEditId) await apiUpdateAlert(currentEditId, payload);
//         else { payload.created = Date.now(); await apiCreateAlert(payload); }
//         closeBuilder(); await loadLiveAlerts(); await loadAlertHistory(1);
//     } catch (e) { alert(e.message); }
// });

function buildRuleJSON() {
    const rows = rulesContainer.querySelectorAll('.rule-row');
    const conds = []; let logic = null; let valid = true;
    rows.forEach((r, i) => {
        const type = r.querySelector('.data-type').value;
        const op = r.querySelector('.operator-type').value;
        const val = r.querySelector('.value-input').value;
        const sep = r.querySelector('.logic-separator');
        if (i > 0 && sep && !logic) logic = sep.textContent.trim() === 'AND' ? '$and' : '$or';
        if (type && op && val) {
            const c = {}; c[DATA_DICTIONARY[type].dbPath] = {}; c[DATA_DICTIONARY[type].dbPath][OPERATOR_MAP[op]] = parseFloat(val);
            conds.push(c);
        } else valid = false;
    });
    if (!valid || conds.length === 0) return null;
    if (conds.length === 1) return conds[0];
    const f = {}; f[logic || '$and'] = conds;
    return f;
}

function populateRuleBuilderFromRule(rule) {
    let parts = [];
    if (rule.$and) parts = rule.$and.map(x => ({ ...x, logic: 'AND' }));
    else if (rule.$or) parts = rule.$or.map(x => ({ ...x, logic: 'OR' }));
    else parts = [{ ...rule, logic: '' }];

    parts.forEach((p, i) => {
        const dbField = Object.keys(p).find(k => k !== 'logic');
        const inner = p[dbField];
        const mongoOp = Object.keys(inner)[0];
        const val = inner[mongoOp];
        const dictKey = Object.keys(DATA_DICTIONARY).find(k => DATA_DICTIONARY[k].dbPath === dbField);

        const row = document.createElement('div');
        row.className = 'rule-row';
        row.innerHTML = createRuleRowHTML(i > 0 ? (i === 1 ? (rule.$and ? 'AND' : 'OR') : 'AND') : '');
        if (dictKey) row.querySelector('.data-type').value = dictKey;
        if (OP_REVERSE_MAP[mongoOp]) row.querySelector('.operator-type').value = OP_REVERSE_MAP[mongoOp];
        row.querySelector('.value-input').value = val;
        rulesContainer.appendChild(row);
    });
    if (parts.length === 0) addEmptyRuleRow();
}

// --- Hard Coded HTML Strings / String Creator Functions ---
// Keep these seperate for code readability / fututure editing.
const modalHTML = () => {
    return `
    <div class="modal-content large-modal">
        <div class="modal-header">
          <h2 id="modal-title">Create New Alert</h2>
          <button class="close-modal-btn">&times;</button>
        </div>

        <div class="modal-body">
          <div class="alert-builder-grid">
            <div class="form-group">
              <label for="alert-name">Alert Name</label>
              <input type="text" id="alert-name" placeholder="e.g. High Latency Check" />
            </div>

            <div class="form-group">
              <label for="alert-level">Alert Level</label>
              <select id="alert-level">
                <option value="">-- Select --</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Info">Info</option>
              </select>
            </div>

            <div class="form-group">
              <label for="model-name">Model (Optional)</label>
              <select id="model-name" class="model-select-dynamic"></select>
            </div>

            <div class="form-group full-width">
              <label>Alert Rule Condition</label>
              <div class="rule-builder-inputs" id="rules-container"></div>
              <div class="logical-operators-container">
                <span class="rule-builder-note">(add another part to the rule)</span>
                <div class="logical-operators">
                  <button class="btn btn-sm btn-secondary add-rule-btn" data-logic="AND">
                    AND
                  </button>
                  <button class="btn btn-sm btn-secondary add-rule-btn" data-logic="OR">
                    OR
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group full-width tags-section">
              <label>Assign Tags</label>
              <div class="multiselect-container" id="tags-multiselect">
                <div class="tags-input-container" id="tags-input-container">
                  <input type="text" id="tags-search-input" class="tags-search-input" placeholder="Select tags..." readonly />
                </div>
                <div class="tags-dropdown" id="tags-dropdown-list" style="display: none"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary close-modal-btn">Cancel</button>
          <button id="save-alert-btn" class="btn btn-primary">
            Save Alert
          </button>
        </div>
      </div>
    `;
}