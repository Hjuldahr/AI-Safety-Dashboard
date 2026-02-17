// createAlertModal.js

import TagSelect from '../tags/tagSelect.js';

// ToDo: Move these to a constants file
export const OPERATOR_MAP = { 'gt': '$gt', 'gte': '$gte', 'lt': '$lt', 'lte': '$lte', 'eq': '$eq' };
export const OPERATOR_REVERSE_MAP = { '$gt': 'gt', '$gte': 'gte', '$lt': 'lt', '$lte': 'lte', '$eq': 'eq' };

export const initCreateAlertModal = (modalManager, options) => {
  const { tagsCache, onSaveSuccess, DATA_DICTIONARY, KNOWN_MODELS } = options;

  return async (editData = null) => {
    const currentEditId = editData ? editData._id : null;
    const title = currentEditId ? 'Edit Alert Rule' : 'Create New Alert Rule';

    // Build the body and footer nodes
    const { body, elements } = buildAlertModalBody(DATA_DICTIONARY, KNOWN_MODELS, tagsCache);

    const tagSelector = new TagSelect({
      containerId: 'modal-tags-container',
      searchInputId: 'modal-tags-search',
      dropdownId: 'modal-tags-dropdown'
    });


    // Assign the actual DOM nodes since they aren't in the document yet
    tagSelector.container = elements.tagsContainer;
    tagSelector.searchInput = elements.tagsSearch;
    tagSelector.dropdown = elements.tagsDropdown;

    await tagSelector.init();

    // Setup the save logic using our 'elements' references
    const handleSave = async () => {
      const payload = {
        alertName: elements.nameInput.value,
        alertLevel: elements.levelSelect.value,
        modelName: elements.modelSelect.value,
        alertRule: buildRuleJSON(elements.rulesContainer, DATA_DICTIONARY),
        tags: tagSelector.getSelectedIds(),
        ...(currentEditId ? {} : { created: Date.now() })
      };

      if (!payload.alertName || !payload.alertLevel || !payload.alertRule) {
        return alert('Please fill in all required fields');
      }

      try {
        if (currentEditId) await apiUpdateAlert(currentEditId, payload);
        else await apiCreateAlert(payload);

        modalManager.close();
        onSaveSuccess();
      } catch (e) {
        alert(e.message);
      }
    };

    const footer = buildAlertFooter(modalManager, handleSave, currentEditId);

    // If editing, fill the form
    if (editData) {
      elements.nameInput.value = editData.alertName;
      elements.levelSelect.value = editData.alertLevel;
      elements.modelSelect.value = editData.modelName || "";
      populateRuleBuilder(elements.rulesContainer, editData.alertRule, DATA_DICTIONARY);

      const tagIds = (editData.tags || []).map(t => t._id || t);
      tagSelector.setSelectedIds(tagIds);
    } else {
      // Default state: one empty row
      elements.rulesContainer.appendChild(createRuleRow("", DATA_DICTIONARY));
    }

    modalManager.open(title, body, footer, "large-modal");
  };
};

/**
 * Builds the main UI and returns an object 'elements' 
 * containing references to inputs for easy data retrieval.
 */
function buildAlertModalBody(DATA_DICTIONARY, KNOWN_MODELS, tagsCache) {
  const body = document.createElement('div');
  body.className = 'alert-builder-grid';

  // We store references here so we don't have to 'find' them later
  const elements = {
    rulesContainer: document.createElement('div'),
    nameInput: null,
    levelSelect: null,
    modelSelect: null,
    selectedTags: []
  };
  elements.rulesContainer.id = "rules-container";
  elements.rulesContainer.className = "rule-builder-inputs";

  // Generate HTML structure
  body.innerHTML = `
        <div class="form-group"><label>Alert Name</label><input type="text" class="name-input" placeholder="e.g. High Latency"></div>
        <div class="form-group"><label>Alert Level</label><select class="level-select"><option value="">-- Select --</option><option>Critical</option><option>High</option><option>Medium</option><option>Info</option></select></div>
        <div class="form-group"><label>Model (Optional)</label><select class="model-select"><option value="">-- All Models --</option>${KNOWN_MODELS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
        <div class="form-group full-width">
        <div class="form-group full-width"><label>Conditions</label></div>
        <label>Tags</label>
        <div class="multiselect-container">
          <div class="tags-input-container" id="modal-tags-container">
            <input type="text" id="modal-tags-search" class="tags-search-input" placeholder="Select tags..." readonly />
          </div>
          <div class="tags-dropdown" id="modal-tags-dropdown" style="display: none;"></div>
        </div>
    `;

  // Map the references
  elements.nameInput = body.querySelector('.name-input');
  elements.levelSelect = body.querySelector('.level-select');
  elements.modelSelect = body.querySelector('.model-select');
  elements.tagsContainer = body.querySelector('#modal-tags-container');
  elements.tagsSearch = body.querySelector('#modal-tags-search');
  elements.tagsDropdown = body.querySelector('#modal-tags-dropdown');

  // Add Rules Section
  const rulesSection = body.querySelectorAll('.full-width')[1];
  rulesSection.appendChild(elements.rulesContainer);

  // Logical Operators (AND/OR buttons)
  const opsContainer = document.createElement('div');
  opsContainer.className = 'logical-operators';

  ['AND', 'OR'].forEach(logic => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-secondary';
    btn.innerText = logic;

    btn.onclick = () => {
      // Validation: Check if the last row is filled out
      const rows = elements.rulesContainer.querySelectorAll('.rule-row');
      const lastRow = rows[rows.length - 1];

      if (lastRow) {
        const dataType = lastRow.querySelector('.data-type').value;
        const operator = lastRow.querySelector('.operator-type').value;
        const val = lastRow.querySelector('.value-input').value;

        if (!dataType || !operator || val === "") {
          alert("Please fill out the current rule before adding another.");
          return;
        }
      }

      elements.rulesContainer.appendChild(createRuleRow(logic, DATA_DICTIONARY));
    };

    opsContainer.appendChild(btn);
  });
  rulesSection.appendChild(opsContainer);

  return { body, elements };
}

