import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/login';

    // Tab buttons
    this.signInTab = page.locator('#signInTab');
    this.signUpTab = page.locator('#signUpTab');

    // Sign-in form
    this.signInForm = page.locator('#signInForm');
    this.usernameInput = page.locator('#signInInput');
    this.passwordInput = page.locator('#signInPassword');
    this.signInSubmit = page.locator('#signInForm button[type="submit"]');

    // Sign-up form
    this.signUpForm = page.locator('#signUpForm');
    this.signUpUsername = page.locator('#signUpUsername');
    this.signUpEmail = page.locator('#signUpEmail');
    this.signUpPassword = page.locator('#signUpPassword');
    this.signUpConfirm = page.locator('#signUpConfirmPassword');
    this.signUpSubmit = page.locator('#signUpForm button[type="submit"]');

    // Error display
    this.errorMessage = page.locator('#errorMessage');
  }

  async waitForReady() {
    await this.signInForm.waitFor({ state: 'visible' });
  }

  /** Fill in credentials and submit the sign-in form. */
  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.signInSubmit.click();
  }

  /** Login and wait for successful redirect to dashboard. */
  async loginAndExpectSuccess(username, password) {
    await this.login(username, password);
    await this.page.waitForURL('**/');
  }

  /** Switch to the sign-up tab. */
  async switchToSignUp() {
    await this.signUpTab.click();
    await this.signUpForm.waitFor({ state: 'visible' });
  }

  /** Switch to the sign-in tab. */
  async switchToSignIn() {
    await this.signInTab.click();
    await this.signInForm.waitFor({ state: 'visible' });
  }

  /** Fill and submit the sign-up form. */
  async signup(username, email, password) {
    await this.switchToSignUp();
    await this.signUpUsername.fill(username);
    await this.signUpEmail.fill(email);
    await this.signUpPassword.fill(password);
    await this.signUpConfirm.fill(password);
    await this.signUpSubmit.click();
  }

  /** Get the error message text. */
  async getErrorText() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
    return this.errorMessage.locator('span').textContent();
  }

  /** Check if the error message is visible. */
  async isErrorVisible() {
    return this.errorMessage.isVisible();
  }

  /** Check if the sign-in form is visible. */
  async isSignInFormVisible() {
    return this.signInForm.isVisible();
  }

  /** Check if the sign-up form is visible. */
  async isSignUpFormVisible() {
    return this.signUpForm.isVisible();
  }
}
