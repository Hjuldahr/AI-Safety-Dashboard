// sseManager.js — provides getSharedEventSource() backed by a SharedWorker.
// Falls back to a plain EventSource if SharedWorker is unsupported.
// The returned object exposes the same addEventListener / readyState API that
// all existing consumer code already relies on, so no other changes are needed.

(function () {
    // Only initialise once per page
    if (window.__sseManager) return;

    // ---- Fallback: plain EventSource (same behaviour as before) ----
    function createPlainEventSource() {
        const es = new EventSource('/events');
        window.__sharedEventSource = es;
        window.addEventListener('beforeunload', () => {
            try { es.close(); } catch { }
        });
        return es;
    }

    // ---- SharedWorker path ----
    function createWorkerBacked() {
        const worker = new SharedWorker('/js/sseWorker.js', { name: 'sse-shared' });
        const port = worker.port;
        port.start();

        // Lightweight EventTarget wrapper so consumers can call addEventListener / removeEventListener
        const listeners = {};
        let readyState = EventSource.CONNECTING; // 0

        function addEventListener(eventName, fn) {
            if (!listeners[eventName]) listeners[eventName] = [];
            listeners[eventName].push(fn);
        }

        function removeEventListener(eventName, fn) {
            if (!listeners[eventName]) return;
            listeners[eventName] = listeners[eventName].filter(f => f !== fn);
        }

        function dispatch(eventName, detail) {
            (listeners[eventName] || []).forEach(fn => {
                try { fn(detail); } catch (e) { console.error('[SSE wrapper]', e); }
            });
        }

        port.addEventListener('message', (msg) => {
            const d = msg.data;

            if (d.type === '__sse_status') {
                readyState = d.readyState;
                if (d.readyState === EventSource.OPEN) {
                    dispatch('open', {});
                } else if (d.readyState === EventSource.CLOSED || d.readyState === EventSource.CONNECTING) {
                    dispatch('error', {});
                }
                return;
            }

            if (d.type === 'event') {
                // Mimic a MessageEvent so existing JSON.parse(ev.data) calls keep working
                dispatch(d.eventName, { data: d.data });
            }
        });

        // Notify the worker when this tab unloads so it can clean up
        window.addEventListener('beforeunload', () => {
            try { port.postMessage('close'); } catch { }
        });

        // Public surface — matches EventSource API used by consumer code
        const facade = {
            addEventListener,
            removeEventListener,
            close() {
                try { port.postMessage('close'); } catch { }
                readyState = EventSource.CLOSED;
            },
            get readyState() { return readyState; },
            get CONNECTING() { return EventSource.CONNECTING; },
            get OPEN() { return EventSource.OPEN; },
            get CLOSED() { return EventSource.CLOSED; }
        };

        // Allow onerror / onopen setters used in some files
        let _onerror = null;
        let _onopen = null;
        Object.defineProperty(facade, 'onerror', {
            get() { return _onerror; },
            set(fn) {
                if (_onerror) removeEventListener('error', _onerror);
                _onerror = fn;
                if (fn) addEventListener('error', fn);
            }
        });
        Object.defineProperty(facade, 'onopen', {
            get() { return _onopen; },
            set(fn) {
                if (_onopen) removeEventListener('open', _onopen);
                _onopen = fn;
                if (fn) addEventListener('open', fn);
            }
        });

        return facade;
    }

    // ---- Decide which strategy to use ----
    const useWorker = typeof SharedWorker !== 'undefined';

    function getSharedEventSource() {
        if (window.__sharedEventSource) {
            const rs = window.__sharedEventSource.readyState;
            if (rs !== undefined && rs !== EventSource.CLOSED) {
                return window.__sharedEventSource;
            }
        }

        window.__sharedEventSource = useWorker ? createWorkerBacked() : createPlainEventSource();
        return window.__sharedEventSource;
    }

    window.__sseManager = { getSharedEventSource };
})();
