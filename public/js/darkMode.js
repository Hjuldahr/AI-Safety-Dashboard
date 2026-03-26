(function () {
  'use strict';

  const MODES = ['light', 'dark', 'auto'];

  function getPrefs() {
    return window.USER_PREFERENCES || {
      preferredColour: 'auto',
      isAuthenticated: false
    };
  }

  function getSystemDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveIsDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return getSystemDark(); // auto
  }

  function applyMode(mode) {
    const isDark = resolveIsDark(mode);
    document.body.classList.toggle('dark-mode', isDark);
  }

  function nextMode(current) {
    const i = MODES.indexOf(current);
    return MODES[(i + 1) % MODES.length];
  }

  async function persist(mode) {
    const prefs = getPrefs();
    if (!prefs.isAuthenticated) return;

    try {
      await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredColour: mode })
      });
    } catch (e) {
      console.error('Failed to save colour pref:', e);
    }
  }

  function updateIcon(mode) {
    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;

    const icon = toggle.querySelector('i');
    if (!icon) return;

    if (mode === 'dark') icon.className = 'fa-solid fa-moon';
    else if (mode === 'light') icon.className = 'fa-solid fa-sun';
    else icon.className = 'fa-solid fa-circle-half-stroke';

    toggle.title = `Mode: ${mode}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    let prefs = getPrefs();
    let mode = prefs.preferredColour || 'auto';

    applyMode(mode);
    updateIcon(mode);

    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      mode = nextMode(mode);

      applyMode(mode);
      updateIcon(mode);

      window.USER_PREFERENCES = {
        ...prefs,
        preferredColour: mode
      };

      persist(mode);

      const select = document.getElementById('colour-select');
      if (select) select.value = mode;
    });

    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (mode === 'auto') applyMode('auto');
      });
  });
})();