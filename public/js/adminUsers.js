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
    const rows = users.map(u => {
      const currentRole = (u.roles && u.roles[0]) || '';
      const options = window.AVAILABLE_ROLES.map(r => `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`).join('');
      const isCurrentUser = String(window.CURRENT_USER_ID) === String(u._id);
      const saveBtnDisabled = isCurrentUser ? 'disabled' : '';
      const canDelete = (window.USER_PERMISSIONS || []).includes('manage:users');
      const deleteDisabled = isCurrentUser ? 'disabled' : '';

      return `
        <tr data-user-id="${u._id}">
          <td><input type="checkbox" class="select-user" data-user-id="${u._id}" ${isCurrentUser ? 'disabled' : ''}></td>
          <td>${u.username || ''}</td>
          <td>${u.email || ''}</td>
          <td>
            <select class="role-select" ${isCurrentUser ? 'disabled' : ''}>
              ${options}
            </select>
          </td>
          <td><button class="save-role btn btn-primary" ${saveBtnDisabled}>Save</button></td>
          <td>${canDelete ? `<button class="btn-danger delete-user" ${deleteDisabled}>Delete</button>` : ''}</td>
        </tr>
      `;
    }).join('');

    usersContainer.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th><input type="checkbox" id="select-all-table"></th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    // Attach select-all behavior
    const selectAll = document.getElementById('select-all-table');
    selectAll?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      usersContainer.querySelectorAll('.select-user').forEach(cb => {
        cb.checked = checked;
      });
    });

    // Attach event listeners for in-row save
    usersContainer.querySelectorAll('.save-role').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const userId = tr.dataset.userId;
        const select = tr.querySelector('.role-select');
        const role = select.value;

        try {
          const res = await fetch(`admin/api/users/${userId}/roles`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role })
          });

          if (res.ok) {
            showMessage('Role updated');
            load();
          } else {
            const text = await res.json();
            showMessage(`Error: ${text.message || 'Unable to update role'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showMessage('Error updating role', 'error');
        }
      });
    });

    // Attach delete listeners
    usersContainer.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const userId = tr.dataset.userId;

        if (!confirm('Are you sure you want to delete this user account?')) return;

        try {
          const res = await fetch(`admin/api/users/${userId}`, {
            method: 'DELETE'
          });

          const data = await res.json();
          if (res.ok) {
            showMessage('User deleted');
            load();
          } else {
            showMessage(`Error: ${data.message || 'Unable to delete user'}`, 'error');
          }
        } catch (err) {
          console.error(err);
          showMessage('Error deleting user', 'error');
        }
      });
    });
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
  const defaultThemeMessagesDiv = document.getElementById('default-theme-messages');

  function showSystemMessage(message, type = 'success') {
    const msgDiv = defaultThemeMessagesDiv || systemMessagesDiv;
    if (!msgDiv) return;
    const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
    msgDiv.innerHTML = `<div class="alert ${alertClass}">${message}</div>`;
    setTimeout(() => { msgDiv.innerHTML = ''; }, 5000);
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
          aiLogCutoffSelect.value = String(data.aiLogCutoff);
        }
        if (defaultThemeSelect && data.defaultTheme) {
          defaultThemeSelect.value = data.defaultTheme;
        }
      }
    } catch (err) {
      console.error('Error loading system settings:', err);
    }
  }

  if (aiLogCutoffSelect) {
    saveAiLogCutoffBtn?.addEventListener('click', async () => {
      const value = Number(aiLogCutoffSelect.value);
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
});