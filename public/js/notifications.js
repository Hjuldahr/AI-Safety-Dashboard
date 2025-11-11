document.addEventListener('DOMContentLoaded', () => {

    // Notification Bell & History Logic

    // Mock Data for recent alerts
    const mockAlerts = [
        {
            level: 'Critical',
            text: '"Policy Compliance" less than 80, and "Response Helpfulness" less than 3.',
            timestamp: new Date('2025-10-15T22:25:15Z') // Using ISO format with Z for UTC
        },
        {
            level: 'Info',
            text: '"Energy Consumption" greater than 100W.',
            timestamp: new Date('2025-10-15T22:25:11Z')
        },
        {
            level: 'High',
            text: '"Policy Compliance" less than 85, and "Response Helpfulness" less than 4.',
            timestamp: new Date('2025-10-15T22:24:30Z')
        },
        {
            level: 'High',
            text: '"Response Time" greater than 1000, and "Response Helpfulness" less than 2.',
            timestamp: new Date('2025-10-15T22:22:05Z')
        },
        {
            level: 'Medium',
            text: '"Energy Consumption" greater than 200W.',
            timestamp: new Date('2025-10-15T21:55:45Z')
        },
    ];

    // Select DOM Elements
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');

    // Function to populate the alert history list from data
    const populateAlertHistory = () => {
        historyContainer.innerHTML = ''; // Clear existing content

        // Add a header
        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Alerts';
        historyContainer.appendChild(header);

        // Create the list
        const list = document.createElement('ul');
        mockAlerts.forEach(alert => {
            const listItem = document.createElement('li');
            listItem.className = `notification-history-item ${alert.level.toLowerCase()}`;

            // Create the link element
            const link = document.createElement('a');
            link.href = '/alerts';

            // Create a span for the alert text
            const alertText = document.createElement('span');
            alertText.className = 'alert-text';
            alertText.textContent = alert.text;

            // Create a span for the timestamp
            const alertTime = document.createElement('span');
            alertTime.className = 'alert-time';
            alertTime.textContent = formatAlertTime(alert.timestamp);

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