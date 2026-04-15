import { test, expect } from '../fixtures/auth.fixture.js';
import { ReportsPage } from '../page-objects/ReportsPage.js';

test.describe('@reports Reports Page', () => {
  let reports;

  test.beforeEach(async ({ adminPage }) => {
    reports = new ReportsPage(adminPage);
    await reports.goto();
  });

  test('generator view loads by default', async () => {
    expect(await reports.isGeneratorViewVisible()).toBe(true);
  });

  test('report form has all required fields', async () => {
    await expect(reports.titleInput).toBeVisible();
    await expect(reports.modelSelect).toBeVisible();
    await expect(reports.startDate).toBeVisible();
    await expect(reports.endDate).toBeVisible();
  });

  test('metrics grid has checkboxes', async () => {
    const count = await reports.getMetricCount();
    expect(count).toBeGreaterThan(0);
  });

  test('generate and download buttons are present', async () => {
    await expect(reports.submitButton).toBeVisible();
    await expect(reports.downloadPdf).toBeVisible();
    await expect(reports.downloadAiLogs).toBeVisible();
    await expect(reports.downloadAiSummaries).toBeVisible();
    await expect(reports.downloadAggregates).toBeVisible();
    await expect(reports.downloadHdf5).toBeVisible();
  });

  test('fidelity notice is displayed', async () => {
    await expect(reports.fidelityNotice).toBeVisible();
  });

  test('save template button is present', async () => {
    await expect(reports.saveTemplateButton).toBeVisible();
  });
});

test.describe('@reports Report Form', () => {
  let reports;

  test.beforeEach(async ({ adminPage }) => {
    reports = new ReportsPage(adminPage);
    await reports.goto();
  });

  test('can fill in report form fields', async () => {
    await reports.fillReportForm({
      title: 'E2E Test Report',
      model: 'GoodModel',
    });

    const title = await reports.titleInput.inputValue();
    expect(title).toBe('E2E Test Report');

    const model = await reports.modelSelect.inputValue();
    expect(model).toBe('GoodModel');
  });

  test('can select metrics checkboxes', async ({ adminPage }) => {
    // Get the first checkbox and check it
    const firstCheckbox = reports.metricsGrid.locator('input[type="checkbox"]').first();
    await firstCheckbox.check();
    expect(await firstCheckbox.isChecked()).toBe(true);
  });
});

test.describe('@reports Tab Navigation', () => {
  let reports;

  test.beforeEach(async ({ adminPage }) => {
    reports = new ReportsPage(adminPage);
    await reports.goto();
  });

  test('can switch to history tab', async () => {
    await reports.switchToTab('history');
    expect(await reports.isHistoryViewVisible()).toBe(true);
  });

  test('can switch back to generator tab', async () => {
    await reports.switchToTab('history');
    await reports.switchToTab('generator');
    expect(await reports.isGeneratorViewVisible()).toBe(true);
  });
});
