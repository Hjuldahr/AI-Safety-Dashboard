/**
 * Dark Mode Toggle
 * Uses server-rendered preferences for initial state.
 * Persists preference to DB for authenticated users.
 */
(function () {
  'use strict';

  function getUserPreferences() {
    return window.USER_PREFERENCES || {
      preferredTheme: 'default',
      darkModeEnabled: window.matchMedia('(prefers-color-scheme: dark)').matches,
      isAuthenticated: false
    };
  }

  async function persistDarkModePreference(enabled) {
    const prefs = getUserPreferences();
    if (!prefs.isAuthenticated) return;

    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ darkModeEnabled: enabled })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save dark mode preference');
      }
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const prefs = getUserPreferences();

    if (prefs.darkModeEnabled ?? window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    const toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;

    const icon = toggle.querySelector('i');
    const isDark = () => document.body.classList.contains('dark-mode');

    // Set initial icon state
    function updateIcon() {
      if (!icon) return;
      icon.className = isDark() ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      toggle.title = isDark() ? 'Switch to light mode' : 'Switch to dark mode';
    }
    updateIcon();

    toggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const enabled = isDark();
      window.USER_PREFERENCES = {
        ...getUserPreferences(),
        darkModeEnabled: enabled
      };

      persistDarkModePreference(enabled);
      updateIcon();
    });
  });
})();
