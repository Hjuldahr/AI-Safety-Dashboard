const modelSelectors = document.querySelector("#modelSelectors");
const modelHeader = document.querySelector("#modelHeader");
const firstPageSelector = document.querySelector("#firstPageSelector");
const prevPageSelector = document.querySelector("#prevPageSelector");
const nextPageSelector = document.querySelector("#nextPageSelector");
const lastPageSelector = document.querySelector("#lastPageSelector");
const pageIndicator = document.querySelector("#pageIndicator");
const modelLabel = document.querySelector("#modelLabel");
const modelLogTable = document.querySelector("#modelLogTable");

const recordsPerPage = 100;
let availableModels = []
let currentPage = 0;
let totalPages = 1;
let currentModel = null; //sets / default to first model on load

getAllUserModels(); 
updateModelSelector();
readCookie(); 
getCurrentModelLogPage(); 

// get all models used by user from database
function getAllUserModels() {
    
}

function updateModelSelector() {

}

// get all log entries for current page of current model
function getCurrentModelLogPage() {

}

function readCookie() {
    let cookieString = decodeURIComponent(document.cookie);
    let cookieParts = cookieString.split(';');

    for (let i = 0; i < cookieParts.length; i++) {
        let cookiePart = cookieParts[i].trimStart();
        if (cookiePart.indexOf("logPage=") == 0) {
            currentPage = Number(cookiePart.substring("logPage=".length, cookiePart.length).trim());
            if (currentPage >= totalPages) { //clamp to current log length
                currentPage = totalPages - 1
            }
        } else if (cookiePart.indexOf("logModel=") == 0) {
            currentModel = cookiePart.substring("logModel=".length, cookiePart.length).trim();
        }
    }
}

function updateLogPanel() {
    //TODO query logging database by user & selected model and populate log table rows

    pageIndicator.innerText = "Page: " + (currentPage + 1) + " / " + totalPages
}



firstPageSelector.addEventListener("click", () => {
    currentPage = 0;
    updateLogPanel()
})

prevPageSelector.addEventListener("click", () => {
    currentPage = (currentPage - 1) % totalPages; 
    updateLogPanel()
})

nextPageSelector.addEventListener("click", () => {
    currentPage = (currentPage + 1) % totalPages; 
    updateLogPanel()
})

lastPageSelector.addEventListener("click", () => {
    page = totalPages;
    updateLogPanel()
})