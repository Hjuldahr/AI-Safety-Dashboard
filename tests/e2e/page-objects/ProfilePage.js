import { BasePage } from './BasePage.js';

export class ProfilePage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/profile';

    // User info
    this.userInfoDisplay = page.locator('.user-info-display');

    // Password change form
    this.changePasswordForm = page.locator('#change-password-form');
    this.currentPassword = page.locator('#currentPassword');
    this.newPassword = page.locator('#newPassword');
    this.confirmPassword = page.locator('#confirmPassword');
    this.submitButton = this.changePasswordForm.locator('button[type="submit"]');
    this.profileMessages = page.locator('#profile-messages');

    // Theme selectors
    this.colourSelect = page.locator('#colour-select');
    this.themeSelect = page.locator('#theme-select');
  }

  async waitForReady() {
    await this.changePasswordForm.waitFor({ state: 'visible' });
  }

  /** Fill and submit the change password form. */
  async changePassword(current, newPw, confirmPw) {
    await this.currentPassword.fill(current);
    await this.newPassword.fill(newPw);
    await this.confirmPassword.fill(confirmPw || newPw);
    await this.submitButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Select a colour mode (light, dark, auto). */
  async selectColour(value) {
    await this.colourSelect.selectOption(value);
    // Theme changes trigger a fetch to save preferences; wait for it
    await this.page.waitForTimeout(500);
  }

  /** Select a theme. */
  async selectTheme(value) {
    await this.themeSelect.selectOption(value);
    await this.page.waitForTimeout(500);
  }

  /** Get the displayed username from the profile info. */
  async getDisplayedUsername() {
    const text = await this.userInfoDisplay.locator('p').first().textContent();
    return text.replace('Username:', '').trim();
  }

  /** Get the displayed email from the profile info. */
  async getDisplayedEmail() {
    const text = await this.userInfoDisplay.locator('p').nth(1).textContent();
    return text.replace('Email:', '').trim();
  }

  /** Get the currently selected colour value. */
  async getSelectedColour() {
    return this.colourSelect.inputValue();
  }

  /** Get the currently selected theme value. */
  async getSelectedTheme() {
    return this.themeSelect.inputValue();
  }

  /** Get the profile feedback message text. */
  async getMessageText() {
    return this.profileMessages.textContent();
  }

  /** Check if the message container has content. */
  async hasMessage() {
    const text = await this.profileMessages.textContent();
    return text.trim().length > 0;
  }
}
