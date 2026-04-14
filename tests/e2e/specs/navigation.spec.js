import { test, expect } from '../fixtures/auth.fixture.js';
import { DashboardPage } from '../page-objects/DashboardPage.js';

test.describe('@navigation Admin Navigation', () => {
  let dashboard;

  test.beforeEach(async ({ adminPage }) => {
    dashboard = new DashboardPage(adminPage);
    await dashboard.goto();
  });

  test('admin sees all nav links', async () => {
    const links = await dashboard.nav.getVisibleLinks();
    expect(links).toContain('Dashboard');
    expect(links).toContain('Alerts');
    expect(links).toContain('Reports');
    expect(links).toContain('Logs');
    expect(links).toContain('Management');
  });

  test('clicking Alerts nav link navigates to alerts page', async ({ adminPage }) => {
    await dashboard.nav.navigateTo('Alerts');
    expect(adminPage.url()).toContain('alerts');
  });

  test('clicking Reports nav link navigates to reports page', async ({ adminPage }) => {
    await dashboard.nav.navigateTo('Reports');
    expect(adminPage.url()).toContain('reports');
  });

  test('clicking Logs nav link navigates to logs page', async ({ adminPage }) => {
    await dashboard.nav.navigateTo('Logs');
    expect(adminPage.url()).toContain('logs');
  });

  test('clicking Management nav link navigates to admin page', async ({ adminPage }) => {
    await dashboard.nav.navigateTo('Management');
    expect(adminPage.url()).toContain('admin');
  });
});

test.describe('@navigation Dark Mode', () => {
  test('dark mode toggle changes body class', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    const initialDark = await dashboard.header.isDarkModeActive();
    await dashboard.header.toggleDarkMode();

    // Wait for the class to update
    await adminPage.waitForTimeout(300);
    const afterDark = await dashboard.header.isDarkModeActive();

    expect(afterDark).not.toBe(initialDark);
  });

  test('dark mode toggle changes icon', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    const initialIcon = await dashboard.header.darkModeToggle.locator('i').getAttribute('class');
    await dashboard.header.toggleDarkMode();
    await adminPage.waitForTimeout(300);
    const afterIcon = await dashboard.header.darkModeToggle.locator('i').getAttribute('class');

    expect(afterIcon).not.toBe(initialIcon);
  });
});

test.describe('@navigation Header', () => {
  test('header displays user info', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    const isLoggedIn = await dashboard.header.isLoggedIn();
    expect(isLoggedIn).toBe(true);

    const username = await dashboard.header.getUsername();
    expect(username).toBeTruthy();
  });

  test('profile link navigates to profile page', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    await dashboard.header.profileLink.click();
    await adminPage.waitForLoadState('domcontentloaded');
    expect(adminPage.url()).toContain('profile');
  });
});
