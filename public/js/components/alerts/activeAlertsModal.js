/**
 * activeAlertsModal.js
 * Logic for the "Active Rules" management modal.
 */

export function initActiveAlertsModal(modalManager, { onEdit, onDeleteSuccess }) {
    
    // 1. Create the Footer (Static)
    const createFooter = () => {
        const footer = document.createElement('div');
        footer.className = "modal-footer-inner";

        const closeBtn = document.createElement('button');
        closeBtn.className = "btn btn-secondary";
        closeBtn.innerText = "Close";
        closeBtn.onclick = () => modalManager.close();

        footer.appendChild(closeBtn);
        return footer;
    };

    // 2. Create the Body (Dynamic)
    async function assembleBody() {
        const container = document.createElement('div');
        const list = document.createElement('ul');
        list.className = 'live-alerts-list';

        try {
            const res = await fetch('alerts/live');
            const data = await res.json();
            const alerts = data.alerts || [];

            if (alerts.length === 0) {
                container.innerHTML = '<p style="color:#888; padding: 20px; text-align: center;">No active rules found.</p>';
                return container;
            }

            alerts.forEach(alert => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div>
                        <span class="level-badge ${alert.alertLevel.toLowerCase()}">${alert.alertLevel}</span> 
                        <strong>${alert.alertName}</strong>
                    </div>
                    <div class="alert-actions">
                        <button class="btn btn-secondary btn-icon edit-btn" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn btn-secondary btn-icon delete-btn" style="color:#dc2626;" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;

                // Edit Logic
                li.querySelector('.edit-btn').onclick = () => {
                    onEdit(alert);
                };

                // Delete Logic
                li.querySelector('.delete-btn').onclick = async () => {
                    if (confirm(`Are you sure you want to delete "${alert.alertName}"?`)) {
                        await fetch(`alerts/${alert._id}`, { method: 'DELETE' });
                        onDeleteSuccess();
                        // Re-render the body to show updated list
                        const newBody = await assembleBody();
                        modalManager.body.replaceChildren(newBody);
                    }
                };

                list.appendChild(li);
            });

            container.appendChild(list);
        } catch (err) {
            container.innerHTML = `<p class="text-error">Error loading alerts: ${err.message}</p>`;
        }

        return container;
    }

    // 3. The "Open" Trigger
    return async function openActiveAlertsModal() {
        const bodyNode = await assembleBody();
        const footerNode = createFooter();
        modalManager.open("Active Rules", bodyNode, footerNode, "medium-modal");
    };
}