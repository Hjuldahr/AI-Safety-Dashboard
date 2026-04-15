import { test, expect } from '../fixtures/auth.fixture.js';
import { ProfilePage } from '../page-objects/ProfilePage.js';
import { ADMIN_USER } from '../helpers/test-data.js';

test.describe('@profile Profile Page', () => {
  let profile;

  test.beforeEach(async ({ adminPage }) => {
    profile = new ProfilePage(adminPage);
    await profile.goto();
  });

  test('page displays current username', async () => {
    const username = await profile.getDisplayedUsername();
    expect(username).toBe(ADMIN_USER.username);
  });

  test('page displays current email', async () => {
    const email = await profile.getDisplayedEmail();
    expect(email).toBeTruthy();
  });

  test('password change form is visible', async () => {
    await expect(profile.changePasswordForm).toBeVisible();
    await expect(profile.currentPassword).toBeVisible();
    await expect(profile.newPassword).toBeVisible();
    await expect(profile.confirmPassword).toBeVisible();
  });

  test('theme selectors are present', async () => {
    await expect(profile.colourSelect).toBeVisible();
    await expect(profile.themeSelect).toBeVisible();
  });
});

test.describe('@profile Theme Management', () => {
  let profile;

  test.beforeEach(async ({ adminPage }) => {
    profile = new ProfilePage(adminPage);
    await profile.goto();
  });

  test('can select a colour mode', async () => {
    await profile.selectColour('dark');
    const selected = await profile.getSelectedColour();
    expect(selected).toBe('dark');
  });

  test('can select a theme', async () => {
    await profile.selectTheme('ocean');
    const selected = await profile.getSelectedTheme();
    expect(selected).toBe('ocean');
  });

  test('colour selector has all expected options', async ({ adminPage }) => {
    const options = await profile.colourSelect.locator('option').allTextContents();
    expect(options.length).toBe(3);
  });

  test('theme selector has all expected options', async ({ adminPage }) => {
    const options = await profile.themeSelect.locator('option').allTextContents();
    expect(options.length).toBeGreaterThanOrEqual(5);
  });
});
