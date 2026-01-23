document.addEventListener('DOMContentLoaded', async function () {
  const banner = document.querySelector("#motd-banner");
  const text = document.querySelector("#motd-text");
  const redirectURL = document.querySelector("#motd-readmore");
  const dismissButton = document.querySelector("#dismiss-button");

  function updateBanner(json) {
    text.textContent = json.message;
      if (json.redirect) {
        redirectURL.classList.remove('hidden');
        redirectURL.href = `/devlogs/${json.redirect}`;
      } else {
        redirectURL.classList.add('hidden');
        redirectURL.href = `/devlogs/void.html`; //intentional
      }
    banner.classList.remove("hidden");
  }

  const res = await fetch('/api/motd/pull', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  updateBanner(json);

  dismissButton.addEventListener("click", () => {
    banner.classList.add("hidden");
  });

  const evtSource = new EventSource('/events');
  evtSource.addEventListener('motd', (event) => {
    try {
      const json = JSON.parse(event.data);
      updateBanner(json);
    } catch (err) {
      console.error('Error processing SSE message:', err);
    }
  });
});