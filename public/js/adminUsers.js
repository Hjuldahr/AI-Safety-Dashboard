document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('users-container');

  if (!container) return;

  async function fetchUsers() {
    const res = await fetch('/admin/api/users');
    if (!res.ok) return;
    const data = await res.json();
    return data.users;
  }

  function renderTable(users) {
    const rows = users.map(u => {
      const currentRole = (u.roles && u.roles[0]) || '';
      const options = window.AVAILABLE_ROLES.map(r => `<option value="${r}" ${r === currentRole ? 'selected' : ''}>${r}</option>`).join('');
      const disabledAttr = (String(window.CURRENT_USER_ID) === String(u._id)) ? 'disabled' : '';
      const saveBtnDisabled = disabledAttr ? 'disabled' : '';

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
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="table">
        <thead><tr><th>Username</th><th>Email</th><th>Role</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    // Attach event listeners
    container.querySelectorAll('.save-role').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const tr = e.target.closest('tr');
        const userId = tr.dataset.userId;
        const select = tr.querySelector('.role-select');
        const role = select.value;

        try {
          const res = await fetch(`/admin/api/users/${userId}/roles`, {
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
  }

  async function load() {
    const users = await fetchUsers();
    if (users) renderTable(users);
  }

  load();
});