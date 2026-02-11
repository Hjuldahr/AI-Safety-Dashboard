// notification.js
document.addEventListener('DOMContentLoaded', () => {

    ////////////////////////////////////////////////////////////
    // CONFIG
    ////////////////////////////////////////////////////////////

    const API = {
        latest: '/api/notifications/latest',
        history: '/api/notifications/history',
        unreadCount: '/api/notifications/unread',
        markRead: '/api/notifications/mark-read',
        events: '/events'
    };

    ////////////////////////////////////////////////////////////
    // SLIDE NOTIFICATION UI
    ////////////////////////////////////////////////////////////

    let currentNotification = null;
    let dismissTimer = null;

    const container = document.createElement('div');
    container.id = 'global-notification';
    container.className = 'notification-slide hidden';
    document.body.appendChild(container);

    const content = document.createElement('div');
    content.className = 'notification-content';
    container.appendChild(content);

    ////////////////////////////////////////////////////////////
    // HELPERS
    ////////////////////////////////////////////////////////////

    const safeJSON = async (resp) => {
        try { return await resp.json(); } catch { return null; }
    };

    const fetchLatestNotification = async () => {
        try {
            const resp = await fetch(API.latest);
            if (!resp.ok) return null;
            return await safeJSON(resp);
        } catch (e) {
            console.error('Failed to fetch latest notification:', e);
            return null;
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const resp = await fetch(API.unreadCount);
            if (!resp.ok) return 0;
            const json = await safeJSON(resp);
            return Number(json?.unread || 0);
        } catch {
            return 0;
        }
    };

    ////////////////////////////////////////////////////////////
    // SHOW / HIDE NOTIFICATION
    ////////////////////////////////////////////////////////////

    const hideNotification = () => {
        container.classList.remove('show');
        container.classList.add('hidden');

        if (dismissTimer) {
            clearTimeout(dismissTimer);
            dismissTimer = null;
        }

        currentNotification = null;
    };

    const showNotification = (notif) => {
        if (!notif || !notif.message) return;

        currentNotification = notif;
        content.textContent = notif.message;

        container.style.background = notif.background || '';
        container.classList.remove('hidden');

        container.offsetHeight; // force reflow for animation
        container.classList.add('show');

        if (dismissTimer) clearTimeout(dismissTimer);

        if (notif.timeout && notif.dismissible !== false) {
            dismissTimer = setTimeout(() => {
                hideNotification();
            }, notif.timeout * 1000);
        }
    };

    ////////////////////////////////////////////////////////////
    // CLICK BEHAVIOUR
    ////////////////////////////////////////////////////////////

    container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentNotification) return;

        if (currentNotification.redirectUrl) {
            window.location.href = currentNotification.redirectUrl;
            return;
        }

        if (currentNotification.dismissible !== false) hideNotification();
    });

    document.body.addEventListener('click', (e) => {
        if (!currentNotification) return;
        if (container.contains(e.target)) return;
        if (currentNotification.dismissible === false) return;

        hideNotification();
    });

    ////////////////////////////////////////////////////////////
    // NOTIFICATION BELL + HISTORY
    ////////////////////////////////////////////////////////////

    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');
    const badgeEl = document.getElementById('notification-badge');

    const updateBadge = (unread) => {
        if (!badgeEl) return;
        if (unread > 0) {
            badgeEl.textContent = unread > 99 ? '99+' : String(unread);
            badgeEl.classList.add('show');
        } else {
            badgeEl.textContent = '';
            badgeEl.classList.remove('show');
        }
    };

    const fetchHistory = async (limit = 10) => {
        try {
            const params = new URLSearchParams({ page: '1', limit: String(limit) });
            const resp = await fetch(`${API.history}?${params}`);
            if (!resp.ok) return [];
            const data = await safeJSON(resp);
            return Array.isArray(data?.notifications) ? data.notifications : [];
        } catch (e) {
            console.error('Failed to fetch history:', e);
            return [];
        }
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleString();
    };

    const populateHistory = async () => {
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Notifications';
        historyContainer.appendChild(header);

        const list = document.createElement('ul');
        const logs = await fetchHistory(10);

        logs.forEach(n => {
            const li = document.createElement('li');
            li.className = 'notification-history-item';

            const link = document.createElement('a');
            link.href = n.redirectUrl || '#';

            const text = document.createElement('span');
            text.className = 'alert-text';
            text.textContent = n.message || 'Notification';

            const time = document.createElement('span');
            time.className = 'alert-time';
            time.textContent = formatTime(n.createdAt || Date.now());

            link.appendChild(text);
            link.appendChild(time);
            li.appendChild(link);
            list.appendChild(li);
        });

        historyContainer.appendChild(list);

        const unread = await fetchUnreadCount();
        updateBadge(unread);
    };

    if (bellButton && historyContainer) {
        bellButton.addEventListener('click', async (e) => {
            e.stopPropagation();

            const willShow = !historyContainer.classList.contains('show');
            if (willShow) {
                await populateHistory();
                historyContainer.classList.add('show');

                try { await fetch(API.markRead, { method: 'POST' }); } catch {}
                updateBadge(0);
            } else {
                historyContainer.classList.remove('show');
            }
        });

        document.addEventListener('click', () => {
            historyContainer.classList.remove('show');
        });
    }

    ////////////////////////////////////////////////////////////
    // INITIAL LOAD
    ////////////////////////////////////////////////////////////

    (async () => {
        const notif = await fetchLatestNotification();
        if (notif) showNotification(notif);

        const unread = await fetchUnreadCount();
        updateBadge(unread);
    })();

    ////////////////////////////////////////////////////////////
    // SSE LIVE EVENTS
    ////////////////////////////////////////////////////////////

    let evtSource = null;
    try {
        evtSource = new EventSource(API.events);

        evtSource.addEventListener('notification', async (ev) => {
            try {
                const json = JSON.parse(ev.data);
                showNotification(json);

                const unread = await fetchUnreadCount();
                updateBadge(unread);
            } catch (err) {
                console.error('Notification SSE parse error:', err);
            }
        });

        evtSource.onerror = () => {
            console.warn('Notification SSE disconnected.');
            evtSource.close();
        };
    } catch (e) {
        console.error('Failed to init SSE:', e);
    }

    window.addEventListener('beforeunload', () => {
        try { evtSource?.close(); } catch {}
    });
});