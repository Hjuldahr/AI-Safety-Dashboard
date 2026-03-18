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

  const THEME_CLASSES = ['theme-ocean', 'theme-sunset', 'theme-compact']; // 'default' = no class

  // Map theme name → color CSS file path (relative to public/)
  const COLOR_FILES = {
    ocean: 'css/themes/colors-ocean.css',
    sunset: 'css/themes/colors-sunset.css'
  };

  // Layout CSS files
  const LAYOUT_DEFAULT = 'css/layouts/default.css';
  const LAYOUT_COMPACT = 'css/layouts/compact.css';

  function getUserPreferences() {
    return window.USER_PREFERENCES || {
      preferredTheme: 'default',
      darkModeEnabled: false,
      isAuthenticated: false
    };
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

  async function persistThemePreference(themeName) {
    const prefs = getUserPreferences();
    if (!prefs.isAuthenticated) return;

    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTheme: themeName })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save theme preference');
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const prefs = getUserPreferences();
    const currentTheme = prefs.preferredTheme || 'default';
    applyTheme(currentTheme);

    // Hook up the theme selector (on demo page)
    const selector = document.getElementById('theme-select');
    if (!selector) return;

    // Set the dropdown to current theme
    selector.value = currentTheme;

    selector.addEventListener('change', () => {
      const theme = selector.value;
      applyTheme(theme);
      window.USER_PREFERENCES = {
        ...getUserPreferences(),
        preferredTheme: theme
      };
      persistThemePreference(theme);
    });
  });
})();
