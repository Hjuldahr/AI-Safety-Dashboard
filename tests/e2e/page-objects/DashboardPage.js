import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/';

    // Chart containers
    this.staticChartsContainer = page.locator('#static-charts-container');
    this.dynamicChartsContainer = page.locator('#dynamic-charts-container');

    // Controls
    this.addChartButton = page.locator('#add_new_chart');
    this.refreshButton = page.locator('#refresh-button');
    this.toggleButton = page.locator('#toggle-button');
    this.fullscreenButton = page.locator('#dashboard-fullscreen-toggle');
    this.modelSelect = page.locator('#model-select');

    // Admin indicator
    this.isAdminInput = page.locator('#isAdmin');
  }

  async waitForReady() {
    await this.staticChartsContainer.waitFor({ state: 'attached' });
  }

  /** Click the "Add New Chart" button. */
  async clickAddChart() {
    await this.addChartButton.click();
  }

  /** Click the refresh button. */
  async clickRefresh() {
    await this.refreshButton.click();
  }

  /** Select a model from the dropdown. */
  async selectModel(modelName) {
    await this.modelSelect.selectOption(modelName);
  }

  /** Get the currently selected model value. */
  async getSelectedModel() {
    return this.modelSelect.inputValue();
  }

  /** Toggle pause/resume for the scheduler. */
  async togglePauseResume() {
    await this.toggleButton.click();
  }

  /** Get the text of the toggle button (e.g., "Pause" or "Resume"). */
  async getToggleButtonText() {
    return this.toggleButton.textContent();
  }

  /** Toggle fullscreen mode. */
  async toggleFullscreen() {
    await this.fullscreenButton.click();
  }

  /** Count canvas elements in the static charts container. */
  async getStaticChartCount() {
    return this.staticChartsContainer.locator('canvas').count();
  }

  /** Count canvas elements in the dynamic charts container. */
  async getDynamicChartCount() {
    return this.dynamicChartsContainer.locator('canvas').count();
  }

  /** Check if the admin-only controls are present. */
  async isAdminControlsVisible() {
    return this.isAdminInput.count().then((c) => c > 0);
  }

  /** Get all model options from the dropdown. */
  async getModelOptions() {
    return this.modelSelect.locator('option').allTextContents();
  }
}
