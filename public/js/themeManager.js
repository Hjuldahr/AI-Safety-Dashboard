/**
 * Theme Manager
 * Toggles theme by swapping CSS classes on <body> AND updating
 * the <link id="theme-colors"> and <link id="theme-layout"> hrefs
 * so modular color/layout files are loaded correctly.
 *
 * Available themes: 'default', 'ocean', 'sunset', 'compact'
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'theme';
  const THEME_CLASSES = ['theme-ocean', 'theme-sunset', 'theme-compact']; // 'default' = no class

  // Map theme name → color CSS file path (relative to public/)
  const COLOR_FILES = {
    ocean: 'css/themes/colors-ocean.css',
    sunset: 'css/themes/colors-sunset.css'
  };

  // Layout CSS files
  const LAYOUT_DEFAULT = 'css/layouts/default.css';
  const LAYOUT_COMPACT = 'css/layouts/compact.css';

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

  /** Update the <link id="theme-colors"> href */
  function updateColorLink(name) {
    const link = document.getElementById('theme-colors');
    if (!link) return;
    link.href = COLOR_FILES[name] || '';
  }

  /** Update the <link id="theme-layout"> href */
  function updateLayoutLink(name) {
    const link = document.getElementById('theme-layout');
    if (!link) return;
    link.href = (name === 'compact') ? LAYOUT_COMPACT : LAYOUT_DEFAULT;
  }

  /** Apply a theme name ('default', 'ocean', 'sunset', 'compact') */
  function applyTheme(name) {
    clearTheme();
    if (name && name !== 'default') {
      document.body.classList.add('theme-' + name);
    }
    updateColorLink(name);
    updateLayoutLink(name);
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
