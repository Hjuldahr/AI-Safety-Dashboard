document.addEventListener('DOMContentLoaded', async () => {
  const usersContainer = document.getElementById('users-container');
  const rolesContainer = document.getElementById('roles-list');
  const permissionsListDiv = document.getElementById('permissions-list');
  const createRoleForm = document.getElementById('create-role-form');
  const roleMessagesDiv = document.getElementById('role-messages');

  let availablePermissions = [];
  let allUsers = [];

  // Fetch available permissions
  async function fetchPermissions() {
    try {
      const res = await fetch('admin/api/permissions');
      if (!res.ok) return [];
      const data = await res.json();
      return data.permissions || [];
    } catch (err) {
      console.error('Error fetching permissions:', err);
      return [];
    }
  }

  // Render permissions list
  function renderPermissions(permissionsObj) {
    let html = '';
    
    // permissionsObj is now: { "Category": [{ key, label }, ...], ... }
    Object.entries(permissionsObj).forEach(([category, perms]) => {
      html += `<div class="permission-category">
        <h5 style="margin: 1rem 0 0.5rem; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem;">${category}</h5>`;
      
      perms.forEach(perm => {
        html += `
        <div class="permission-item">
          <input type="checkbox" id="perm-${perm.key}" value="${perm.key}" name="permissions">
          <label for="perm-${perm.key}">${perm.label}</label>
        </div>`;
      });
      
      html += '</div>';
    });
    
    permissionsListDiv.innerHTML = html;
  }

  // Role filter helper
  function populateRoleFilters(roles) {
    const roleFilter = document.getElementById('role-filter');
    const bulkRoleSelect = document.getElementById('bulk-role-select');
    if (!roleFilter || !bulkRoleSelect || !roles) return;

    roleFilter.innerHTML = '<option value="">All Roles</option>' +
      roles.map(r => `<option value="${r}">${r}</option>`).join('');

    bulkRoleSelect.innerHTML = '<option value="">Bulk role...</option>' +
      roles.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  function applyFilters() {
    const searchTerm = document.getElementById('user-search')?.value.trim().toLowerCase() || '';
    const roleFilter = document.getElementById('role-filter')?.value || '';

    const filtered = allUsers.filter(u => {
      const textMatch = !searchTerm ||
        (u.username && u.username.toLowerCase().includes(searchTerm)) ||
        (u.email && u.email.toLowerCase().includes(searchTerm));
      const roleMatch = !roleFilter || (u.roles && u.roles[0] === roleFilter);
      return textMatch && roleMatch;
    });

    renderTable(filtered);
  }

  // Show message in role section
  function showMessage(message, type = 'success') {
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    roleMessagesDiv.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => {
      roleMessagesDiv.innerHTML = '';
    }, 5000);
  }

  // Handle role creation
  createRoleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-description').value.trim();
    const selectedPerms = Array.from(document.querySelectorAll('input[name="permissions"]:checked'))
      .map(cb => cb.value);

    if (!name || !description || selectedPerms.length === 0) {
      showMessage('Please fill in all fields and select at least one permission.', 'error');
      return;
    }

    try {
      const res = await fetch('admin/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          permissions: selectedPerms
        })
      });

      const data = await res.json();

      if (res.ok) {
        showMessage(`Role "${name}" created successfully!`, 'success');
        createRoleForm.reset();
        loadRoles();
      } else {
        showMessage(data.message || 'Error creating role', 'error');
      }
    } catch (err) {
      console.error(err);
      showMessage('Error creating role', 'error');
    }
  });

  // Fetch users from database
  async function fetchUsers() {
    const res = await fetch('admin/api/users');
    if (!res.ok) return;
    const data = await res.json();
    return data.users;
  }

  // Fetch roles from database
  async function fetchRoles() {
    try {
      const res = await fetch('admin/api/roles');
      if (!res.ok) return [];
      const data = await res.json();
      return data.roles || [];
    } catch (err) {
      console.error('Error fetching roles:', err);
      return [];
    }
  }

  // Render users table
  function renderTable(users) {
    if (!users.length) {
      usersContainer.innerHTML = `
        <table class="table">
          <thead><tr>
            <th><input type="checkbox" id="select-all-table"></th>
            <th>Username</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th>
          </tr></thead>
          <tbody><tr class="empty-state"><td colspan="6">No users found.</td></tr></tbody>
        </table>`;
      return;
    }

    const canManage = (window.USER_PERMISSIONS || []).includes('manage:users');

    const rows = users.map(u => {
      const currentRole = (u.roles && u.roles[0]) || '';
      const roleBadgeClass = ['owner','admin','user','viewer'].includes(currentRole) ? currentRole : '';
      const options = window.AVAILABLE_ROLES.map(r =>
        `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`
      ).join('');
      const isCurrentUser = String(window.CURRENT_USER_ID) === String(u._id);
      const disAttr = isCurrentUser ? 'disabled' : '';

      // Format joined date
      const joined = u.createdAt
        ? new Date(u.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

      return `
        <tr data-user-id="${u._id}">
          <td><input type="checkbox" class="select-user" data-user-id="${u._id}" ${disAttr}></td>
          <td><strong>${u.username || ''}</strong></td>
          <td style="color:var(--text-muted,var(--text-light));font-size:0.9rem">${u.email || ''}</td>
          <td>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <select class="role-select" ${disAttr}>${options}</select>
              <span class="role-badge ${roleBadgeClass}">${currentRole}</span>
            </div>
          </td>
          <td class="joined-date">${joined}</td>
          <td>
            <div class="user-table-actions">
              <button class="save-role btn btn-primary" ${disAttr} title="Save role change">Save</button>
              ${canManage && !isCurrentUser ? `<button class="btn btn-warning reset-pw-btn" data-user-id="${u._id}" data-username="${u.username}" title="Force password reset"><i class="fa-solid fa-key"></i> Reset PW</button>` : ''}
              ${canManage && !isCurrentUser ? `<button class="btn btn-danger delete-user" title="Delete user"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    usersContainer.innerHTML = `
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <th><input type="checkbox" id="select-all-table"></th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    // Select-all
    document.getElementById('select-all-table')?.addEventListener('change', (e) => {
      usersContainer.querySelectorAll('.select-user:not([disabled])').forEach(cb => { cb.checked = e.target.checked; });
    });

    // Save role
    usersContainer.querySelectorAll('.save-role').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const userId = tr.dataset.userId;
        const select = tr.querySelector('.role-select');
        const badge  = tr.querySelector('.role-badge');
        const role = select.value;

        try {
          const res = await fetch(`admin/api/users/${userId}/roles`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });
          if (res.ok) {
            showMessage('Role updated');
            // Update badge inline
            if (badge) {
              badge.textContent = role;
              badge.className = `role-badge ${['owner','admin','user','viewer'].includes(role) ? role : ''}`;
            }
            load();
          } else {
            const text = await res.json();
            showMessage(`Error: ${text.message || 'Unable to update role'}`, 'error');
          }
        } catch (err) {
          showMessage('Error updating role', 'error');
        }
      });
    });

    // Reset PW (OTP modal)
    usersContainer.querySelectorAll('.reset-pw-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openOtpModal(btn.dataset.userId, btn.dataset.username);
      });
    });

    // Delete user
    usersContainer.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const userId = tr.dataset.userId;
        if (!confirm('Are you sure you want to delete this user account?')) return;
        try {
          const res = await fetch(`admin/api/users/${userId}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok) {
            showMessage('User deleted');
            load();
          } else {
            showMessage(`Error: ${data.message || 'Unable to delete user'}`, 'error');
          }
        } catch (err) {
          showMessage('Error deleting user', 'error');
        }
      });
    });
  }

  // ---- OTP Modal ----
  async function openOtpModal(userId, username) {
    const container = document.getElementById('otp-modal-container');
    if (!container) return;

    // Show a loading state modal first
    container.innerHTML = buildOtpModalHtml(username, null, true);
    document.body.style.overflow = 'hidden';

    let otp = null;
    try {
      const res = await fetch(`admin/api/users/${userId}/otp`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        closeOtpModal();
        showMessage(data.message || 'Failed to generate reset OTP', 'error');
        return;
      }
      otp = data.otp;
    } catch (err) {
      closeOtpModal();
      showMessage('Network error generating OTP', 'error');
      return;
    }

    // Replace loading state with real OTP
    container.innerHTML = buildOtpModalHtml(username, otp, false);

    // Wire up copy button
    const copyBtn = document.getElementById('otp-copy-btn');
    const copiedMsg = document.getElementById('otp-copied-msg');
    const otpInput = document.getElementById('otp-value');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(otp);
        copiedMsg.textContent = '✓ Copied to clipboard';
        setTimeout(() => { copiedMsg.textContent = ''; }, 3000);
      } catch {
        otpInput.select();
        document.execCommand('copy');
        copiedMsg.textContent = '✓ Copied';
        setTimeout(() => { copiedMsg.textContent = ''; }, 3000);
      }
    });

    // Close buttons
    container.querySelectorAll('[data-close-otp]').forEach(el => {
      el.addEventListener('click', closeOtpModal);
    });
    // Close on backdrop click
    container.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeOtpModal();
    });
  }

  function buildOtpModalHtml(username, otp, loading) {
    const bodyContent = loading
      ? `<div style="text-align:center;padding:2rem;color:var(--text-muted,var(--text-light))">
           <i class="fa-solid fa-spinner fa-spin" style="font-size:1.5rem"></i>
           <p style="margin-top:0.75rem">Generating OTP&hellip;</p>
         </div>`
      : `<p style="margin:0 0 0.5rem;color:var(--text-dark)">
           Share this one-time password with <strong>${username}</strong>.<br>
           They can use it to log in and will be prompted to set a new password immediately.
         </p>
         <p style="margin:0 0 0.25rem;font-size:0.82rem;color:var(--text-muted,var(--text-light))">
           <i class="fa-solid fa-clock"></i> Expires in 24 hours &nbsp;·&nbsp;
           <i class="fa-solid fa-shield-halved"></i> Single-use only
         </p>
         <div class="otp-box">
           <input type="text" id="otp-value" value="${otp}" readonly>
           <button class="otp-copy-btn" id="otp-copy-btn" type="button">
             <i class="fa-solid fa-copy"></i> Copy
           </button>
         </div>
         <p class="otp-copied-msg" id="otp-copied-msg"></p>
         <p style="margin:1rem 0 0;font-size:0.8rem;color:var(--text-muted,var(--text-light))">
           <i class="fa-solid fa-triangle-exclamation" style="color:var(--color-warning,#f59e0b)"></i>
           This OTP is not stored in plain text and will not be shown again.
         </p>`;

    return `
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Force Password Reset">
        <div class="modal-content medium-modal">
          <div class="modal-header">
            <h2 style="font-size:1.1rem">
              <i class="fa-solid fa-key" style="color:var(--color-warning,#f59e0b);margin-right:0.5rem"></i>
              Force Password Reset &mdash; ${username}
            </h2>
            <button class="close-modal-btn" data-close-otp type="button" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">${bodyContent}</div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-close-otp type="button">Close</button>
          </div>
        </div>
      </div>`;
  }

  function closeOtpModal() {
    const container = document.getElementById('otp-modal-container');
    if (container) container.innerHTML = '';
    document.body.style.overflow = '';
  }

  // Render roles list
  function renderRoles(roles) {
    const html = roles.map(role => `
      <div class="role-item">
        <div class="role-info">
          <h4>${role.name}
            ${role.isSystemRole ? '<span class="role-badge system">System</span>' : '<span class="role-badge">Custom</span>'}
          </h4>
          <p>${role.description}</p>
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
            ${role.isCustom ? `<button class="btn-danger" style="padding: 0.25rem 0.75rem; font-size: 0.85rem;" onclick="deleteRole('${role.name}')">Delete</button>` : 'Cannot delete system roles'}
          </p>
        </div>
      </div>
    `).join('');

    rolesContainer.innerHTML = html || '<p>No roles found.</p>';
  }

  // Delete role function (global so onclick can access it)
  window.deleteRole = async (roleName) => {
    if (!confirm(`Are you sure you want to delete the "${roleName}" role?`)) {
      return;
    }

    try {
      const res = await fetch(`admin/api/roles/${roleName}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        showMessage(`Role "${roleName}" deleted successfully!`, 'success');
        loadRoles();
      } else {
        showMessage(data.message || 'Error deleting role', 'error');
      }
    } catch (err) {
      console.error(err);
      showMessage('Error deleting role', 'error');
    }
  };

  // Expand/collapse logic for general management panes
  function setupCollapsibleSections() {
    document.querySelectorAll('.collapsible-section').forEach(section => {
      const button = section.querySelector('.collapse-toggle');
      const content = section.querySelector('.collapsible-content');

      if (!button || !content) return;

      button.setAttribute('aria-controls', content.id);
      button.setAttribute('aria-expanded', 'true');

      button.addEventListener('click', () => {
        const collapsed = content.classList.toggle('collapsed');
        button.setAttribute('aria-expanded', String(!collapsed));
        button.innerText = `${section.dataset.section.charAt(0).toUpperCase() + section.dataset.section.slice(1)} ${collapsed ? '▸' : '▾'}`;
      });
    });
  }

  // Load all data
  async function load() {
    allUsers = await fetchUsers() || [];
    applyFilters();
  }

  // Load roles
  async function loadRoles() {
    const roles = await fetchRoles();
    if (roles) renderRoles(roles);
  }

  // Initialize
  setupCollapsibleSections();

  if (usersContainer) {
    // Load permissions and users
    availablePermissions = await fetchPermissions();
    renderPermissions(availablePermissions);

    // populate roles based on available roles from server/templating
    const roleOptions = window.AVAILABLE_ROLES || [];
    populateRoleFilters(roleOptions);

    const userSearch = document.getElementById('user-search');
    const roleFilter = document.getElementById('role-filter');

    userSearch?.addEventListener('input', () => applyFilters());
    roleFilter?.addEventListener('change', () => applyFilters());

    document.getElementById('refresh-users')?.addEventListener('click', () => load());

    document.getElementById('apply-bulk-role')?.addEventListener('click', async () => {
      const targetRole = document.getElementById('bulk-role-select')?.value;
      if (!targetRole) {
        alert('Please select a bulk role to apply');
        return;
      }
      const selectedIds = Array.from(document.querySelectorAll('.select-user:checked')).map(cb => cb.dataset.userId);
      if (!selectedIds.length) {
        alert('No users selected for bulk role update');
        return;
      }

      if (!confirm(`Apply role '${targetRole}' to ${selectedIds.length} user(s)?`)) return;

      const results = await Promise.all(selectedIds.map(async (userId) => {
        try {
          const res = await fetch(`admin/api/users/${userId}/roles`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: targetRole })
          });

          if (res.ok) {
            return { success: true, userId };
          } else {
            const data = await res.json();
            return { success: false, userId, error: data.message || 'Update failed' };
          }
        } catch (err) {
          return { success: false, userId, error: 'Network error' };
        }
      }));

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed === 0) {
        showMessage(`${successful} user(s) updated to role '${targetRole}'`, 'success');
      } else {
        const failedUsers = results.filter(r => !r.success).map(r => `${r.userId}: ${r.error}`).join(', ');
        showMessage(`Updated ${successful} user(s), failed to update ${failed}: ${failedUsers}`, 'error');
      }
      load();
    });

    document.getElementById('delete-selected')?.addEventListener('click', async () => {
      const selectedIds = Array.from(document.querySelectorAll('.select-user:checked')).map(cb => cb.dataset.userId);
      if (!selectedIds.length) {
        alert('No users selected for deletion');
        return;
      }
      if (!confirm(`Delete ${selectedIds.length} user(s)? This cannot be undone.`)) return;

      const results = await Promise.all(selectedIds.map(async (userId) => {
        try {
          const res = await fetch(`admin/api/users/${userId}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            return { success: true, userId };
          } else {
            const data = await res.json();
            return { success: false, userId, error: data.message || 'Deletion failed' };
          }
        } catch (err) {
          return { success: false, userId, error: 'Network error' };
        }
      }));

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed === 0) {
        showMessage(`${successful} user(s) deleted`, 'success');
      } else {
        const failedUsers = results.filter(r => !r.success).map(r => `${r.userId}: ${r.error}`).join(', ');
        showMessage(`Deleted ${successful} user(s), failed to delete ${failed}: ${failedUsers}`, 'error');
      }
      load();
    });

    load();
  }

  if (rolesContainer) {
    loadRoles();
  }

  // ---- System Settings ----
  const aiLogCutoffSelect = document.getElementById('ai-log-cutoff');
  const saveAiLogCutoffBtn = document.getElementById('save-ai-log-cutoff');
  const systemMessagesDiv = document.getElementById('system-messages');
  const customCutoffContainer = document.getElementById('custom-cutoff-container');
  const customCutoffValue = document.getElementById('custom-cutoff-value');
  const customCutoffUnit = document.getElementById('custom-cutoff-unit');

  function showSystemMessage(message, type = 'success') {
    if (!systemMessagesDiv) return;
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    systemMessagesDiv.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => { systemMessagesDiv.innerHTML = ''; }, 5000);
  }

  // Preset values for matching loaded settings back to dropdown
  const presetValues = [
    '3600000', '21600000', '43200000', '86400000',
    '259200000', '604800000', '1209600000', '2592000000', '-1'
  ];

  function setRetentionUI(ms) {
    if (ms === -1) {
      aiLogCutoffSelect.value = '-1';
      if (customCutoffContainer) customCutoffContainer.style.display = 'none';
    } else if (presetValues.includes(String(ms))) {
      aiLogCutoffSelect.value = String(ms);
      if (customCutoffContainer) customCutoffContainer.style.display = 'none';
    } else {
      // Non-preset value — show custom UI
      aiLogCutoffSelect.value = 'custom';
      if (customCutoffContainer) customCutoffContainer.style.display = '';
      // Find the best unit to display
      const units = [31536000000, 2592000000, 86400000, 3600000, 60000];
      for (const unit of units) {
        if (ms >= unit && ms % unit === 0) {
          customCutoffUnit.value = String(unit);
          customCutoffValue.value = ms / unit;
          return;
        }
      }
      // Fallback: show in minutes
      customCutoffUnit.value = '60000';
      customCutoffValue.value = Math.round(ms / 60000);
    }
  }

  const defaultThemeSelect = document.getElementById('default-theme-select');
  const saveDefaultThemeBtn = document.getElementById('save-default-theme');

  if (aiLogCutoffSelect || defaultThemeSelect) {
    // Load current setting
    try {
      const res = await fetch('admin/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (aiLogCutoffSelect && data.aiLogCutoff !== undefined) {
          setRetentionUI(data.aiLogCutoff);
        }
        if (defaultThemeSelect && data.defaultTheme) {
          defaultThemeSelect.value = data.defaultTheme;
        }
      }
    } catch (err) {
      console.error('Error loading system settings:', err);
    }
  }

  // Show/hide custom duration inputs
  if (aiLogCutoffSelect) {
    aiLogCutoffSelect.addEventListener('change', () => {
      if (customCutoffContainer) {
        customCutoffContainer.style.display = aiLogCutoffSelect.value === 'custom' ? '' : 'none';
      }
    });

    saveAiLogCutoffBtn?.addEventListener('click', async () => {
      let value;
      if (aiLogCutoffSelect.value === 'custom') {
        const num = Number(customCutoffValue?.value);
        const unit = Number(customCutoffUnit?.value);
        if (!num || num < 1 || !unit) {
          showSystemMessage('Please enter a valid duration.', 'error');
          return;
        }
        value = num * unit;
      } else {
        value = Number(aiLogCutoffSelect.value);
      }

      try {
        const res = await fetch('admin/api/settings/ai-log-cutoff', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        });

        if (res.ok) {
          showSystemMessage('AI log retention updated successfully.');
        } else {
          const data = await res.json();
          showSystemMessage(data.message || 'Error updating setting.', 'error');
        }
      } catch (err) {
        console.error(err);
        showSystemMessage('Error updating setting.', 'error');
      }
    });
  }

  if (defaultThemeSelect) {
    saveDefaultThemeBtn?.addEventListener('click', async () => {
      const defaultTheme = defaultThemeSelect.value;
      try {
        const res = await fetch('admin/api/settings/default-theme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultTheme })
        });

        if (res.ok) {
          showSystemMessage('Default theme updated successfully.');
        } else {
          const data = await res.json();
          showSystemMessage(data.message || 'Error updating default theme.', 'error');
        }
      } catch (err) {
        console.error(err);
        showSystemMessage('Error updating default theme.', 'error');
      }
    });
  }

  const shutdownButton = document.getElementById('shutdown-server');
  const restartButton = document.getElementById('restart-server');
  const hasShutdownPermission = (window.USER_PERMISSIONS || []).includes('shutdown:server');
  const hasRestartPermission = (window.USER_PERMISSIONS || []).includes('restart:server');

  // Hide buttons if user lacks permission
  if (shutdownButton && !hasShutdownPermission) {
    shutdownButton.style.display = 'none';
  }
  if (restartButton && !hasRestartPermission) {
    restartButton.style.display = 'none';
  }

  if (shutdownButton && hasShutdownPermission) {
    shutdownButton.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to shut down the server now?')) return;
      try {
        const res = await fetch('admin/api/settings/shutdown', { method: 'POST' });
        if (res.ok) {
          showSystemMessage('Server shutdown initiated.', 'success');
        } else {
          const data = await res.json();
          showSystemMessage(data.message || 'Failed to initiate shutdown.', 'error');
        }
      } catch (err) {
        console.error(err);
        showSystemMessage('Failed to initiate shutdown.', 'error');
      }
    });
  }

  if (restartButton && hasRestartPermission) {
    restartButton.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to restart the server now?')) return;
      try {
        const res = await fetch('admin/api/settings/restart', { method: 'POST' });
        if (res.ok) {
          showSystemMessage('Server restart initiated.', 'success');
        } else {
          const data = await res.json();
          showSystemMessage(data.message || 'Failed to initiate restart.', 'error');
        }
      } catch (err) {
        console.error(err);
        showSystemMessage('Failed to initiate restart.', 'error');
      }
    });
  }
});