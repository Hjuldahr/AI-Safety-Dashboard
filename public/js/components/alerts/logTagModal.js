import TagSelect from '../tags/tagSelect.js';

/**
 * Initializes the Log Tagging Modal
 * @param {ModalManager} modalManager 
 * @param {Object} options - { tagsCache, onSaveSuccess }
 */
export function initLogTagModal(modalManager, { tagsCache, onSaveSuccess }) {

    async function openLogTagModal(logId, currentTagIds) {
        // Build the Body Node
        const bodyNode = document.createElement('div');
        bodyNode.className = 'multiselect-container';
        // bodyNode.style.minHeight = "250px";
        
        bodyNode.innerHTML = `
            <div class="tags-input-container" id="dyn-tags-input">
                <input type="text" id="dyn-tags-search" class="tags-search-input" placeholder="Select tags..." readonly />
            </div>
            <div class="tags-dropdown" id="dyn-tags-dropdown" style="display: none;"></div>
        `;

        // Initialize TagSelect logic for this specific modal instance
        const tagSelect = new TagSelect({
            containerId: 'dyn-tags-input',
            searchInputId: 'dyn-tags-search',
            dropdownId: 'dyn-tags-dropdown',
            customContainer: bodyNode // Pass the node so TagSelect finds internal elements
        });

        await tagSelect.init();

        const cleanupTagSelect = () => {
            tagSelect.destroy();
            modalManager.unregisterCloseCallback(cleanupTagSelect);
        };
        modalManager.registerCloseCallback(cleanupTagSelect);

        tagSelect.setSelectedIds(currentTagIds);

        // Build the Footer Node
        const footerNode = document.createElement('div');
        footerNode.className = "modal-footer-inner";

        const cancelBtn = document.createElement('button');
        cancelBtn.className = "btn btn-secondary";
        cancelBtn.innerText = "Cancel";
        cancelBtn.onclick = () => modalManager.close();

        const saveBtn = document.createElement('button');
        saveBtn.className = "btn btn-primary";
        saveBtn.innerText = "Save Tags";
        
        saveBtn.onclick = async () => {
            const selected = tagSelect.getSelectedIds();
            try {
                // ToDo: Update this to check if its an alert log or an ai log / summary
                const res = await fetch(`alerts/api/logs/${logId}/tags`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tags: selected })
                });
                
                if (!res.ok) throw new Error('Update failed');
                
                modalManager.close();
                if (onSaveSuccess) onSaveSuccess();
            } catch (e) {
                alert('Failed to update tags: ' + e.message);
            }
        };

        footerNode.appendChild(cancelBtn);
        footerNode.appendChild(saveBtn);

        // Open via Manager
        modalManager.open("Tag Alert Log", bodyNode, footerNode, "medium-modal");
    }

    return openLogTagModal;
}