document.addEventListener('DOMContentLoaded', function () {
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertLogBody = document.getElementById('alert-log-body');
    const liveAlertsList = document.getElementById('live-alerts-list');
    const rulesContainer = document.getElementById('rules-container');
    const logicalOperatorsContainer = document.querySelector('.logical-operators-container');
    const alertNameInput = document.getElementById('alert-name');
    const alertLevelSelect = document.getElementById('alert-level');

    // Load live alerts from server on page load
    loadLiveAlerts();

    addAlertBtn.addEventListener('click', async function () {
        const alertName = alertNameInput.value || 'New Alert';
        const alertLevel = alertLevelSelect.value;

        if (!alertLevel) {
            alert('Please select an alert level.');
            return;
        }

        // Build the JSON rule for the database
        const ruleJSON = buildRuleJSON();

        // buildRuleJSON() will show its own alerts and return null if validation fails
        if (!ruleJSON) {
            return;
        }

        // Get the human-readable string for the UI log
        const alertDetails = getAlertDetails();

        const created = Date.now();
        const lastTrigger = null;
        const isActive = false;

        //pass alert to post route
        try {
            const response = await fetch('/alerts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ alertName, alertLevel, alertRule: ruleJSON, created, lastTrigger, isActive })
            });
            const data = await response.json();
            if (!response.ok) {
                console.error('Failed to create alert:', data.message);
            } else {
                // Refresh live alerts from the server
                loadLiveAlerts();
            }
        } catch (err) {
            console.error('Error creating alert:', err);
        }

        // 1. Add to Alert Log
        const newRow = document.createElement('tr');
        const now = new Date();
        const timeString = now.toLocaleString('en-CA', { hour12: true }).replace(',', '');
        const levelClass = alertLevel.toLowerCase();

        newRow.innerHTML = `
        <td><span class="level-tag ${levelClass}">${alertLevel}</span></td>
        <td class="time-cell">${timeString} <span>Eastern Standard Time</span></td>
        <td>${alertName}</td>
        <td class="details-cell">${alertDetails}</td>
    `;
        alertLogBody.prepend(newRow);

        // 2. Add to Live Alerts List
        const categoryMap = {
            'Critical': 'Critical Alerts',
            'High': 'High Alerts',
            'Medium': 'Medium Alerts',
            'Info': 'Info Alerts'
        };
        const categoryTitle = categoryMap[alertLevel];
        const h3s = liveAlertsList.getElementsByTagName('h3');
        let targetUl = null;
        for (let h3 of h3s) {
            if (h3.textContent.trim() === categoryTitle) {
                targetUl = h3.nextElementSibling;
                break;
            }
        }

        if (targetUl) {
            const newLi = document.createElement('li');
            newLi.innerHTML = `<span>${alertName}</span><button class="delete-btn">&times;</button>`;
            targetUl.appendChild(newLi);
        }

        // 3. Trigger flash effect for critical alerts
        if (alertLevel === 'Critical') {
            document.body.classList.add('critical-flash');
            setTimeout(() => {
                document.body.classList.remove('critical-flash');
            }, 1500);
        }

        // 4. Reset the form for the next entry
        resetAlertBuilder();
    });

    // Event delegation for deleting live alerts
    liveAlertsList.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            e.target.parentElement.remove();
        }
    });

    function createRuleRowHTML(logicalOperator) {
        return `
      <span class="logic-separator">${logicalOperator}</span>
      <select class="data-type">
          <option value="">-- select data type --</option>
          <option value="Harmful Messages">Harmful Messages</option>
          <option value="Accuracy">Accuracy</option>
          <option value="Usage">Usage</option>
      </select>
      <select class="operator-type">
          <option value="">-- select operator --</option>
          <option value="gt">Greater Than</option>
          <option value="gte">Greater Than or Equal To</option>
          <option value="lte">Less Than or Equal To</option>
          <option value="lt">Less Than</option>
      </select>
      <input type="text" placeholder="value" class="value-input">
      <button class="delete-rule-btn">&times;</button>
    `;
    }

    function getAlertDetails() {
        const ruleRows = rulesContainer.querySelectorAll('.rule-row');
        let detailsParts = [];
        const operatorMap = { gt: 'greater than', gte: 'greater than or equal to', lt: 'less than', lte: 'less than or equal to' };

        ruleRows.forEach((row, index) => {
            const dataTypeSelect = row.querySelector('.data-type');
            const operatorSelect = row.querySelector('.operator-type');
            const valueInput = row.querySelector('.value-input');
            const logicalOperatorSpan = row.querySelector('.logic-separator');

            const dataType = dataTypeSelect.value;
            const operatorValue = operatorSelect.value;
            const value = valueInput.value;

            // Only add the rule part if all fields are filled
            if (dataType && operatorValue && value) {
                let ruleText = '';
                // Add the logical operator (AND/OR) if it's not the first rule
                if (index > 0 && logicalOperatorSpan) {
                    ruleText += ` ${logicalOperatorSpan.textContent} `;
                }
                ruleText += `"${dataType}" ${operatorMap[operatorValue]} ${value}`;
                detailsParts.push(ruleText);
            }
        });

        return detailsParts.join('').trim() + '.';
    }

    /**
     * Builds a MongoDB-style query object from the rule builder UI.
     */
    function buildRuleJSON() {
        const ruleRows = rulesContainer.querySelectorAll('.rule-row');
        const conditions = [];

        // Map UI display names to the database field names
        const fieldMap = {
            'Harmful Messages': 'harmfulMessages',
            'Accuracy': 'accuracy',
            'Usage': 'usage'
        };

        // Map UI operator values to MongoDB operator keys
        const operatorMap = {
            'gt': '$gt',
            'gte': '$gte',
            'lt': '$lt',
            'lte': '$lte'
        };

        let firstLogicOperator = null;
        let hasIncompleteRow = false;

        ruleRows.forEach((row, index) => {
            const dataTypeSelect = row.querySelector('.data-type');
            const operatorSelect = row.querySelector('.operator-type');
            const valueInput = row.querySelector('.value-input');
            const logicalOperatorSpan = row.querySelector('.logic-separator');

            const dataType = dataTypeSelect.value;
            const operatorValue = operatorSelect.value;
            const rawValue = valueInput.value;

            // 1. Determine the top-level operator ($and or $or)
            // We assume the *first* logical operator found (on the 2nd+ rule)
            // dictates the wrapper for ALL rules.
            if (index > 0 && logicalOperatorSpan && !firstLogicOperator) {
                firstLogicOperator = logicalOperatorSpan.textContent.trim().toLowerCase() === 'and' ? '$and' : '$or';
            }

            // 2. Validate and build the condition
            
            // Only process rows that are fully filled out
            if (dataType && operatorValue && rawValue) {
                const dbField = fieldMap[dataType];
                const mongoOperator = operatorMap[operatorValue];
                
                // Try to parse the value as a number
                const numericValue = parseFloat(rawValue);

                if (!dbField || !mongoOperator || isNaN(numericValue)) {
                    // This rule is filled but has invalid data (e.g., "abc" for a value)
                    alert(`Invalid data in rule ${index + 1}. Please ensure value is a number.`);
                    hasIncompleteRow = true; // Mark as error
                    return;
                }

                // Build the individual condition object: e.g., { "usage": { "$gt": 20 } }
                const condition = {};
                condition[dbField] = {};
                condition[dbField][mongoOperator] = numericValue;
                
                conditions.push(condition);

            } else if (dataType || operatorValue || rawValue) {
                // Row is *partially* filled, which is an error
                hasIncompleteRow = true;
            }
        });

        // 3. Check for errors
        if (hasIncompleteRow) {
            alert('Please fill out all fields for every rule, or remove incomplete rules.');
            return null;
        }

        if (conditions.length === 0) {
            alert('Please define at least one valid rule for the alert.');
            return null;
        }

        // 4. Assemble the final rule object
        if (conditions.length === 1) {
            // Only one rule, no top-level $and/$or needed
            return conditions[0];
        } else {
            // More than one rule, wrap them in $and or $or
            // Default to $and if for some reason firstLogicOperator is still null
            const topLevelOperator = firstLogicOperator || '$and';
            
            const finalRule = {};
            finalRule[topLevelOperator] = conditions;
            return finalRule;
        }
    }

    function resetAlertBuilder() {
        alertNameInput.value = '';
        alertLevelSelect.selectedIndex = 0;
        // Remove all but the first rule row
        while (rulesContainer.children.length > 1) {
            rulesContainer.removeChild(rulesContainer.lastChild);
        }
        // Reset the fields in the first rule row
        const firstRuleRow = rulesContainer.querySelector('.rule-row');
        if (firstRuleRow) {
            firstRuleRow.querySelector('.data-type').selectedIndex = 0;
            firstRuleRow.querySelector('.operator-type').selectedIndex = 0;
            firstRuleRow.querySelector('.value-input').value = '';
        }
    }

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
            e.target.parentElement.remove();
        }
    });

    // Handle delete clicks for live alerts (delegated)
    liveAlertsList.addEventListener('click', async function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            const li = e.target.closest('li[data-id]');
            if (!li) {
                // fallback: just remove DOM node
                e.target.parentElement.remove();
                return;
            }
            const alertId = li.getAttribute('data-id');
            try {
                const resp = await fetch(`/alerts/${encodeURIComponent(alertId)}`, { method: 'DELETE' });
                if (!resp.ok) {
                    const body = await resp.json().catch(() => ({}));
                    throw new Error(body.message || 'Failed to delete');
                }
                // remove the li from DOM
                li.remove();
            } catch (err) {
                console.error('Failed to delete alert:', err);
                alert('Failed to delete alert: ' + err.message);
            }
        }
    });

    // Fetch and render live alerts
    async function loadLiveAlerts() {
        try {
            const resp = await fetch('/alerts/live');
            if (!resp.ok) {
                console.error('Failed to load live alerts');
                return;
            }
            const data = await resp.json();
            const alerts = data.alerts || [];

            const categories = { Critical: [], High: [], Medium: [], Info: [] };
            alerts.forEach(a => {
                const lvl = a.alertLevel || 'Info';
                if (!categories[lvl]) categories[lvl] = [];
                categories[lvl].push(a);
            });

            // Build the list HTML
            const order = ['Critical', 'High', 'Medium', 'Info'];
            let html = '';
            order.forEach(level => {
                const items = (categories[level] || []).map(a => `<li data-id="${a._id}"><span>${a.alertName}</span><button class="delete-btn">&times;</button></li>`).join('');
                const cls = level.toLowerCase();
                html += `<li><h3 class="alert-category ${cls}"><span class="color-dot"></span>${level} Alerts</h3><ul class="alert-items">${items}</ul></li>`;
            });

            liveAlertsList.innerHTML = html;
        } catch (err) {
            console.error('Error loading live alerts:', err);
        }
    }
});