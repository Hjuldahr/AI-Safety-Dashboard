import ModalManager from "../modals.js";

// State
let deletedTagIds = []; //Holds tags that have been removed from the UI but not the backend yet

const openTagsBtn = document.getElementById('open-tags-modal-btn');

const modal = new ModalManager();


// Tag Manager Modal
if (openTagsBtn) {
    openTagsBtn.addEventListener('click', () => {
        renderTagManager();
    });
}

// Starter Method - renders the modal then adds event listeners
async function renderTagManager() {
    deletedTagIds = [];

    const bodyNode = await assembleTagModalNode();
    const footerNode = createTagFooter(saveTagChanges);

    // Open the modal
    modal.open("Manage Tags", bodyNode, footerNode, "medium-modal");
}

// Creates the Modal's HTML content
async function assembleTagModalNode() {
    const container = document.createElement('div');
    const rowsContainer = document.createElement('div');
    rowsContainer.id = 'tag-manager-rows';

    const tags = await apiListTags();
    tags.forEach(tag => {
        rowsContainer.appendChild(createTagRow(tag._id, tag.name, tag.color));
    });

    // Add Tag Button
    const addBtn = document.createElement('button');
    addBtn.className = "btn btn-sm btn-secondary";
    addBtn.style.marginTop = "10px";
    addBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Add New Tag`;

    addBtn.addEventListener('click', () => {
        
        const rows = rowsContainer.querySelectorAll('.tag-edit-row');

        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const lastInput = lastRow.querySelector('.tag-name-input');

            if (lastInput.value.trim() === "") {
                // highlight the input so the user knows why they can't add more
                // ToDo: Optionally add an error message like "Please include a tag title" or something
                lastInput.focus();
                lastInput.style.outline = "2px solid #dc2626";
                setTimeout(() => lastInput.style.outline = "", 1000);
                return; // Stop the function here
            }
        }
    
        rowsContainer.appendChild(createTagRow());
        rowsContainer.scrollTop = rowsContainer.scrollHeight;
    });

    container.appendChild(rowsContainer);
    container.appendChild(addBtn);

    return container;
}

async function saveTagChanges() {
    const tagManagerRows = document.getElementById('tag-manager-rows');
    const rows = tagManagerRows.querySelectorAll('.tag-edit-row');
    const originalIds = [], newNames = [], colors = [];
    let isValid = true; const seen = new Set();

    rows.forEach(r => {
        const name = r.querySelector('.tag-name-input').value.trim();
        const color = r.querySelector('.tag-color-input').value;
        const oid = r.querySelector('.tag-name-input').dataset.originalId || null;
        if (!name) return;
        if (seen.has(name.toLowerCase())) { alert(`Duplicate: ${name}`); isValid = false; return; }
        seen.add(name.toLowerCase());
        newNames.push(name); colors.push(color); originalIds.push(oid);
    });
    if (!isValid) return;

    try {
        await apiSyncTags({ originalIds, newNames, colors, deletions: deletedTagIds });

        // Notifiy alerts.js of the update
        const event = new CustomEvent('tagsUpdated');
        document.dispatchEvent(event);

        modal.close();
    } catch (e) { alert('Save failed: ' + e.message); }

}

function createTagRow(id = "", name = "", color = "#888888") {
    const row = document.createElement('div');
    row.className = 'tag-edit-row';
    row.innerHTML = `
        <input type="text" placeholder="Tag Name" value="${name}" class="tag-name-input" data-original-id="${id}">
        <input type="color" value="${color}" class="tag-color-input">
        <button class="btn btn-secondary delete-tag-btn"><i class="fa-solid fa-trash"></i></button>
    `;

    // Attach listener immediately to the specific button in this row
    row.querySelector('.delete-tag-btn').addEventListener('click', () => {
        if (id) deletedTagIds.push(id);
        row.remove();
    });

    return row;
}

function createTagFooter(onSave) {
    const footer = document.createElement('div');
    footer.className = "modal-footer-inner"; // Add your styling class

    const cancelBtn = document.createElement('button');
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.innerText = "Cancel";
    cancelBtn.onclick = () => modal.close();

    const saveBtn = document.createElement('button');
    saveBtn.className = "btn btn-primary";
    saveBtn.innerText = "Save Changes";
    saveBtn.onclick = onSave;

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    return footer;
}


// --- API Helper Functions ---

// These have been expaneded out to make them more readable
async function apiListTags() {
    const result = await fetch('tags');
    const data = await result.json();
    const tags = data.tags;
    return tags;
}

async function apiSyncTags(content) {
    const result = await fetch("tags/sync", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
    });
    const data = await result.json();
    return data;
}