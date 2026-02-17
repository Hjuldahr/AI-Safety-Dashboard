document.addEventListener('DOMContentLoaded', async () => {
  const usersContainer = document.getElementById('users-container');
  const rolesContainer = document.getElementById('roles-list');
  const permissionsListDiv = document.getElementById('permissions-list');
  const createRoleForm = document.getElementById('create-role-form');
  const roleMessagesDiv = document.getElementById('role-messages');

  let availablePermissions = [];

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
  function renderPermissions(permissions) {
    permissionsListDiv.innerHTML = permissions
      .map(perm => `
        <div class="permission-item">
          <input type="checkbox" id="perm-${perm}" value="${perm}" name="permissions">
          <label for="perm-${perm}">${perm}</label>
        </div>
      `).join('');
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
      const disabledAttr = (String(window.CURRENT_USER_ID) === String(u._id)) ? 'disabled' : '';
      const saveBtnDisabled = disabledAttr ? 'disabled' : '';

      const canDelete = (window.USER_PERMISSIONS || []).includes('manage:users');
      const deleteDisabled = (String(window.CURRENT_USER_ID) === String(u._id)) ? 'disabled' : '';

      return `
        <tr data-user-id="${u._id}">
          <td>${u.username}</td>
          <td>${u.email}</td>
          <td>
            <select class="role-select" ${disabledAttr}>
              ${options}
            </select>
          </td>
          <td>
            <button class="save-role" ${saveBtnDisabled}>Save</button>
          </td>
          <td>
            ${canDelete ? `<button class="btn-danger delete-user" ${deleteDisabled}>Delete</button>` : ''}
          </td>
        </tr>
      `;
    }).join('');

    usersContainer.innerHTML = `
      <table class="table">
        <thead><tr><th>Username</th><th>Email</th><th>Role</th><th></th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    // Attach event listeners
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
            alert('Role updated');
            // refresh list
            load();
          } else {
            const text = await res.json();
            alert('Error: ' + (text.message || 'Unable to update role'));
          }
        } catch (err) {
          console.error(err);
          alert('Error updating role');
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
            alert('User deleted');
            load();
          } else {
            alert('Error: ' + (data.message || 'Unable to delete user'));
          }
        } catch (err) {
          console.error(err);
          alert('Error deleting user');
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
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: #999;">
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

  // Load all data
  async function load() {
    const users = await fetchUsers();
    if (users) renderTable(users);
  }

  // Load roles
  async function loadRoles() {
    const roles = await fetchRoles();
    if (roles) renderRoles(roles);
  }

  // Initialize
  if (usersContainer) {
    // Load permissions and users
    availablePermissions = await fetchPermissions();
    renderPermissions(availablePermissions);
    load();
  }

  // Load roles
  if (rolesContainer) {
    loadRoles();
  }
});