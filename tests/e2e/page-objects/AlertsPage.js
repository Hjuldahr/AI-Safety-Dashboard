import { BasePage } from './BasePage.js';
import { PaginationComponent } from './components/PaginationComponent.js';

export class AlertsPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/alerts';

    // Stat cards
    this.countCritical = page.locator('#count-critical');
    this.countHigh = page.locator('#count-high');
    this.countMedium = page.locator('#count-medium');
    this.countInfo = page.locator('#count-info');

    // Filter form
    this.filterForm = page.locator('#history-filter-form');
    this.filterLevel = page.locator('#filter-level');
    this.filterModel = page.locator('#filter-model');
    this.filterTag = page.locator('#filter-tag');
    this.filterStartDate = page.locator('#filter-start-date');
    this.filterEndDate = page.locator('#filter-end-date');
    this.applyButton = this.filterForm.locator('button[type="submit"]');
    this.clearButton = this.filterForm.locator('.clear-filters');

    // Action buttons
    this.createAlertButton = page.locator('#open-create-modal-btn');
    this.manageAlertsButton = page.locator('#open-manage-modal-btn');
    this.manageTagsButton = page.locator('#open-tags-modal-btn');
    this.liveUpdateToggle = page.locator('#live-update-toggle');

    // Table
    this.alertLogBody = page.locator('#alert-log-body');
    this.alertLogTable = page.locator('.alert-log-table');

    // Charts
    this.chartPie = page.locator('#chart-pie');
    this.chartBar = page.locator('#chart-bar');
    this.chartLine = page.locator('#chart-line');
    this.chartRangeSelect = page.locator('#chart-range-select');

    // Pagination
    this.pagination = new PaginationComponent(page, '#history-pagination');
  }

  async waitForReady() {
    await this.alertLogTable.waitFor({ state: 'visible' });
  }

  /** Get alert stat counts as an object. */
  async getStatCounts() {
    const [critical, high, medium, info] = await Promise.all([
      this.countCritical.textContent(),
      this.countHigh.textContent(),
      this.countMedium.textContent(),
      this.countInfo.textContent(),
    ]);
    return {
      critical: parseInt(critical, 10),
      high: parseInt(high, 10),
      medium: parseInt(medium, 10),
      info: parseInt(info, 10),
    };
  }

  /** Filter alerts by severity level. */
  async filterByLevel(level) {
    await this.filterLevel.selectOption(level);
  }

  /** Filter alerts by model name. */
  async filterByModel(model) {
    await this.filterModel.selectOption(model);
  }

  /** Set date range filters. */
  async filterByDateRange(start, end) {
    await this.filterStartDate.fill(start);
    await this.filterEndDate.fill(end);
  }

  /** Click the Apply button on the filter form. */
  async applyFilters() {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/alerts') && resp.status() === 200,
      { timeout: 10_000 }
    ).catch(() => null);
    await this.applyButton.click();
    await responsePromise;
  }

  /** Click the Clear button to reset all filters. */
  async clearFilters() {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/alerts') && resp.status() === 200,
      { timeout: 10_000 }
    ).catch(() => null);
    await this.clearButton.click();
    await responsePromise;
  }

  /** Open the create alert modal. */
  async clickCreateAlert() {
    await this.createAlertButton.click();
    await this.modal.waitForOpen();
  }

  /** Open the manage active alerts modal. */
  async clickManageAlerts() {
    await this.manageAlertsButton.click();
    await this.modal.waitForOpen();
  }

  /** Open the tag management modal. */
  async clickManageTags() {
    await this.manageTagsButton.click();
    await this.modal.waitForOpen();
  }

  /** Toggle live updates on/off. */
  async toggleLiveUpdates() {
    // The checkbox is visually hidden inside a CSS toggle switch;
    // click the parent <label> instead.
    await this.liveUpdateToggle.evaluate((el) => el.click());
  }

  /** Check if live updates toggle is checked. */
  async isLiveUpdatesEnabled() {
    return this.liveUpdateToggle.isChecked();
  }

  /** Select chart time range (24h, 7d, 30d). */
  async selectChartRange(range) {
    await this.chartRangeSelect.selectOption(range);
  }

  /** Count rows in the alert log table. */
  async getAlertRowCount() {
    // Wait briefly for data to load
    await this.page.waitForTimeout(500);
    const rows = this.alertLogBody.locator('tr');
    const count = await rows.count();
    // If there's a single row with "Loading" or "No", it's empty
    if (count === 1) {
      const text = await rows.first().textContent();
      if (text.includes('Loading') || text.includes('No ')) return 0;
    }
    return count;
  }

  /** Check if charts are rendered. */
  async areChartsVisible() {
    const [pie, bar, line] = await Promise.all([
      this.chartPie.isVisible(),
      this.chartBar.isVisible(),
      this.chartLine.isVisible(),
    ]);
    return pie && bar && line;
  }
}
