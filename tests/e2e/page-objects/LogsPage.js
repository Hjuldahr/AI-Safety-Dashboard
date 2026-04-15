import { BasePage } from './BasePage.js';
import { PaginationComponent } from './components/PaginationComponent.js';

export class LogsPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/logs';

    // Tab buttons
    this.userLogsTab = page.locator('#user-logs-btn');
    this.aiLogsTab = page.locator('#ai-logs-btn');
    this.aiSummariesTab = page.locator('#ai-summaries-btn');

    // View containers
    this.userLogView = page.locator('#user-log-view');
    this.aiLogView = page.locator('#ai-log-view');
    this.aiSummaryView = page.locator('#ai-summary-view');

    // User log elements
    this.userLogTbody = page.locator('#user-log-tbody');
    this.userFilterForm = page.locator('#user-filter-form');
    this.userSearch = page.locator('#user-search');
    this.filterStartDate = page.locator('#filter-start-date');
    this.filterEndDate = page.locator('#filter-end-date');
    this.filterEventType = page.locator('#filter-event-type');

    // AI log elements
    this.aiLogAccordion = page.locator('#ai-log-accordion');
    this.aiFilterForm = page.locator('#ai-filter-form');
    this.aiSearch = page.locator('#ai-search');
    this.aiFilterStartDate = page.locator('#ai-filter-start-date');
    this.aiFilterEndDate = page.locator('#ai-filter-end-date');
    this.aiFilterModel = page.locator('#filter-model');

    // AI summary elements
    this.aiSummaryAccordion = page.locator('#ai-summary-accordion');
    this.aiSummaryFilterForm = page.locator('#ai-summary-filter-form');
    this.aiSummarySearch = page.locator('#ai-summary-search');
    this.summaryFilterStartDate = page.locator('#summary-filter-start-date');
    this.summaryFilterEndDate = page.locator('#summary-filter-end-date');
    this.summaryFilterModel = page.locator('#summary-filter-model');

    // Secondary toolbar
    this.manageTagsButton = page.locator('#open-tags-modal-btn');
    this.exportButton = page.locator('#export-logs-btn');
    this.liveUpdateToggle = page.locator('#live-update-toggle');

    // Pagination per view
    this.userPagination = new PaginationComponent(page, '#pagination-controls');
    this.aiPagination = new PaginationComponent(page, '#ai-pagination-controls');
    this.summaryPagination = new PaginationComponent(page, '#ai-summary-pagination-controls');
  }

  async waitForReady() {
    await this.userLogView.waitFor({ state: 'visible' });
    // Wait for logging.js DOMContentLoaded handler to finish initializing
    // (attaches tab click handlers, fetches initial data, etc.)
    await this.page.waitForFunction(
      () => document.body.dataset.logsReady === 'true',
      { timeout: 10_000 }
    );
  }

  /** Switch to a log tab: 'user', 'ai', or 'summary'. */
  async switchToTab(tabName) {
    const tabs = {
      user: this.userLogsTab,
      ai: this.aiLogsTab,
      summary: this.aiSummariesTab,
    };
    const viewIds = {
      user: 'user-log-view',
      ai: 'ai-log-view',
      summary: 'ai-summary-view',
    };
    await tabs[tabName].click();
    // Poll until the target view's 'hidden' class is removed.
    // Can't use networkidle (SSE keeps the connection open permanently).
    await this.page.waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
      },
      viewIds[tabName],
      { timeout: 5_000 }
    );
  }

  /** Get the currently active tab name. */
  async getActiveTab() {
    if (await this.userLogsTab.evaluate((el) => el.classList.contains('active'))) return 'user';
    if (await this.aiLogsTab.evaluate((el) => el.classList.contains('active'))) return 'ai';
    if (await this.aiSummariesTab.evaluate((el) => el.classList.contains('active'))) return 'summary';
    return null;
  }

  /** Filter user logs. */
  async filterUserLogs({ search, start, end, eventType } = {}) {
    if (search) await this.userSearch.fill(search);
    if (start) await this.filterStartDate.fill(start);
    if (end) await this.filterEndDate.fill(end);
    if (eventType) await this.filterEventType.selectOption(eventType);
    await this.userFilterForm.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(500);
  }

  /** Filter AI logs. */
  async filterAILogs({ search, start, end, model } = {}) {
    if (search) await this.aiSearch.fill(search);
    if (start) await this.aiFilterStartDate.fill(start);
    if (end) await this.aiFilterEndDate.fill(end);
    if (model) await this.aiFilterModel.selectOption(model);
    await this.aiFilterForm.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(500);
  }

  /** Filter AI summaries. */
  async filterAISummaries({ search, start, end, model } = {}) {
    if (search) await this.aiSummarySearch.fill(search);
    if (start) await this.summaryFilterStartDate.fill(start);
    if (end) await this.summaryFilterEndDate.fill(end);
    if (model) await this.summaryFilterModel.selectOption(model);
    await this.aiSummaryFilterForm.locator('button[type="submit"]').click();
    await this.page.waitForTimeout(500);
  }

  /** Clear the active filter form. */
  async clearCurrentFilter() {
    const activeTab = await this.getActiveTab();
    const forms = {
      user: this.userFilterForm,
      ai: this.aiFilterForm,
      summary: this.aiSummaryFilterForm,
    };
    await forms[activeTab].locator('.clear-filters').click();
    await this.page.waitForTimeout(500);
  }

  /** Count rows in the user log table. */
  async getUserLogRowCount() {
    return this.userLogTbody.locator('tr').count();
  }

  /** Check if export button is visible. */
  async isExportButtonVisible() {
    return this.exportButton.isVisible();
  }

  /** Check if manage tags button is visible. */
  async isManageTagsVisible() {
    return this.manageTagsButton.isVisible();
  }

  /** Toggle live updates. */
  async toggleLiveUpdates() {
    // The checkbox is visually hidden inside a CSS toggle switch
    await this.liveUpdateToggle.evaluate((el) => el.click());
  }

  /** Check if the user log view is visible. */
  async isUserLogViewVisible() {
    return this.userLogView.isVisible();
  }

  /** Check if the AI log view is visible. */
  async isAILogViewVisible() {
    return this.aiLogView.isVisible();
  }

  /** Check if the AI summary view is visible. */
  async isAISummaryViewVisible() {
    return this.aiSummaryView.isVisible();
  }
}
