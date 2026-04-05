import { BasePage } from './BasePage.js';
import { PaginationComponent } from './components/PaginationComponent.js';

export class ReportsPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/reports';

    // Tab buttons
    this.generatorTab = page.locator('.report-tab-btn[data-view="generator"]');
    this.historyTab = page.locator('.report-tab-btn[data-view="history"]');

    // Tab views
    this.generatorView = page.locator('#generator-view');
    this.historyView = page.locator('#history-view');

    // Report form fields
    this.reportForm = page.locator('#report-form');
    this.titleInput = page.locator('#reportTitle');
    this.modelSelect = page.locator('#modelName');
    this.startDate = page.locator('#startDate');
    this.endDate = page.locator('#endDate');
    this.metricsGrid = page.locator('#metrics-grid');

    // Template pills
    this.templatePills = page.locator('#template-pills');
    this.saveTemplateButton = page.locator('#save-template-btn');

    // Action buttons
    this.submitButton = page.locator('#report-submit');
    this.downloadPdf = page.locator('#report-download');
    this.downloadAiLogs = page.locator('#report-download-ai-logs');
    this.downloadAiSummaries = page.locator('#report-download-ai-summaries');
    this.downloadAggregates = page.locator('#report-download-csv-aggregates');
    this.downloadHdf5 = page.locator('#report-download-hdf5');

    // Report preview
    this.reportPreview = page.locator('#report-preview');
    this.reportPreviewWrapper = page.locator('#report-preview-wrapper');

    // History tab elements
    this.historyList = page.locator('#history-list');
    this.historyEmpty = page.locator('#history-empty');
    this.historyPagination = new PaginationComponent(page, '#history-pagination');

    // Fidelity notice
    this.fidelityNotice = page.locator('#fidelity-notice');
  }

  async waitForReady() {
    await this.reportForm.waitFor({ state: 'visible' });
  }

  /** Switch between 'generator' and 'history' tabs. */
  async switchToTab(tab) {
    if (tab === 'generator') {
      await this.generatorTab.click();
      await this.generatorView.waitFor({ state: 'visible', timeout: 5_000 });
    } else {
      await this.historyTab.click();
      await this.historyView.waitFor({ state: 'visible', timeout: 5_000 });
    }
  }

  /** Fill the report form with the given options. */
  async fillReportForm({ title, model, startDate, endDate } = {}) {
    if (title) await this.titleInput.fill(title);
    if (model) await this.modelSelect.selectOption(model);
    if (startDate) await this.startDate.fill(startDate);
    if (endDate) await this.endDate.fill(endDate);
  }

  /** Check specific metric checkboxes by their values. */
  async selectMetrics(values) {
    for (const value of values) {
      await this.metricsGrid
        .locator(`input[name="fields"][value="${value}"]`)
        .check();
    }
  }

  /** Click the Generate Report button. */
  async generateReport() {
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Click a template pill by name. */
  async clickTemplate(templateName) {
    await this.templatePills
      .locator('button', { hasText: templateName })
      .click();
  }

  /** Check if the report preview iframe is visible. */
  async isPreviewVisible() {
    return this.reportPreviewWrapper.isVisible();
  }

  /** Check if the generator view is visible. */
  async isGeneratorViewVisible() {
    return this.generatorView.isVisible();
  }

  /** Check if the history view is visible. */
  async isHistoryViewVisible() {
    // The history view exists in DOM but may have 'hidden' class
    const classList = await this.historyView.getAttribute('class');
    return !classList?.includes('hidden');
  }

  /** Get the count of metric checkboxes. */
  async getMetricCount() {
    return this.metricsGrid.locator('input[type="checkbox"]').count();
  }

  /** Get template pill button texts. */
  async getTemplatePillNames() {
    return this.templatePills.locator('button').allTextContents();
  }

  /** Check if download buttons are present. */
  async areDownloadButtonsVisible() {
    const [pdf, aiLogs, summaries, agg, hdf5] = await Promise.all([
      this.downloadPdf.isVisible(),
      this.downloadAiLogs.isVisible(),
      this.downloadAiSummaries.isVisible(),
      this.downloadAggregates.isVisible(),
      this.downloadHdf5.isVisible(),
    ]);
    return { pdf, aiLogs, summaries, aggregates: agg, hdf5 };
  }
}
