// SharedWorker: maintains a single SSE connection shared across all browser tabs.
// Each tab connects to this worker via a MessagePort and receives forwarded SSE events.

const ports = [];
let eventSource = null;
let eventsUrl = null;

// SSE event types this application uses
const SSE_EVENTS = ['update', 'summary', 'alert', 'notification', 'user_log_update'];

function startEventSource() {
    if (!eventsUrl) return;
    if (eventSource && eventSource.readyState !== EventSource.CLOSED) return;

    eventSource = new EventSource(eventsUrl);

    eventSource.addEventListener('open', () => {
        broadcast({ type: '__sse_status', readyState: EventSource.OPEN });
    });

    eventSource.addEventListener('error', () => {
        broadcast({ type: '__sse_status', readyState: eventSource.readyState });
        // EventSource auto-reconnects on error — no manual intervention needed.
    });

    SSE_EVENTS.forEach(eventName => {
        eventSource.addEventListener(eventName, (e) => {
            broadcast({ type: 'event', eventName, data: e.data });
        });
    });
}

function broadcast(msg) {
    ports.forEach(port => {
        try { port.postMessage(msg); } catch { /* port closed */ }
    });
}

self.addEventListener('connect', (e) => {
    const port = e.ports[0];
    ports.push(port);

    port.addEventListener('message', (msg) => {
        if (msg.data?.type === 'init' && msg.data.eventsUrl) {
            eventsUrl = msg.data.eventsUrl;
            startEventSource();
            return;
        }
        if (msg.data === 'close') {
            const idx = ports.indexOf(port);
            if (idx !== -1) ports.splice(idx, 1);
            // If no more tabs, close the SSE connection
            if (ports.length === 0 && eventSource) {
                eventSource.close();
                eventSource = null;
            }
        }
    });

    port.start();

    // Send current connection state to the newly connected tab
    if (eventSource) {
        port.postMessage({ type: '__sse_status', readyState: eventSource.readyState });
    }

    // Start the SSE connection if we already have the URL from a previous tab
    startEventSource();
});
