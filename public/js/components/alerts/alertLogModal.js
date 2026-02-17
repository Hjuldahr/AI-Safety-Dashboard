/**
 * alertLogModal.js
 * Handles the detailed view of an alert log and links to AI logs.
 */

import { populateRuleBuilder } from './createAlertModal.js';

export function initAlertLogModal(modalManager) {

    // This is the function we return to be called by alerts.js
    async function openAlertLogModal(logId) {
        // Show a loading state or just fetch immediately
        try {
            const log = await apiGetAlertLogDetails(logId);
            renderModal(log);
        } catch (error) {
            console.error("Failed to load alert log details:", error);
            alert("Could not load alert details.");
        }
    }

    async function apiGetAlertLogDetails(id) {
        const res = await fetch(`alerts/api/log/${id}`);
        if (!res.ok) throw new Error("Log not found");
        return await res.json();
    }

    function renderModal(log) {
        try {
            const snapshot = log.alertSnapshot || {};
            const title = `Alert Detail: ${snapshot.alertName || 'Alert'}`;

            const bodyNode = document.createElement('div');
            bodyNode.className = 'alert-detail-container';

            const date = new Date(log.timestamp).toLocaleString('en-CA', {
                dateStyle: 'long',
                timeStyle: 'medium'
            });

            // Create a container for the rules instead of a <pre> tag
            const rulesContainer = document.createElement('div');
            rulesContainer.className = "rule-builder-inputs read-only-view";

            bodyNode.innerHTML = `
            <div class="detail-section">
                <p><strong>Triggered At:</strong> ${date}</p>
                <p><strong>Level:</strong> <span class="level-badge ${snapshot.alertLevel?.toLowerCase()}">${snapshot.alertLevel}</span></p>
                <p><strong>Model(s):</strong> ${snapshot.modelName || 'N/A'}</p>
                <hr>
                <p><strong>Rule Logic:</strong></p>
                <div id="log-rules-viewer"></div> 
            </div>
            
            <div class="detail-section mt-4">
                <h5><i class="fa-solid fa-microchip"></i> Associated AI Logs</h5>
                <p class="text-muted small">These logs contain the specific data frames that triggered this alert.</p>
                <div class="ai-log-links">
                    ${renderAiLogLinks(log.logs)}
                </div>
            </div>
        `;

            // Insert the rules into the viewer container
            const viewer = bodyNode.querySelector('#log-rules-viewer');
            populateRuleBuilder(viewer, snapshot.alertRule, DATA_DICTIONARY, true);

            const footerNode = document.createElement('div');
            footerNode.className = "modal-footer-inner";
            const closeBtn = document.createElement('button');
            closeBtn.className = "btn btn-secondary";
            closeBtn.innerText = "Close";
            closeBtn.onclick = () => modalManager.close();
            footerNode.appendChild(closeBtn);

            modalManager.open(title, bodyNode, footerNode, "large-modal");
        } catch (error) {
            console.error(error);
        }
    }

    function renderAiLogLinks(logs) {
        if (!logs || logs.length === 0) return `<p>No AI logs associated.</p>`;

        return logs.map((logId, index) => {
            // As you scale, you might want to include model names in the link text
            // For now, we'll label them as Log 1, Log 2 etc., or by ID
            return `
                <a href="/logs/AI/${logId}" class="ai-log-link-item">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                    View AI Log Data (${logId.substring(logId.length - 6)})
                </a>
            `;
        }).join('');
    }

    return openAlertLogModal;
}