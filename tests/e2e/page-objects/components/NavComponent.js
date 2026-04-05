export class NavComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.nav = page.locator('nav.site-nav');
  }

  /** Return an array of visible nav link text labels. */
  async getVisibleLinks() {
    const links = this.nav.locator('a');
    const texts = await links.allTextContents();
    return texts.map((t) => t.trim()).filter(Boolean);
  }

  /** Click a nav link by its text content. */
  async navigateTo(linkText) {
    await this.nav.locator('a', { hasText: linkText }).click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** Check if a specific nav link is visible. */
  async isLinkVisible(linkText) {
    return this.nav.locator('a', { hasText: linkText }).isVisible();
  }
}
