/**
 * Theme Manager
 * Toggles theme by swapping CSS classes on <body>.
 * Persists user preference in localStorage on a per-user basis
 * (same pattern as darkMode.js).
 *
 * Available themes: 'default', 'ocean', 'sunset'
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'theme';
  const THEME_CLASSES = ['theme-ocean', 'theme-sunset']; // 'default' = no class

  function getStorageKey() {
    const el = document.getElementById('user-name');
    if (el) {
      const username = el.textContent.replace('User:', '').trim();
      if (username) return STORAGE_PREFIX + '_' + username;
    }
    return STORAGE_PREFIX;
  }

  /** Remove all theme classes from body */
  function clearTheme() {
    THEME_CLASSES.forEach(cls => document.body.classList.remove(cls));
  }

  /** Apply a theme name ('default', 'ocean', 'sunset') */
  function applyTheme(name) {
    clearTheme();
    if (name && name !== 'default') {
      document.body.classList.add('theme-' + name);
    }
  }

  // Apply saved theme immediately (runs before DOMContentLoaded)
  const earlyKey = getStorageKey();
  const earlyTheme = localStorage.getItem(earlyKey);
  if (earlyTheme && earlyTheme !== 'default') {
    applyTheme(earlyTheme);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = getStorageKey();

    // Re-apply in case early check used the wrong key
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) applyTheme(saved);

    // Hook up the theme selector (on demo page)
    const selector = document.getElementById('theme-select');
    if (!selector) return;

    // Set the dropdown to current theme
    if (saved) selector.value = saved;

    selector.addEventListener('change', () => {
      const theme = selector.value;
      applyTheme(theme);
      localStorage.setItem(STORAGE_KEY, theme);
    });
  });
})();