export function createRuleRow(opLabel, DATA_DICTIONARY, readOnly = false) {
  const row = document.createElement('div');
  row.className = `rule-row ${readOnly ? 'read-only-row' : ''}`;

  const opts = Object.keys(DATA_DICTIONARY)
    .filter(k => DATA_DICTIONARY[k].dataType === 'numeric')
    .map(k => `<option value="${k}">${DATA_DICTIONARY[k].label}</option>`).join('');

  row.innerHTML = `
        <span class="logic-separator">${opLabel}</span>
        <select class="data-type" ${readOnly ? 'disabled' : ''}><option value="">-- Data --</option>${opts}</select>
        <select class="operator-type" ${readOnly ? 'disabled' : ''}>
            <option value="">-- Operator --</option>
            <option value="gt">Greater Than</option>
            <option value="gte">Greater Than or Equal To</option>
            <option value="lt">Less Than</option>
            <option value="lte">Less Than or Equal To</option>
            <option value="eq">Equal To</option>
        </select>
        <input type="number" class="value-input" ${readOnly ? 'disabled' : ''} style="width:80px;" placeholder="Value">
        ${readOnly ? '' : '<button class="btn btn-icon delete-rule-btn">&times;</button>'}
    `;

  // IF logic label is empty, it's the first row. Remove the X button.
  const deleteBtn = row.querySelector('.delete-rule-btn');
  if (deleteBtn) {
    if (!opLabel) deleteBtn.remove();
    else deleteBtn.onclick = () => row.remove();
  }

  return row;
}
function buildAlertFooter(modalManager, onSave, isEdit) {
  const footer = document.createElement('div');
  footer.className = "modal-footer-inner";

  const cancelBtn = document.createElement('button');
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.innerText = "Cancel";
  cancelBtn.onclick = () => modalManager.close();

  const saveBtn = document.createElement('button');
  saveBtn.className = "btn btn-primary";
  saveBtn.innerText = isEdit ? "Update Alert" : "Save Alert";
  saveBtn.onclick = onSave;

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);
  return footer;
}

// Helper to scrape data from the rows
function buildRuleJSON(container, DATA_DICTIONARY) {
  const rows = container.querySelectorAll('.rule-row');
  const conds = [];
  let logic = '$and';

  rows.forEach((r, i) => {
    const type = r.querySelector('.data-type').value;
    const op = r.querySelector('.operator-type').value;
    const val = r.querySelector('.value-input').value;
    const sep = r.querySelector('.logic-separator').textContent.trim();

    if (i === 1 && sep === 'OR') logic = '$or';

    if (type && op && val) {
      const dbPath = DATA_DICTIONARY[type].dbPath;
      conds.push({ [dbPath]: { [OPERATOR_MAP[op]]: parseFloat(val) } });
    }
  });

  if (conds.length === 0) return null;
  if (conds.length === 1) return conds[0];
  return { [logic]: conds };
}

export function populateRuleBuilder(container, rule, dictionary, readOnly = false) {
  container.innerHTML = '';
  let parts = [];
  let logicType = 'AND';

  // 1. Flatten the rule structure
  if (rule.$and) {
    parts = rule.$and;
    logicType = 'AND';
  } else if (rule.$or) {
    parts = rule.$or;
    logicType = 'OR';
  } else {
    parts = [rule]; // Single rule
  }

  // 2. Create rows for each part
  parts.forEach((p, i) => {
    // Find the DB field (e.g., "metrics.cpu_usage")
    const dbField = Object.keys(p).find(k => k !== 'logic');
    const inner = p[dbField];
    const mongoOp = Object.keys(inner)[0]; // e.g., "$gt"
    const val = inner[mongoOp];

    // Find the dictionary key (e.g., "cpu")
    const dictKey = Object.keys(dictionary).find(k => dictionary[k].dbPath === dbField);

    // Determine the label (AND/OR) for the row
    const label = i === 0 ? "" : (i === 1 ? logicType : "AND");

    const row = createRuleRow(label, dictionary, readOnly);

    // Populate the selects/inputs in this row
    if (dictKey) row.querySelector('.data-type').value = dictKey;
    if (OPERATOR_REVERSE_MAP[mongoOp]) {
      row.querySelector('.operator-type').value = OPERATOR_REVERSE_MAP[mongoOp];
    }
    row.querySelector('.value-input').value = val;

    container.appendChild(row);
  });

  if (parts.length === 0) {
    container.appendChild(createRuleRow("", dictionary));
  }
}

// API Helper functions - expaned to make more readable
async function apiCreateAlert(content) {
  const response = await fetch('alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content)
  });
  return await response.json();
}

async function apiUpdateAlert(id, content) {
  const response = await fetch(`alerts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(content)
  });
  return await response.json();
}