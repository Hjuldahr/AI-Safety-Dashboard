

export const viewAlertLog = (modelManager, alertObj) => {
    const { _id, alertName, modelName, alertLevel, alertRule, created, tags } = alertObj;

    const content = getModalHTML(alertObj);
    const footer = getFooterHTML();

    const title = alertName;

    modelManager.open(title, content, footer, "large-modal", attachListeners);
}

function getModalHTML(alertObj) {
    return `
        <p>its not this easy</p>
    `;
}

function getFooterHTML() {
    return `
        <button id="close-alert-log-modal" class="btn btn-secondary close-alert-btn">Cancel</button>
        <button id="save-alert-btn" class="btn btn-primary">Save Alert</button>
    `;
}

function attachListeners(modelManager) {
    const cancelTagsBtn = document.getElementById("close-alert-log-modal");

    cancelTagsBtn?.addEventListener("click", () => {
        modelManager.close();
    })
}