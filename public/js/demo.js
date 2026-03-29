/**
 * demo.js
 * Client-side logic for the demo page.
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

        /*
        if (window.DEEP_LINK && window.DEEP_LINK.view === 'demo') {
            console.log("Deep link found: ", window.DEEP_LINK);
            const { model } = window.DEEP_LINK;
            this.model
        }
        */
    }

    initEventListeners() {
        this.applyBtn?.addEventListener('click', () => this.applyScenario());
        this.resetBtn?.addEventListener('click', () => this.resetModel());
        this.modelSelect?.addEventListener('change', () => this.updateScenarioList());
    }

    async postJSON(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json().catch(() => ({}));
        return { response, data };
    }

    setTitle(model, scenario = '') {
        document.title = `Demo [${model}] ${scenario}`.trim();
    }

    getModelName() {
        return this.modelSelect?.value || null;
    }

    getScenarioName() {
        return this.scenarioSelect?.value || null;
    }

    updateStatus(message, type = 'normal') {
        if (!this.statusDiv) return;

        this.statusDiv.textContent = message;

        this.statusDiv.classList.remove('status-error', 'status-normal');
        this.statusDiv.classList.add(
            type === 'error' ? 'status-error' : 'status-normal'
        );
    }

    async updateScenarioList() {
        const modelName = this.getModelName();
        if (!modelName) return;

        try {
            const { response, data } = await this.postJSON('demo/list', { modelName });

            if (!response.ok) {
                this.updateStatus(data.error || 'Failed to load scenarios', 'error');
                return;
            }

            const { scenarios = [], currentScenario } = data;

            if (this.scenarioSelect) {
                this.scenarioSelect.innerHTML = scenarios
                    .map(s => `
                        <option value="${s}" ${s === currentScenario ? 'selected' : ''}>
                            ${s}
                        </option>
                    `)
                    .join('');
            }

            this.setTitle(modelName, currentScenario);

        } catch (err) {
            console.error(err);
            this.updateStatus('Request failed', 'error');
        }
    }

    async applyScenario() {
        const modelName = this.getModelName();
        const scenarioName = this.getScenarioName();

        if (!modelName || !scenarioName) return;

        try {
            const { response, data } = await this.postJSON('demo/apply', {
                modelName,
                scenarioName
            });

            if (!response.ok) {
                this.updateStatus('Error: ' + (data.error || 'Unknown error'), 'error');
                this.setTitle(modelName, 'Error');
                return;
            }

            this.updateStatus(data.message, 'normal');
            this.setTitle(modelName, scenarioName);

        } catch (err) {
            console.error(err);
            this.updateStatus('Request failed', 'error');
            this.setTitle(modelName, 'Error');
        }
    }

    async resetModel() {
        const modelName = this.getModelName();
        if (!modelName) return;

        try {
            const { response, data } = await this.postJSON('demo/reset', {
                modelName
            });

            if (!response.ok) {
                this.updateStatus('Error: ' + (data.error || 'Unknown error'), 'error');
                this.setTitle(modelName, 'Error');
                return;
            }

            this.updateStatus(data.message, 'normal');
            await this.updateScenarioList();
            this.setTitle(modelName, 'Normal');

        } catch (err) {
            console.error(err);
            this.updateStatus('Request failed', 'error');
            this.setTitle(modelName, 'Error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.demoManager = new DemoManager();
});