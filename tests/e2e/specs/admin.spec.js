import { test, expect } from '../fixtures/auth.fixture.js';
import { test as baseTest } from '@playwright/test';
import { AdminPage } from '../page-objects/AdminPage.js';

test.describe('@admin Admin Page', () => {
  let admin;

  test.beforeEach(async ({ adminPage }) => {
    admin = new AdminPage(adminPage);
    await admin.goto();
  });

  test('page loads with all three sections', async () => {
    expect(await admin.isUsersSectionVisible()).toBe(true);
    expect(await admin.isRolesSectionVisible()).toBe(true);
    expect(await admin.isSystemSectionVisible()).toBe(true);
  });

  test('user search input is visible', async () => {
    await expect(admin.userSearch).toBeVisible();
  });

  test('role filter dropdown is visible', async () => {
    await expect(admin.roleFilter).toBeVisible();
  });

  test('refresh users button is visible', async () => {
    await expect(admin.refreshUsersButton).toBeVisible();
  });

  test('bulk actions controls are visible', async () => {
    await expect(admin.bulkRoleSelect).toBeVisible();
    await expect(admin.applyBulkRoleButton).toBeVisible();
    await expect(admin.deleteSelectedButton).toBeVisible();
  });

  test('create role form is visible', async () => {
    await expect(admin.createRoleForm).toBeVisible();
    await expect(admin.roleName).toBeVisible();
    await expect(admin.roleDescription).toBeVisible();
  });

  test('system settings section has AI log cutoff controls', async () => {
    await expect(admin.aiLogCutoffSelect).toBeVisible();
    await expect(admin.saveCutoffButton).toBeVisible();
  });

  test('users section can be collapsed and expanded', async ({ adminPage }) => {
    await admin.toggleSection('users');
    await adminPage.waitForTimeout(300);

    // After toggling, check if the section visibility changed
    const visible = await admin.isUsersSectionVisible();
    // Toggle back
    await admin.toggleSection('users');
    await adminPage.waitForTimeout(300);

    const visibleAgain = await admin.isUsersSectionVisible();
    expect(visible).not.toBe(visibleAgain);
  });

  test('user search can accept input', async () => {
    await admin.searchUsers('admin');
    const value = await admin.userSearch.inputValue();
    expect(value).toBe('admin');
  });
});

baseTest.describe('@admin Access Control', () => {
  baseTest('unauthenticated user cannot access admin page', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForURL('**/login');
  });
});
