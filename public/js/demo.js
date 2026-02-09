/**
 * client side javascript for demo page
 * Handles user interactions and API calls for model scenarios.
 */

class DemoManager {
    constructor() {
        this.modelSelect = document.getElementById('modelSelect');
        this.statusDiv = document.getElementById('status');
        this.rogueBtn = document.querySelector('.btn-rogue');
        this.resetBtn = document.querySelector('.btn-reset');

        this.initEventListeners();
    }

    initEventListeners() {
        if (this.rogueBtn) {
            this.rogueBtn.addEventListener('click', () => this.goRogue());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetModel());
        }
    }

    getModelName() {
        return this.modelSelect ? this.modelSelect.value : null;
    }

    updateStatus(message, type) {
        if (!this.statusDiv) return;

        this.statusDiv.textContent = message;
        this.statusDiv.className = ''; // Clear previous classes
        
        if (type === 'rogue') {
            this.statusDiv.classList.add('status-rogue');
        } else if (type === 'normal') {
            this.statusDiv.classList.add('status-normal');
        } else if (type === 'error') {
            this.statusDiv.style.color = '#cf6679'; 
        }
    }

    async goRogue() {
        const modelName = this.getModelName();
        if (!modelName) return;

        try {
            const response = await fetch('demo/rogue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateStatus(data.message, 'rogue');
            } else {
                this.updateStatus('Error: ' + data.error, 'error');
            }
        } catch (e) {
            console.error(e);
            this.updateStatus('Request failed', 'error');
        }
    }

    async resetModel() {
        const modelName = this.getModelName();
        if (!modelName) return;

        try {
            const response = await fetch('demo/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateStatus(data.message, 'normal');
            } else {
                this.updateStatus('Error: ' + data.error, 'error');
            }
        } catch (e) {
            console.error(e);
            this.updateStatus('Request failed', 'error');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.demoManager = new DemoManager();
});
