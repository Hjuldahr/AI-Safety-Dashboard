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

    // HELPERS
    const safeJSON = async (resp) => {
        try { return await resp.json(); } catch { return null; }
    };

    const formatTime = (date) => new Date(date).toLocaleString();

    // HISTORY & UNREAD STATE
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');
    const badgeEl = document.getElementById('notification-badge');

    let allNotifications = [];   // master array of notifications
    let page = 1;                // for pagination
    let pageSize = 10;
    let historyOpen = false;
    let fetching = false;        // prevent multiple fetches

    const updateBadge = (unread) => {
        if (!badgeEl) return;
        if (historyOpen) {
            badgeEl.textContent = '';
            badgeEl.classList.remove('show');
        } else {
            if (unread > 0) {
                badgeEl.textContent = unread > 99 ? '99+' : String(unread);
                badgeEl.classList.add('show');
            } else {
                badgeEl.textContent = '';
                badgeEl.classList.remove('show');
            }
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const resp = await fetch(API.unreadCount);
            if (!resp.ok) return 0;
            const json = await safeJSON(resp);
            return Number(json?.unread || 0);
        } catch { return 0; }
    };

    const fetchHistoryPage = async (pageNum = 1) => {
        if (fetching) return [];
        fetching = true;
        try {
            const params = new URLSearchParams({ page: pageNum, limit: pageSize });
            const resp = await fetch(`${API.history}?${params}`);
            if (!resp.ok) return [];
            const data = await safeJSON(resp);
            return Array.isArray(data?.notifications) ? data.notifications : [];
        } catch (e) {
            console.error('Failed to fetch history:', e);
            return [];
        } finally {
            fetching = false;
        }
    };

    const renderHistoryWindow = () => {
        if (!historyContainer) return;
        historyContainer.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Notifications';
        historyContainer.appendChild(header);

        const list = document.createElement('ul');
        list.style.maxHeight = '250px';
        list.style.overflowY = 'auto';
        historyContainer.appendChild(list);

        // Render visible notifications
        allNotifications.forEach(n => {
            const li = document.createElement('li');
            li.className = 'notification-history-item';
            li.style.borderLeft = `5px solid ${n.trim}`;
            li.style.backgroundColor = n.background || '#fff';

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

        // virtual scroll: fetch more when near bottom
        list.addEventListener('scroll', async () => {
            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 50) {
                page++;
                const newPage = await fetchHistoryPage(page);
                if (newPage.length) {
                    allNotifications = allNotifications.concat(newPage);
                    renderHistoryWindow(); // re-render
                }
            }
        });
    };

    const populateHistory = async () => {
        page = 1;
        allNotifications = await fetchHistoryPage(page);
        renderHistoryWindow();
    };

    // SLIDE NOTIFICATIONS
    const showNotification = async (n) => {
        if (!n || !n.message) return;
        if (historyOpen) return; // suppress slide when history is open

        const id = n.id;
        if (id && localStorage.getItem(`previousNotificationId`) === id) return;
        content.innerHTML = `<span class='notification-slide-text'>${n.message}<span><br><span class='notification-slide-time'>${formatTime(n.timestamp || Date.now())}</span>`;
        container.style.backgroundColor = n.trim;
        container.classList.remove('hidden');
        container.offsetHeight;
        container.classList.add('show');

        if (id) localStorage.setItem(`previousNotificationId`, id);

        currentNotification = n;
        if (n.dismissible !== false) {
            if (dismissTimer !== null) clearTimeout(dismissTimer);
            if (n.timeout) {
                dismissTimer = setTimeout(() => container.classList.remove('show'), n.timeout * 1000);
            }
        }

        // auto mark read if non-dismissible
        if (n.dismissible === false) {
            try { await fetch(API.markRead, { method: 'POST' }); } catch(e) { console.error(e); }
        }
    };

    const hideNotification = () => {
        container.classList.remove('show');
        container.classList.add('hidden');
        if (dismissTimer) { clearTimeout(dismissTimer); dismissTimer = null; }
        currentNotification = null;
    };

    container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentNotification) return;
        if (currentNotification.redirectUrl) window.location.href = currentNotification.redirectUrl;
        if (currentNotification.dismissible !== false) hideNotification();
    });

    document.body.addEventListener('click', (e) => {
        if (!currentNotification) return;
        if (container.contains(e.target)) return;
        if (currentNotification.dismissible === false) return;
        hideNotification();
    });

    // BELL CLICK
    bellButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        historyOpen = !historyContainer.classList.contains('show');

        if (historyOpen) {
            await populateHistory();
            historyContainer.classList.add('show');
            hideNotification(); // hide slide
            updateBadge(0);
            try { await fetch(API.markRead, { method: 'POST' }); } catch {}
        } else {
            historyContainer.classList.remove('show');
        }
    });

    document.addEventListener('click', () => {
        if (historyOpen) {
            historyContainer.classList.remove('show');
            historyOpen = false;
        }
    });

    // SSE / LIVE EVENTS
    let evtSource = null;
    try {
        evtSource = new EventSource(API.events);
        evtSource.addEventListener('notification', async (ev) => {
            try {
                const json = JSON.parse(ev.data);

                // prepend new notification to master array
                allNotifications.unshift(json);

                if (!historyOpen) {
                    showNotification(json);
                    const unread = await fetchUnreadCount();
                    updateBadge(unread);
                } else {
                    renderHistoryWindow(); // update history in real time
                    updateBadge(0);        // keep badge 0 while open
                    // mark read server-side immediately
                    try { await fetch(API.markRead, { method: 'POST' }); } catch {}
                }
            } catch (err) {
                console.error('Notification SSE parse error:', err);
            }
        });
        evtSource.onerror = () => { console.warn('Notification SSE disconnected.'); evtSource.close(); };
    } catch (e) { console.error('Failed to init SSE:', e); }

    // INITIAL LOAD
    (async () => {
        const latest = await fetchLatestNotification();
        if (latest) showNotification(latest);

        const unread = await fetchUnreadCount();
        updateBadge(unread);
    })();

    window.addEventListener('beforeunload', () => {
        try { evtSource?.close(); } catch {}
    });
});