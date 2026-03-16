document.addEventListener('DOMContentLoaded', () => {

    // =========================
    // CONFIG
    // =========================
    const API = {
        latest: '/notifications/latest',
        history: '/notifications/history',
        unreadCount: '/notifications/unread',
        markRead: '/notifications/mark-read',
        events: '/events'
    };

    // =========================
    // SLIDE NOTIFICATION UI
    // =========================
    let currentNotification = null;
    let dismissTimer = null;

    const container = document.createElement('div');
    container.id = 'notificationBanner';
    container.className = 'notification-slide hidden';
    document.body.appendChild(container);

    const content = document.createElement('div');
    content.className = 'notificationBannerContent';
    container.appendChild(content);

    const safeJSON = async (resp) => {
        try { return await resp.json(); } catch { return null; }
    };

    const formatTime = (date) => new Date(date).toLocaleString();

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

    // =========================
    // HISTORY STATE
    // =========================
    const bellButton = document.querySelector('.notification-bell');
    const historyContainer = document.getElementById('notification-history');
    const badgeEl = document.getElementById('notification-badge');

    let allNotifications = [];
    let page = 1;
    let pageSize = 10;
    let historyOpen = false;
    let fetching = false;
    let hasMorePages = true;

    let historyList = null;

    const updateBadge = (unread) => {
        if (!badgeEl) return;

        if (historyOpen) {
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

    // =========================
    // HISTORY RENDERING
    // =========================

    const appendNotifications = (notifications) => {
        if (!historyList) return;

        notifications.forEach(n => {
            const li = document.createElement('li');
            li.className = 'notification-history-item';
            li.style.borderLeft = `5px solid ${n.trim}`;
            li.style.backgroundColor = n.background || '#fff';

            const link = document.createElement('a');
            if (n.redirectUrl) link.href = n.redirectUrl;

            const text = document.createElement('span');
            text.className = 'alert-text';
            text.textContent = n.message || 'Notification';

            const time = document.createElement('span');
            time.className = 'alert-time';
            time.textContent = formatTime(n.createdAt || Date.now());

            link.appendChild(text);
            link.appendChild(time);
            li.appendChild(link);
            historyList.appendChild(li);
        });
    };

    const handleScroll = async () => {
        if (!hasMorePages || fetching) return;

        const nearBottom =
            historyContainer.scrollTop + historyContainer.clientHeight >=
            historyContainer.scrollHeight - 50;

        if (!nearBottom) return;

        page++;
        const newPage = await fetchHistoryPage(page);

        if (newPage.length < pageSize) {
            hasMorePages = false;
        }

        if (newPage.length) {
            allNotifications = allNotifications.concat(newPage);
            appendNotifications(newPage);
        }
    };

    const renderHistoryWindow = () => {
        if (!historyContainer) return;

        historyContainer.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'notification-history-header';
        header.textContent = 'Recent Notifications';
        historyContainer.appendChild(header);

        historyList = document.createElement('ul');
        historyList.className = 'notification-history-list';
        historyContainer.appendChild(historyList);

        appendNotifications(allNotifications);

        historyContainer.removeEventListener('scroll', handleScroll);
        historyContainer.addEventListener('scroll', handleScroll);
    };

    const populateHistory = async () => {
        page = 1;
        hasMorePages = true;
        allNotifications = await fetchHistoryPage(page);
        renderHistoryWindow();
    };

    // =========================
    // SLIDE NOTIFICATIONS
    // =========================

    const showNotification = async (n) => {
        if (!n || !n.message) return;
        if (historyOpen) return;

        const id = n.id;
        if (id && localStorage.getItem('previousNotificationId') === id) return;

        const alreadyVisible = container.classList.contains('show');

        // Replace content
        content.innerHTML = `
            <span class='notification-slide-text'>${n.message}</span>
            <span class='notification-slide-time'>
                ${formatTime(n.createdAt || Date.now())}
            </span>
        `;

        container.style.backgroundColor = n.trim;

        // Only trigger animation if not already visible
        if (!alreadyVisible) {
            container.classList.remove('hidden');
            container.offsetHeight;
            container.classList.add('show');
        }

        if (id) localStorage.setItem('previousNotificationId', id);
        currentNotification = n;

        // Reset dismiss timer
        if (n.dismissible !== false) {
            if (dismissTimer) clearTimeout(dismissTimer);
            if (n.timeout) {
                dismissTimer = setTimeout(() => {
                    container.classList.remove('show');
                }, n.timeout * 1000);
            }
        }

        if (n.dismissible === false) {
            try { await fetch(API.markRead, { method: 'POST' }); } catch {}
        }
    };

    const hideNotification = () => {
        container.classList.remove('show');
        container.classList.add('hidden');
        if (dismissTimer) clearTimeout(dismissTimer);
        dismissTimer = null;
        currentNotification = null;
    };

    container.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!currentNotification) return;

        if (currentNotification.redirectUrl) {
            window.location.href = currentNotification.redirectUrl;
        }

        if (currentNotification.dismissible !== false) {
            hideNotification();
        }
    });

    document.body.addEventListener('click', (e) => {
        if (!currentNotification) return;
        if (container.contains(e.target)) return;
        if (currentNotification.dismissible === false) return;
        hideNotification();
    });

    // =========================
    // BELL CLICK
    // =========================

    if (bellButton && historyContainer) {
        bellButton.addEventListener('click', async (e) => {
            e.stopPropagation();

            historyOpen = !historyContainer.classList.contains('show');

            if (historyOpen) {
                await populateHistory();
                historyContainer.classList.add('show');
                hideNotification();
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
    }

    // =========================
    // SSE
    // =========================

    let evtSource = null;

    try {
        evtSource = new EventSource(API.events);

        evtSource.addEventListener('notification', async (ev) => {
            try {
                const json = JSON.parse(ev.data);

                allNotifications.unshift(json);

                if (!historyOpen) {
                    showNotification(json);
                    const unread = await fetchUnreadCount();
                    updateBadge(unread);
                } else {
                    if (historyList) {
                        historyList.innerHTML = '';
                        appendNotifications(allNotifications);
                    }
                    updateBadge(0);
                    try { await fetch(API.markRead, { method: 'POST' }); } catch {}
                }

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

    // =========================
    // INITIAL LOAD
    // =========================

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