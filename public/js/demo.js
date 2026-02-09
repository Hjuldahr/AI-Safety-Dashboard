/**
 * client side javascript for demo page
 * Handles user interactions and API calls for model scenarios.
 */

class DemoManager {
    constructor() {
        this.modelSelect = document.getElementById('modelSelect');
        this.scenarioSelect = document.getElementById('scenarioSelect');
        this.statusDiv = document.getElementById('status');
        this.applyBtn = document.querySelector('.btn-apply');
        this.resetBtn = document.querySelector('.btn-reset');

        this.initEventListeners();
    }

    initEventListeners() {
        if (this.applyBtn) {
            this.applyBtn.addEventListener('click', () => this.applyScenario());
        }
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => this.resetModel());
        }
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', () => this.updateScenarioList());
        }
    }

    async updateScenarioList() {
        const modelName = this.getModelName();
        if (!modelName) return;

        const response = await fetch('demo/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName })
        });

        const { scenarios, currentScenario } = await response.json();

        const scenarioList = Array.isArray(scenarios) ? scenarios : [];
        this.scenarioSelect.innerHTML = scenarioList
            .map(e => `<option value="${e}" ${e === currentScenario ? "selected" : ""}>${e}</option>`)
            .join('\n');
    }

    getModelName() {
        return this.modelSelect ? this.modelSelect.value : null;
    }

    getScenarioName() {
        return this.scenarioSelect ? this.scenarioSelect.value : null;
    }

    updateStatus(message, type = 'normal') {
        if (!this.statusDiv) return;

        this.statusDiv.textContent = message;
        this.statusDiv.className = ''; // clear previous classes
        this.statusDiv.classList.add(type === 'error' ? 'status-error' : 'status-normal');
    }

    async applyScenario() {
        const modelName = this.getModelName();
        if (!modelName) return;

        const scenarioName = this.getScenarioName();
        if (!scenarioName) return;

        try {
            const response = await fetch('demo/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ modelName, scenarioName })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.updateStatus(data.message, scenarioName);
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
                await this.updateScenarioList();
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
