/**
 * Dark Mode Toggle
 * Persists user preference in localStorage on a per-user basis.
 * Falls back to a generic key when no user is logged in.
 */
(function () {
  'use strict';

  const STORAGE_PREFIX = 'darkMode';

  /**
   * Derive a per-user storage key.
   * The header contains `<p id="user-name">User: username</p>` when logged in.
   * On the login page (no header) we fall back to a generic key.
   */
  function getStorageKey() {
    const el = document.getElementById('user-name');
    if (el) {
      const username = el.textContent.replace('User:', '').trim();
      if (username) return STORAGE_PREFIX + '_' + username;
    }
    return STORAGE_PREFIX;
  }

  // Apply saved preference immediately to prevent flash of wrong theme.
  // At this point the DOM may not be ready so we check both the generic key
  // and try to read the user-name element (available if script runs after header).
  const earlyKey = getStorageKey();
  if (localStorage.getItem(earlyKey) === 'true') {
    document.body.classList.add('dark-mode');
  }

  // Wait for DOM so the toggle button and header username are available
  document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = getStorageKey();

    // Re-apply in case the early check used the wrong key
    if (localStorage.getItem(STORAGE_KEY) === 'true') {
      document.body.classList.add('dark-mode');
    } else if (localStorage.getItem(STORAGE_KEY) === 'false') {
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
      localStorage.setItem(STORAGE_KEY, isDark());
      updateIcon();
    });
  });
})();
