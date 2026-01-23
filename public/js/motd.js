document.addEventListener('DOMContentLoaded', function () {
    banner = document.querySelector("#motd-banner")
    text = document.querySelector("#motd-text")
    dismissButton = document.querySelector("#dismiss-button");

    dismissButton.addEventListener("click", () => {
        banner.classList.add("hidden")
    });
});