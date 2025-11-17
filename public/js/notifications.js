document.addEventListener('DOMContentLoaded', () => {

    // Notification Bell & History Logic

    // Fetch recent alert logs from server
    const fetchRecentAlerts = async (limit = 10) => {
        try {
            const resp = await fetch(`/alerts/recent?limit=${limit}`);
            if (!resp.ok) return [];
            const data = await resp.json();
            // expect data.alertLogs array with { level, timestamp, alertName, humanRule }
            return Array.isArray(data.alertLogs) ? data.alertLogs : [];
        } catch (e) {
            console.error('Failed to fetch recent alerts for notifications:', e);
            return [];
        }
    };

    // Select DOM Elements
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');

    // Function to populate the alert history list from data
    const populateAlertHistory = async () => {
        historyContainer.innerHTML = ''; // Clear existing content

        // Add a header
        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Alerts';
        historyContainer.appendChild(header);

        // Create the list
        const list = document.createElement('ul');
        const alerts = await fetchRecentAlerts(10);
        alerts.forEach(alert => {
            const listItem = document.createElement('li');
            const level = (alert.level || 'Info').toString().toLowerCase();
            listItem.className = `notification-history-item ${level}`;

            // Create the link element
            const link = document.createElement('a');
            link.href = '/alerts';

            // Create a span for the alert text: prefer humanRule then alertName
            const alertText = document.createElement('span');
            alertText.className = 'alert-text';
            alertText.textContent = alert.humanRule || alert.alertName || 'Alert';

            // Create a span for the timestamp
            const alertTime = document.createElement('span');
            alertTime.className = 'alert-time';
            const ts = alert.timestamp ? new Date(alert.timestamp) : new Date();
            alertTime.textContent = formatAlertTime(ts);

            // Append text and time to the link, then link to the list item
            link.appendChild(alertText);
            link.appendChild(alertTime);
            listItem.appendChild(link);
            list.appendChild(listItem);
        });

        historyContainer.appendChild(list);
    };

    //  Event Listener to toggle the history list visibility
    bellButton.addEventListener('click', (event) => {
        // Stop the click from bubbling up to the document, which would instantly close the list
        event.stopPropagation();
        historyContainer.classList.toggle('show');
    });

    //  Event Listener to close the list when clicking anywhere else on the page
    document.addEventListener('click', () => {
        if (historyContainer.classList.contains('show')) {
            historyContainer.classList.remove('show');
        }
    });

    const formatAlertTime = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');

        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // The hour '0' should be '12'

        return `${year}/${month}/${day}: ${hours}:${minutes}:${seconds}${ampm}`;
    }

    populateAlertHistory();

});