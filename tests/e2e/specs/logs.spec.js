import { test, expect } from '../fixtures/auth.fixture.js';
import { LogsPage } from '../page-objects/LogsPage.js';

test.describe('@logs Logs Page', () => {
  let logs;

  test.beforeEach(async ({ adminPage }) => {
    logs = new LogsPage(adminPage);
    await logs.goto();
  });

  test('page loads with user logs tab active by default', async () => {
    const activeTab = await logs.getActiveTab();
    expect(activeTab).toBe('user');
  });

  test('user log view is visible by default', async () => {
    expect(await logs.isUserLogViewVisible()).toBe(true);
    expect(await logs.isAILogViewVisible()).toBe(false);
    expect(await logs.isAISummaryViewVisible()).toBe(false);
  });

  test('user filter form is visible by default', async () => {
    await expect(logs.userFilterForm).toBeVisible();
    await expect(logs.userSearch).toBeVisible();
    await expect(logs.filterEventType).toBeVisible();
  });
});

test.describe('@logs Tab Switching', () => {
  let logs;

  test.beforeEach(async ({ adminPage }) => {
    logs = new LogsPage(adminPage);
    await logs.goto();
  });

  test('switching to AI logs tab shows AI log view', async () => {
    await logs.switchToTab('ai');

    const activeTab = await logs.getActiveTab();
    expect(activeTab).toBe('ai');
    expect(await logs.isAILogViewVisible()).toBe(true);
    expect(await logs.isUserLogViewVisible()).toBe(false);
  });

  test('switching to AI summaries tab shows summary view', async () => {
    await logs.switchToTab('summary');

    const activeTab = await logs.getActiveTab();
    expect(activeTab).toBe('summary');
    expect(await logs.isAISummaryViewVisible()).toBe(true);
    expect(await logs.isUserLogViewVisible()).toBe(false);
  });

  test('switching back to user logs tab restores user view', async () => {
    await logs.switchToTab('ai');
    await logs.switchToTab('user');

    const activeTab = await logs.getActiveTab();
    expect(activeTab).toBe('user');
    expect(await logs.isUserLogViewVisible()).toBe(true);
  });
});

test.describe('@logs Filtering', () => {
  let logs;

  test.beforeEach(async ({ adminPage }) => {
    logs = new LogsPage(adminPage);
    await logs.goto();
  });

  test('user log filter form can be submitted', async () => {
    await logs.filterEventType.selectOption('Login');
    await logs.userFilterForm.locator('button[type="submit"]').click();
    await logs.page.waitForTimeout(500);
    // Verify the filter form is still present (submission didn't break the page)
    await expect(logs.userFilterForm).toBeVisible();
  });

  test('clear filter resets the form', async () => {
    await logs.filterUserLogs({ eventType: 'Logout' });
    await logs.clearCurrentFilter();

    const value = await logs.filterEventType.inputValue();
    expect(value).toBe('all');
  });

  test('AI logs filter form can be submitted', async () => {
    await logs.switchToTab('ai');
    await logs.filterAILogs({ model: 'GoodModel' });

    const value = await logs.aiFilterModel.inputValue();
    expect(value).toBe('GoodModel');
  });
});

test.describe('@logs Secondary Toolbar', () => {
  let logs;

  test.beforeEach(async ({ adminPage }) => {
    logs = new LogsPage(adminPage);
    await logs.goto();
  });

  test('live updates toggle is present and checked by default', async () => {
    // The checkbox input is visually hidden (CSS toggle switch);
    // check that the container is visible and the input is checked
    await expect(logs.page.locator('#live-updates-container')).toBeVisible();
    const checked = await logs.liveUpdateToggle.isChecked();
    expect(checked).toBe(true);
  });

  test('live updates toggle can be switched off', async () => {
    await logs.toggleLiveUpdates();
    const checked = await logs.liveUpdateToggle.isChecked();
    expect(checked).toBe(false);
  });
});
