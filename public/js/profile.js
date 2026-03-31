// profile.js
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('change-password-form');
  const messages = document.getElementById('profile-messages');

  function showMessage(msg, type='success'){
    messages.innerHTML = `<div class="alert ${type==='success' ? 'alert-success' : 'alert-error'}">${msg}</div>`;
    setTimeout(()=> messages.innerHTML='', 5000);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      showMessage('New passwords do not match.', 'error');
      return;
    }

    try {
      const res = await fetch('api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        showMessage(data.message || 'Password changed successfully', 'success');
        form.reset();
      } else {
        showMessage(data.message || 'Error changing password', 'error');
      }
    } catch (err) {
      console.error(err);
      showMessage('Error changing password', 'error');
    }
  });
});