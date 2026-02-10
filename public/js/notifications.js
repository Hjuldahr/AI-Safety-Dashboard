import doc from "pdfkit";

let isBannerVisible = false;

document.addEventListener('DOMContentLoaded', () => {
    //reference: https://github.com/ohly0001/CST8414-Applied-Research-Project/blob/Robert-II/public/js/motd.js 
    
    const banner = document.getElementById('notificationBanner');

    const appear = () => {
        banner.classList.remove('hidden');
        banner.animate([
            { transform: "translateX(300px)" },
            { transform: "translateX(0px)" }
        ], {
            duration: 1000,
            iterations: 1
        });
    };
    const disappear = () => {
        banner.animate([
            { transform: "translateX(-300px)" },
            { transform: "translateX(0px)" }
        ], {
            duration: 1000,
            iterations: 1
        });
        banner.classList.add('hidden');
    };

    banner.addEventListener('click', () => {
        //Navigate to Alert
    })

    //click anywhere but the banner
    document.body.addEventListener('click', () => {
        if (isBannerVisible) {
            disappear();
            isBannerVisible = false;
        }
    })

    const evtSource = new EventSource("/events");
    evtSource.addEventListener("notifications", (event) => {
        try {
            const json = JSON.parse(event.data);

            // Reset dismissal only when a NEW message arrives
            localStorage.setItem("notificationDismissed", "false");

            updateBanner(json);
        } catch (err) {
        console.error("Error processing SSE message:", err);
        }
    });
    evtSource.onerror = () => {
        console.warn("SSE disconnected.");
        evtSource.close();
    };

    //TODO

    /*
    // Notification Bell & History Logic

    // Fetch recent alert logs from server
    const fetchRecentAlerts = async (limit = 10) => {
        try {
            // Use the new paginated history API to fetch the most recent logs
            const params = new URLSearchParams({ page: '1', limit: String(limit) });
            const resp = await fetch(`alerts/api/history?${params.toString()}`);
            if (!resp.ok) return [];
            const data = await resp.json();
            // data.logs is an array of { level, timestamp, alertName, modelName, humanRule }
            return Array.isArray(data.logs) ? data.logs : [];
        } catch (e) {
            console.error('Failed to fetch recent alerts for notifications:', e);
            return [];
        }
    };

    // Select DOM Elements
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');
    const badgeEl = document.getElementById('notification-badge');

    // Server-driven unread count helpers
    const fetchUnreadCount = async () => {
        try {
            const resp = await fetch('alerts/unread-count');
            if (!resp.ok) return 0;
            const data = await resp.json();
            return Number(data && data.unread ? data.unread : 0);
        } catch (e) {
            console.error('Failed to fetch unread count:', e);
            return 0;
        }
    };

    const updateBadgeFromCount = (unread) => {
        try {
            if (!badgeEl) return;
            if (unread > 0) {
                badgeEl.textContent = unread > 99 ? '99+' : String(unread);
                badgeEl.classList.add('show');
            } else {
                badgeEl.textContent = '';
                badgeEl.classList.remove('show');
            }
        } catch (e) {
            console.error('Failed to update notification badge:', e);
        }
    };

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

        // Update badge from server unread count
        try {
            const unread = await fetchUnreadCount();
            updateBadgeFromCount(unread);
        } catch (e) {
            // ignore
        }

        alerts.forEach(alert => {
            const listItem = document.createElement('li');
            const level = (alert.level || 'Info').toString().toLowerCase();
            listItem.className = `notification-history-item ${level}`;

            // Create the link element
            const link = document.createElement('a');
            link.href = 'alerts';

            // Create a span for the alert text: prefer humanRule then alertName
            const alertText = document.createElement('span');
            alertText.className = 'alert-text';
            // Include model name if present to clarify which model triggered the alert
            const modelPart = alert.modelName ? `[${alert.modelName}] ` : '';
            alertText.textContent = modelPart + (alert.humanRule || alert.alertName || 'Alert');

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
    bellButton.addEventListener('click', async (event) => {
        // Stop the click from bubbling up to the document, which would instantly close the list
        event.stopPropagation();

        const willShow = !historyContainer.classList.contains('show');
        if (willShow) {
            // Populate and then mark as read
            await populateAlertHistory();
            historyContainer.classList.add('show');
            // Mark read on server
            try {
                await fetch('alerts/mark-read', { method: 'POST' });
            } catch (e) {
                console.error('Failed to mark alerts read on server:', e);
            }
            // clear badge UI
            updateBadgeFromCount(0);
        } else {
            historyContainer.classList.remove('show');
        }
    });

    //  Event Listener to close the list when clicking anywhere else on the page
    document.addEventListener('click', () => {
        if (historyContainer.classList.contains('show')) {
            historyContainer.classList.remove('show');
        }
    });

    // Initial badge population on load using server unread count
    (async () => {
        try {
            const unread = await fetchUnreadCount();
            updateBadgeFromCount(unread);
        } catch (e) {
            console.error('Failed initial fetch for unread count:', e);
        }
    })();

    // Setup SSE to receive live alert events and refresh unread count
    let __notificationsEvtSource = null;
    try {
        __notificationsEvtSource = new EventSource('events');
        __notificationsEvtSource.addEventListener('alert', async (ev) => {
            // When an alert arrives, refresh unread count
            try {
                const unread = await fetchUnreadCount();
                updateBadgeFromCount(unread);
            } catch (e) {
                console.error('Failed to refresh unread count after alert event:', e);
            }
        });
        __notificationsEvtSource.onerror = (err) => console.error('SSE error (notifications):', err);
    } catch (e) {
        console.error('Failed to setup EventSource for notifications:', e);
    }

    // Close SSE when the page unloads to avoid lingering connections
    window.addEventListener('beforeunload', () => {
        try {
            if (__notificationsEvtSource) {
                __notificationsEvtSource.close();
                __notificationsEvtSource = null;
            }
        } catch (e) {
            // ignore
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
    */
});