document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const toggleButton = document.getElementById('dashboard-fullscreen-toggle');

    if (!body.classList.contains('dashboard-page') || !toggleButton) {
        return;
    }

    const ACTIVE_CLASS = 'dashboard-fullscreen-active';
    const chartAnchor = document.getElementById('static-charts-container');

    let previousScrollY = 0;

    function isActive() {
        return body.classList.contains(ACTIVE_CLASS);
    }

    function syncButtonState() {
        const active = isActive();
        toggleButton.setAttribute('aria-pressed', String(active));
        toggleButton.title = active
            ? 'Exit fullscreen dashboard mode'
            : 'Enter fullscreen dashboard mode';
        toggleButton.innerHTML = active
            ? "<i class='fa-solid fa-compress'></i> Exit Fullscreen"
            : "<i class='fa-solid fa-expand'></i> Fullscreen";
    }

    function scrollPastControls() {
        if (!chartAnchor) {
            return;
        }

        const targetTop = Math.max(0, chartAnchor.getBoundingClientRect().top + window.scrollY - 8);
        window.scrollTo({
            top: targetTop,
            behavior: 'smooth'
        });
    }

    function enterFullscreenMode() {
        if (isActive()) {
            return;
        }

        previousScrollY = window.scrollY || window.pageYOffset || 0;
        body.classList.add(ACTIVE_CLASS);
        syncButtonState();

        requestAnimationFrame(() => {
            scrollPastControls();
        });
    }

    function exitFullscreenMode() {
        if (!isActive()) {
            return;
        }

        body.classList.remove(ACTIVE_CLASS);
        syncButtonState();
        window.scrollTo({
            top: previousScrollY,
            behavior: 'auto'
        });
    }

    toggleButton.addEventListener('click', () => {
        if (isActive()) {
            exitFullscreenMode();
            return;
        }

        enterFullscreenMode();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !isActive()) {
            return;
        }

        event.preventDefault();
        exitFullscreenMode();
    });

    syncButtonState();
});
