document.addEventListener('DOMContentLoaded', function () {
    const switchToAITable = document.querySelector("#switchToAITable"); //button
    const switchToUserTable = document.querySelector("#switchToAITable"); //button
    const logTableContainer = document.querySelector("#logTableContainer"); //div
    const AILogFilter = document.querySelector("#AILogFilter"); //form

    //toggle if visible or not (effects both view and export)
    var currentlySelected = "userLogs"
    var filterPolicyCompliace = true
    var filterResponseHelpfulness = true
    var filterResponseTime = true
    var filterEnergyConsumption = true
    var filterResponseTimestamp = true
    var startDate = 0
    var endDate = -1

    AILogFilter.addEventListener("submit", event => {
        startDate = new Date(AILogFilter["start"].value).getTime()
        endDate = new Date(AILogFilter["end"].value).getTime()
        refreshCurrentTable()
    });

    switchToAITable.addEventListener('click', () => {
        currentlySelected = "AILogs"
        refreshCurrentTable()
    })

    switchToUserTable.addEventListener('click', () => {
        currentlySelected = "UserLogs"
        refreshCurrentTable()
    })

    async function refreshCurrentTable() {
        if (currentlySelected == "AILogs") {
            refreshAITable()
        } else {
            refreshUserTable()
        }
    }

    async function refreshAITable() {
        const response = await fetch('/api/getFilteredAILogs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                modelID, 
                filterPolicyCompliace, 
                filterResponseHelpfulness, 
                filterResponseTime, 
                filterEnergyConsumption, responseTimestamp, startDate, endDate }),
        });

        //TODO generate html
    }

    async function refreshUserTable() {
        //TODO setup
        const response = await fetch('/api/getFilteredUserLogs', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ }),
        });
    }
});