import { test, expect } from '../fixtures/auth.fixture.js';
import { AlertsPage } from '../page-objects/AlertsPage.js';

test.describe('@alerts Alerts Page', () => {
  let alerts;

  test.beforeEach(async ({ adminPage }) => {
    alerts = new AlertsPage(adminPage);
    await alerts.goto();
  });

  test('page loads with stat cards', async () => {
    await expect(alerts.countCritical).toBeVisible();
    await expect(alerts.countHigh).toBeVisible();
    await expect(alerts.countMedium).toBeVisible();
    await expect(alerts.countInfo).toBeVisible();
  });

  test('stat cards display numeric values', async () => {
    const counts = await alerts.getStatCounts();
    expect(counts.critical).toBeGreaterThanOrEqual(0);
    expect(counts.high).toBeGreaterThanOrEqual(0);
    expect(counts.medium).toBeGreaterThanOrEqual(0);
    expect(counts.info).toBeGreaterThanOrEqual(0);
  });

  test('alert log table is visible', async () => {
    await expect(alerts.alertLogTable).toBeVisible();
  });

  test('charts are rendered', async () => {
    await expect(alerts.chartPie).toBeAttached();
    await expect(alerts.chartBar).toBeAttached();
    await expect(alerts.chartLine).toBeAttached();
  });

  test('filter form has all controls', async () => {
    await expect(alerts.filterLevel).toBeVisible();
    await expect(alerts.filterModel).toBeVisible();
    await expect(alerts.filterTag).toBeVisible();
    await expect(alerts.filterStartDate).toBeVisible();
    await expect(alerts.filterEndDate).toBeVisible();
    await expect(alerts.applyButton).toBeVisible();
    await expect(alerts.clearButton).toBeVisible();
  });

  test('can filter by level', async () => {
    await alerts.filterByLevel('Critical');
    await alerts.applyFilters();
    // Verify the filter was applied (level dropdown retains value)
    const value = await alerts.filterLevel.inputValue();
    expect(value).toBe('Critical');
  });

  test('clear filters resets all dropdowns', async () => {
    await alerts.filterByLevel('High');
    await alerts.applyFilters();
    await alerts.clearFilters();

    const value = await alerts.filterLevel.inputValue();
    expect(value).toBe('all');
  });

  test('chart range selector has options', async () => {
    await expect(alerts.chartRangeSelect).toBeVisible();
    await alerts.selectChartRange('7d');
    const value = await alerts.chartRangeSelect.inputValue();
    expect(value).toBe('7d');
  });

  test('live updates toggle can be switched', async () => {
    const initialState = await alerts.isLiveUpdatesEnabled();
    await alerts.toggleLiveUpdates();
    const newState = await alerts.isLiveUpdatesEnabled();
    expect(newState).toBe(!initialState);
  });
});

test.describe('@alerts Alert Modals', () => {
  let alerts;

  test.beforeEach(async ({ adminPage }) => {
    alerts = new AlertsPage(adminPage);
    await alerts.goto();
  });

  test('create alert modal opens and closes', async () => {
    await alerts.clickCreateAlert();
    expect(await alerts.modal.isOpen()).toBe(true);

    await alerts.modal.close();
    expect(await alerts.modal.isOpen()).toBe(false);
  });

  test('active alerts modal opens and closes', async () => {
    await alerts.clickManageAlerts();
    expect(await alerts.modal.isOpen()).toBe(true);

    await alerts.modal.close();
    expect(await alerts.modal.isOpen()).toBe(false);
  });

  test('manage tags modal opens and closes', async () => {
    await alerts.clickManageTags();
    expect(await alerts.modal.isOpen()).toBe(true);

    await alerts.modal.close();
    expect(await alerts.modal.isOpen()).toBe(false);
  });
});
