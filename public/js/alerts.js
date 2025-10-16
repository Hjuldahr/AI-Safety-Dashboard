document.addEventListener('DOMContentLoaded', function () {
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertLogBody = document.getElementById('alert-log-body');
    const liveAlertsList = document.getElementById('live-alerts-list');
    const rulesContainer = document.getElementById('rules-container');
    const logicalOperatorsContainer = document.querySelector('.logical-operators-container');
    const alertNameInput = document.getElementById('alert-name');
    const alertLevelSelect = document.getElementById('alert-level');

    addAlertBtn.addEventListener('click', function () {
        const alertName = alertNameInput.value || 'New Alert';
        const alertLevel = alertLevelSelect.value;

        if (!alertLevel) {
            alert('Please select an alert level.');
            return;
        }

        const alertDetails = getAlertDetails();
        if (!alertDetails) {
            alert('Please define at least one valid rule for the alert.');
            return;
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

    liveAlertsList.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            e.target.parentElement.remove();
        }
    });

});