document.addEventListener('DOMContentLoaded', function () {
    const addAlertBtn = document.getElementById('add-alert-btn');
    const alertLogBody = document.getElementById('alert-log-body');
    const liveAlertsList = document.getElementById('live-alerts-list');

    addAlertBtn.addEventListener('click', function () {
        const alertNameInput = document.getElementById('alert-name');
        const alertLevelSelect = document.getElementById('alert-level');
        const alertName = alertNameInput.value || 'New Alert';
        const alertLevel = alertLevelSelect.value || 'Info';

        if (!alertLevelSelect.value) {
            alert('Please select an alert level.'); // Simple alert for prototype
            return;
        }

        // 1. Add to Alert Log
        const newRow = document.createElement('tr');
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        }).replace(',', ':');
        const levelClass = alertLevel.toLowerCase();

        newRow.innerHTML = `
                    <td><span class="level-tag ${levelClass}">${alertLevel}</span></td>
                    <td class="time-cell">${timeString} <span>Eastern Standard Time</span></td>
                    <td>${alertName}</td>
                    <td class="details-cell">"New Rule" > 0</td>
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
            }, 1500); // Flash for 1.5 seconds
        }

        alertNameInput.value = '';
    });

    // Event delegation for deleting live alerts
    liveAlertsList.addEventListener('click', function (e) {
        if (e.target && e.target.classList.contains('delete-btn')) {
            e.target.parentElement.remove();
        }
    });
});