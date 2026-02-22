/**
 * AILogModal.js
 * Handles the detailed view of an AI log, including managing its tags 
 * and viewing the alerts it triggered.
 */

import TagSelect from '../tags/tagSelect.js';

export function initAILogModal(modalManager, { onSaveSuccess }) {

    async function openAILogModal(logId, tags) {
        let logDetails = {};
        let associatedAlerts = [];

        // Fetch Log Details & Associated Alerts
        try {
            const logRes = await fetch(`logs/ai/${logId}`);
            if (logRes.ok) logDetails = await logRes.json();

            const alertsRes = await fetch(`alerts/api/aiLog/${logId}`);
            if (alertsRes.ok) associatedAlerts = await alertsRes.json();
        } catch (error) {
            console.error("Failed to fetch AI Log details or alerts:", error);
        }

        // Build the Modal Body
        const bodyNode = document.createElement('div');
        bodyNode.className = 'alert-detail-container'; // Reusing your existing CSS class

        const timestamp = logDetails.responseTimestamp 
            ? new Date(logDetails.responseTimestamp).toLocaleString('en-CA', { dateStyle: 'long', timeStyle: 'medium' }) 
            : 'Loading...';

        // Map out the HTML for triggered alerts
        const alertsHtml = associatedAlerts.length > 0 
            ? associatedAlerts.map(alert => `
                <a href="/alerts?id=${alert._id}" class="ai-log-link-item">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    ${alert.alertSnapshot.alertName || 'Unnamed Alert'}
                </a>
              `).join('')
            : '<p class="text-muted small">No alerts were triggered by this log.</p>';

        bodyNode.innerHTML = `
            <div class="detail-section">
                <p><strong>Timestamp:</strong> ${timestamp}</p>
                <p><strong>Model:</strong> ${logDetails.modelName || 'N/A'}</p>
            </div>
            
            <hr>

            <div class="detail-section mt-4">
                <h5><i class="fa-solid fa-tags"></i> Manage Tags</h5>
                <p class="text-muted small">Select tags to categorize this specific AI interaction.</p>
                <div class="multiselect-container mt-2">
                    <div class="tags-input-container" id="ai-modal-tags-input">
                        <input type="text" id="ai-modal-tags-search" class="tags-search-input" placeholder="Select tags..." readonly />
                    </div>
                    <div class="tags-dropdown" id="ai-modal-tags-dropdown" style="display: none;"></div>
                </div>
            </div>

            <hr>

            <div class="detail-section mt-4">
                <h5><i class="fa-solid fa-bell"></i> Triggered Alerts</h5>
                <p class="text-muted small">Alerts that flagged this specific data frame.</p>
                <div class="ai-log-links mt-2">
                    ${alertsHtml}
                </div>
            </div>
        `;

        // Initialize the TagSelect component within this modal
        const tagSelect = new TagSelect({
            containerId: 'ai-modal-tags-input',
            searchInputId: 'ai-modal-tags-search',
            dropdownId: 'ai-modal-tags-dropdown',
            customContainer: bodyNode // Crucial: scopes the querySelectors to this unmounted DOM node
        });

        const activeTagIds = tags.map(tag => tag.originalTagId);

        await tagSelect.init(activeTagIds);

        // Build the Footer (Save & Cancel buttons)
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
            const selectedTags = tagSelect.getSelectedIds();
            try {
                const res = await fetch(`logs/api/ai/${logId}/tags`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tags: selectedTags })
                });
                
                if (!res.ok) throw new Error('Update failed');
                
                modalManager.close();
                if (onSaveSuccess) onSaveSuccess(); // Triggers the page refresh in logging.js
            } catch (e) {
                alert('Failed to update AI Log tags: ' + e.message);
            }
        };

        footerNode.appendChild(cancelBtn);
        footerNode.appendChild(saveBtn);

        // Open the Modal
        modalManager.open("AI Log Info", bodyNode, footerNode, "large-modal");
    }

    return openAILogModal;
}