export class HeaderComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.darkModeToggle = page.locator('#dark-mode-toggle');
    this.logoutButton = page.locator('#logout-btn');
    this.userName = page.locator('#user-name');
    this.profileLink = page.locator('a.profile-icon');
    this.loginLink = page.locator('#login-text');
  }

  /** Toggle dark mode on/off. */
  async toggleDarkMode() {
    await this.darkModeToggle.click();
  }

  /** Click logout and wait for redirect to login page. */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }

  /** Get the displayed username text. */
  async getUsername() {
    const text = await this.userName.textContent();
    return text.replace('User:', '').trim();
  }

  /** Check if dark mode is active on the body. */
  async isDarkModeActive() {
    return this.page.locator('body.dark-mode').count().then((c) => c > 0);
  }

  /** Check if the user is logged in (logout button visible). */
  async isLoggedIn() {
    return this.logoutButton.isVisible();
  }
}
