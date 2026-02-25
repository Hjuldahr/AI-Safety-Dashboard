// notification.js
document.addEventListener('DOMContentLoaded', () => {
    // CONFIG
    const API = {
        latest: '/notifications/latest',
        history: '/notifications/history',
        unreadCount: '/notifications/unread',
        markRead: '/notifications/mark-read',
        events: '/events'
    };

    // SLIDE NOTIFICATION UI
    let currentNotification = null;
    let dismissTimer = null;

    const container = document.createElement('div');
    container.id = 'notificationBanner';
    container.className = 'notification-slide hidden';
    document.body.appendChild(container);

    const content = document.createElement('div');
    content.className = 'notificationBannerContent';
    container.appendChild(content);

    // LOCAL HISTORY
    let localHistory = [];

    // HELPERS
    const isNotificationShown = (id) => localStorage.getItem(`previousNotificationId`) === id;
    const markNotificationShown = (id) => localStorage.setItem(`previousNotificationId`, id);
    const safeJSON = async (resp) => { try { return await resp.json(); } catch { return null; } };
    const formatTime = (date) => new Date(date).toLocaleString();

    const fetchLatestNotification = async () => {
        try {
            const resp = await fetch(API.latest);
            if (!resp.ok) return null;
            return await safeJSON(resp);
        } catch (e) { console.error('Failed to fetch latest notification:', e); return null; }
    };

    const fetchUnreadCount = async () => {
        try {
            const resp = await fetch(API.unreadCount);
            if (!resp.ok) return 0;
            const json = await safeJSON(resp);
            return Number(json?.unread || 0);
        } catch { return 0; }
    };

    const fetchHistory = async (limit = 20) => {
        try {
            const params = new URLSearchParams({ page: '1', limit: String(limit) });
            const resp = await fetch(`${API.history}?${params}`);
            if (!resp.ok) return [];
            const data = await safeJSON(resp);
            return Array.isArray(data?.notifications) ? data.notifications : [];
        } catch (e) { console.error('Failed to fetch history:', e); return []; }
    };

    // SHOW / HIDE SLIDE
    const hideNotification = () => {
        container.classList.remove('show');
        container.classList.add('hidden');
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
        setTimeout(() => currentNotification = null, 350);
    };

    const showNotification = async (json) => {
        if (!json || !json.message) return;

        // Suppress slide if history is open
        if (historyContainer && historyContainer.classList.contains('show')) return;

        if (json.id && isNotificationShown(json.id)) return;

        content.innerHTML = `<span class='notification-slide-text'>${json.message}<span><br><span class='notification-slide-time'>${formatTime(json.timestamp || Date.now())}</span>`;
        container.style.backgroundColor = json.trim;

        container.classList.remove('hidden');
        container.offsetHeight;
        container.classList.add('show');

        currentNotification = json;
        if (json.id) markNotificationShown(json.id);

        if (json.dismissible === false) {
            try { await fetch(API.markRead, { method: 'POST' }); } catch(e) { console.error(e); }
        }

        if (dismissTimer !== null) clearTimeout(dismissTimer);
        if (json.timeout) {
            dismissTimer = setTimeout(() => { if (json.dismissible !== false) hideNotification(); }, json.timeout * 1000);
        }
    };

    // CLICK BEHAVIOR
    container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentNotification) return;
        if (currentNotification.redirectUrl) { window.location.href = currentNotification.redirectUrl; return; }
        if (currentNotification.dismissible !== false) hideNotification();
    });

    document.body.addEventListener('click', (e) => {
        if (!currentNotification) return;
        if (container.contains(e.target)) return;
        if (currentNotification.dismissible === false) return;
        hideNotification();
    });

    // NOTIFICATION BELL + HISTORY
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');
    const badgeEl = document.getElementById('notification-badge');

    const updateBadge = (unread) => {
        if (!badgeEl) return;

        // Force hidden if history is open
        if (historyContainer && historyContainer.classList.contains('show')) {
            badgeEl.textContent = '';
            badgeEl.classList.remove('show');
            return;
        }

        if (unread > 0) {
            badgeEl.textContent = unread > 99 ? '99+' : String(unread);
            badgeEl.classList.add('show');
        } else {
            badgeEl.textContent = '';
            badgeEl.classList.remove('show');
        }
    };

    const renderHistory = (notifications) => {
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Notifications';
        historyContainer.appendChild(header);

        const list = document.createElement('ul');
        notifications.forEach(n => {
            const li = document.createElement('li');
            li.className = 'notification-history-item';
            li.style.borderLeft = `5px solid ${n.trim}`;
            li.style.backgroundColor = n.background;

            const link = document.createElement('a');
            if (n.redirectUrl) link.href = n.redirectUrl;

            const text = document.createElement('span');
            text.className = 'alert-text';
            text.textContent = n.title || n.message || 'Notification';

            const time = document.createElement('span');
            time.className = 'alert-time';
            time.textContent = formatTime(n.timestamp || Date.now());

            link.appendChild(text);
            link.appendChild(time);
            li.appendChild(link);
            list.appendChild(li);
        });

        historyContainer.appendChild(list);
    };

    const populateHistory = async () => {
        if (!historyContainer) return;
        const logs = await fetchHistory();
        localHistory = logs;
        renderHistory(localHistory);
        updateBadge(0); // enforce badge hidden while open
    };

    bellButton?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const willShow = !historyContainer.classList.contains('show');

        if (willShow) {
            await populateHistory();
            historyContainer.classList.add('show');

            container.classList.remove('show');
            container.classList.add('hidden');

            try { await fetch(API.markRead, { method: 'POST' }); } catch(e) { console.log(e); }

        } else {
            historyContainer.classList.remove('show');
            // When closing, fetch unread count again
            const unread = await fetchUnreadCount();
            updateBadge(unread);
        }
    });

    document.addEventListener('click', () => {
        if (historyContainer.classList.contains('show')) {
            historyContainer.classList.remove('show');
            fetchUnreadCount().then(unread => updateBadge(unread));
        }
    });

    // SSE LIVE EVENTS
    let evtSource = null;
    try {
        evtSource = new EventSource(API.events);

        evtSource.addEventListener('notification', async (ev) => {
            try {
                const json = JSON.parse(ev.data);

                // show slide if history not open
                showNotification(json);

                // update local history
                localHistory.unshift(json);
                if (localHistory.length > 10) localHistory.pop();

                // update DOM if history is open
                if (historyContainer.classList.contains('show')) {
                    renderHistory(localHistory);
                    updateBadge(0); // hide badge while open
                    try { await fetch(API.markRead, { method: 'POST' }); } catch(e) {}
                } else {
                    const unread = await fetchUnreadCount();
                    updateBadge(unread);
                }

            } catch (err) {
                console.error('Notification SSE parse error:', err);
            }
        });

        evtSource.onerror = () => { console.warn('Notification SSE disconnected.'); evtSource.close(); };

    } catch (e) { console.error('Failed to init SSE:', e); }

    // INITIAL LOAD
    (async () => {
        const notif = await fetchLatestNotification();
        if (notif) showNotification(notif);

        const unread = await fetchUnreadCount();
        updateBadge(unread);

        const logs = await fetchHistory(10);
        localHistory = logs; // local cache
    })();

    window.addEventListener('beforeunload', () => { try { evtSource?.close(); } catch {} });
});