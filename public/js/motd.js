document.addEventListener("DOMContentLoaded", async function () {
  const banner = document.querySelector("#motd-banner");
  const text = document.querySelector("#motd-text");
  const redirectURL = document.querySelector("#motd-readmore");
  const dismissButton = document.querySelector("#dismiss-button");

  let timeoutId = null;

  function updateBanner(json) {
    if (!json || !json.message) return;

    if (localStorage.getItem("motdDismissed") === "true") return;

    text.textContent = json.message;

    if (json.linkUrl) {
      redirectURL.classList.remove("hidden");
      redirectURL.textContent = json.linkText || "Read more";
      redirectURL.href = json.linkUrl;
    } else {
      redirectURL.classList.add("hidden");
      redirectURL.textContent = "";
      redirectURL.removeAttribute("href");
    }

    banner.style.backgroundColor = json.bground || "";
    banner.classList.remove("hidden");

    if (json.lock) {
      dismissButton.classList.add("hidden");
    } else {
      dismissButton.classList.remove("hidden");
    }

    if (timeoutId) clearTimeout(timeoutId);

    if (json.timeout) {
      timeoutId = setTimeout(() => {
        banner.classList.add("hidden");
        localStorage.setItem("motdDismissed", "true");
      }, json.timeout * 1000);
    }
  }

  const res = await fetch("/api/motd/pull");
  const json = await res.json();

  // **DO NOT reset dismissal here**
  updateBanner(json);

  dismissButton.addEventListener("click", () => {
    banner.classList.add("hidden");
    localStorage.setItem("motdDismissed", "true");
  });

  const evtSource = new EventSource("/events");

  evtSource.addEventListener("motd", (event) => {
    try {
      const json = JSON.parse(event.data);

      // Reset dismissal only when a NEW message arrives
      localStorage.setItem("motdDismissed", "false");

      updateBanner(json);
    } catch (err) {
      console.error("Error processing SSE message:", err);
    }
  });

  evtSource.onerror = () => {
    console.warn("SSE disconnected.");
    evtSource.close();
  };
});
