(function () {
  'use strict';

  const THEMES = ['default', 'ocean', 'sunset', 'compact'];
  const MODES = ['light', 'dark', 'auto'];

  const COLOR_FILES = {
    ocean: 'css/themes/colors-ocean.css',
    sunset: 'css/themes/colors-sunset.css'
  };

  const LAYOUT_DEFAULT = 'css/layouts/default.css';
  const LAYOUT_COMPACT = 'css/layouts/compact.css';

  function getPrefs() {
    return window.USER_PREFERENCES || {
      preferredTheme: 'default',
      preferredColour: 'auto',
      isAuthenticated: false
    };
  }

  function setPrefs(newPrefs) {
    window.USER_PREFERENCES = {
      ...getPrefs(),
      ...newPrefs
    };
  }

  function getSystemDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function resolveDark(mode) {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return getSystemDark(); // auto
  }

  function applyColour(mode) {
    const isDark = resolveDark(mode);
    document.body.classList.toggle('dark-mode', isDark);
  }

  function applyTheme(name) {
    document.body.classList.remove('theme-ocean', 'theme-sunset', 'theme-compact');

    if (name && name !== 'default') {
      document.body.classList.add('theme-' + name);
    }

    const colorLink = document.getElementById('theme-colors');
    if (colorLink) colorLink.href = COLOR_FILES[name] || '';

    const layoutLink = document.getElementById('theme-layout');
    if (layoutLink) {
      layoutLink.href = (name === 'compact') ? LAYOUT_COMPACT : LAYOUT_DEFAULT;
    }
  }

  function updateButton(mode) {
    const btn = document.getElementById('dark-mode-toggle');
    if (!btn) return;

    const icon = btn.querySelector('i');
    if (!icon) return;

    if (mode === 'dark') icon.className = 'fa-solid fa-moon';
    else if (mode === 'light') icon.className = 'fa-solid fa-sun';
    else icon.className = 'fa-solid fa-circle-half-stroke';

    btn.title = `Mode: ${mode}`;
  }

  function syncUI(mode, theme) {
    const colourSelect = document.getElementById('colour-select');
    if (colourSelect && colourSelect.value !== mode) {
      colourSelect.value = mode;
    }

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && themeSelect.value !== theme) {
      themeSelect.value = theme;
    }

    updateButton(mode);
  }

  function nextMode(current) {
    const i = MODES.indexOf(current);
    return MODES[(i + 1) % MODES.length];
  }

  async function persist(updates) {
    const prefs = getPrefs();
    if (!prefs.isAuthenticated) return;

    try {
      await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to persist preferences:', e);
    }
  }

  function applyAll({ preferredTheme, preferredColour }) {
    applyTheme(preferredTheme);
    applyColour(preferredColour);
    syncUI(preferredColour, preferredTheme);
  }

  document.addEventListener('DOMContentLoaded', () => {
    let prefs = getPrefs();

    applyAll(prefs);

    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', () => {
        const theme = themeSelect.value;

        setPrefs({ preferredTheme: theme });
        applyAll(getPrefs());
        persist({ preferredTheme: theme });
      });
    }

    const colourSelect = document.getElementById('colour-select');
    if (colourSelect) {
      colourSelect.addEventListener('change', () => {
        const mode = colourSelect.value;

        setPrefs({ preferredColour: mode });
        applyAll(getPrefs());
        persist({ preferredColour: mode });
      });
    }

    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const current = getPrefs().preferredColour;
        const next = nextMode(current);

        setPrefs({ preferredColour: next });
        applyAll(getPrefs());
        persist({ preferredColour: next });
      });
    }

    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => {
        if (getPrefs().preferredColour === 'auto') {
          applyColour('auto');
        }
      });
  });
})();
