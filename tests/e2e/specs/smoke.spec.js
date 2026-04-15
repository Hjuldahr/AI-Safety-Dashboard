import { test, expect } from '../fixtures/auth.fixture.js';
import { test as baseTest } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage.js';
import { LoginPage } from '../page-objects/LoginPage.js';
import { ADMIN_USER } from '../helpers/test-data.js';

test.describe('@smoke Critical Path', () => {
  test('admin can access the dashboard', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    await expect(dashboard.staticChartsContainer).toBeAttached();
    await expect(dashboard.addChartButton).toBeVisible();
  });

  test('dashboard displays nav links for admin', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    const links = await dashboard.nav.getVisibleLinks();
    expect(links).toContain('Dashboard');
    expect(links).toContain('Alerts');
    expect(links).toContain('Logs');
    expect(links).toContain('Reports');
  });

  test('dashboard shows correct username in header', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    const username = await dashboard.header.getUsername();
    expect(username).toBe(ADMIN_USER.username);
  });
});

// Logout test uses a fresh page and logs in via UI first, so it does NOT
// destroy the shared admin session that other tests depend on.
baseTest.describe('@smoke Logout', () => {
  baseTest('admin can logout and is redirected to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndExpectSuccess(ADMIN_USER.username, ADMIN_USER.password);

    const dashboard = new DashboardPage(page);
    await dashboard.waitForReady();

    await dashboard.header.logout();

    await expect(loginPage.signInForm).toBeVisible();
  });
});

baseTest.describe('@smoke Unauthenticated Access', () => {
  baseTest('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await expect(loginPage.signInForm).toBeVisible();
  });
});
