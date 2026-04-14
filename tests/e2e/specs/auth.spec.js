import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage.js';
import { ADMIN_USER, TEST_USER, ROUTES } from '../helpers/test-data.js';

test.describe('@auth Sign In', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('sign-in form is visible by default', async () => {
    expect(await loginPage.isSignInFormVisible()).toBe(true);
    expect(await loginPage.isSignUpFormVisible()).toBe(false);
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await loginPage.login(ADMIN_USER.username, ADMIN_USER.password);
    await page.waitForURL('**/');

    // Should now be on the dashboard
    expect(page.url()).toContain('localhost');
  });

  test('login with wrong password shows error', async () => {
    await loginPage.login(ADMIN_USER.username, 'wrongpassword');

    const error = await loginPage.getErrorText();
    expect(error).toContain('Password incorrect');
  });

  test('login with nonexistent user shows error', async () => {
    await loginPage.login('nonexistent_user_12345', 'anypassword');

    const error = await loginPage.getErrorText();
    expect(error).toBeTruthy();
  });
});

test.describe('@auth Sign Up', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('can switch between sign-in and sign-up tabs', async () => {
    await loginPage.switchToSignUp();
    expect(await loginPage.isSignUpFormVisible()).toBe(true);
    expect(await loginPage.isSignInFormVisible()).toBe(false);

    await loginPage.switchToSignIn();
    expect(await loginPage.isSignInFormVisible()).toBe(true);
    expect(await loginPage.isSignUpFormVisible()).toBe(false);
  });

  test('sign up with duplicate username shows error', async () => {
    await loginPage.signup(ADMIN_USER.username, 'duplicate@test.com', 'TestPass123!');

    const error = await loginPage.getErrorText();
    expect(error).toContain('already exists');
  });
});

test.describe('@auth Protected Routes', () => {
  test('unauthenticated access to /alerts redirects to login', async ({ page }) => {
    await page.goto(ROUTES.alerts);
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await expect(loginPage.signInForm).toBeVisible();
  });

  test('unauthenticated access to /logs redirects to login', async ({ page }) => {
    await page.goto(ROUTES.logs);
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await expect(loginPage.signInForm).toBeVisible();
  });

  test('unauthenticated access to /reports redirects to login', async ({ page }) => {
    await page.goto(ROUTES.reports);
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await expect(loginPage.signInForm).toBeVisible();
  });

  test('unauthenticated access to /admin/users redirects to login', async ({ page }) => {
    await page.goto(ROUTES.admin);
    await page.waitForURL('**/login');

    const loginPage = new LoginPage(page);
    await expect(loginPage.signInForm).toBeVisible();
  });
});
