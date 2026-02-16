import ModalManager from "../modals.js";

// State
let deletedTagIds = []; //Holds tags that have been removed from the UI but not the backend yet

const openTagsBtn = document.getElementById('open-tags-modal-btn');

const modal = new ModalManager();


// Tag Manager Modal
if (openTagsBtn) {
    openTagsBtn.addEventListener('click', () => {
        deletedTagIds = [];
        renderTagManager();
    });
}

// Starter Method - renders the modal then adds event listeners
async function renderTagManager() {
    const tagModalHTML = await assembleTagModalHTML();
    const tagModalFooterHTML = footerHTML();

    // Open the modal - passing the addModalListeners method to add interactivity to the modal
    modal.open("Manage Tags", tagModalHTML, tagModalFooterHTML, "medium-modal", addModalListeners);
}

// Creates the Modal's HTML content
async function assembleTagModalHTML() {
    let modalHTML = "";

    // Fetch latest tags from backend
    const tags = await apiListTags();

    modalHTML += "<div id='tag-manager-rows'>";

    // Loop over tags and add each of them to the modal
    for (const tag of tags) {
        modalHTML += tagRowHTML(tag._id, tag.name, tag.color);
    }

    modalHTML += "</div>";

    // Add the add new tag button at the end
    modalHTML += newTagBtn;

    return modalHTML;
}

// Adds the listeners / functionality to the modal
function addModalListeners() {
    const addTagRowBtn = document.getElementById('add-tag-row-btn');
    const saveTagsBtn = document.getElementById('save-tags-btn');
    const cancelTagsBtn = document.getElementById("close-tags-modal");

    const tagManagerRows = document.getElementById('tag-manager-rows');

    addTagRowBtn?.addEventListener("click", () => {
        const rows = tagManagerRows.querySelectorAll('.tag-edit-row');

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

        tagManagerRows.insertAdjacentHTML('beforeend', tagRowHTML());
        tagManagerRows.scrollTop = tagManagerRows.scrollHeight;
    });

    // Delete Tag Btn
    tagManagerRows?.addEventListener('click', (e) => {
        // Check if the click was on the trash icon or the button
        const deleteBtn = e.target.closest('.delete-tag-btn');
        if (deleteBtn) {
            const row = deleteBtn.closest('.tag-edit-row');
            const tagId = row.querySelector('.tag-name-input').dataset.originalId;

            if (tagId) deletedTagIds.push(tagId); // Track for backend sync
            row.remove();
        }
    });

    // Save Changes Button
    saveTagsBtn?.addEventListener('click', async () => {
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
    });

    // Cancel Button
    cancelTagsBtn?.addEventListener("click", () => {
        modal.close();
    })
}


// --- Hard Coded HTML Strings / String Creator Functions ---
// Keep these seperate for code readability / fututure editing.
const newTagBtn = `<button id="add-tag-row-btn" class="btn btn-sm btn-secondary" style="margin-top: 10px">
                        <i class="fa-solid fa-plus"></i> Add New Tag
                    </button>`;


const tagRowHTML = (id = "", name = "", color = "#888888") => {
    return `
        <div class="tag-edit-row">
            <input type="text" placeholder="Tag Name" value="${name}" class="tag-name-input" data-original-id="${id}">
            <input type="color" value="${color}" class="tag-color-input">
            <button class="btn btn-secondary delete-tag-btn"><i class="fa-solid fa-trash"></i></button>
        </div>
        `;
};

const footerHTML = () => {
    return `
    <button id="close-tags-modal" class="btn btn-secondary close-modal-btn">
        Cancel
    </button>
    <button id="save-tags-btn" class="btn btn-primary">
        Save Changes
    </button>
    `;
};


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