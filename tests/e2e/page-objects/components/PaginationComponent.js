export class PaginationComponent {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} containerSelector - CSS selector for the pagination container
   */
  constructor(page, containerSelector) {
    this.page = page;
    this.container = page.locator(containerSelector);
  }

  /** Click a specific page number button. */
  async goToPage(pageNum) {
    await this.container.locator(`button`, { hasText: String(pageNum) }).click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Click the next page button. */
  async goToNext() {
    await this.container.locator('button:has-text("Next"), button:has-text("»")').click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Click the previous page button. */
  async goToPrevious() {
    await this.container.locator('button:has-text("Prev"), button:has-text("«")').click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Check if pagination controls are visible. */
  async isVisible() {
    return this.container.isVisible();
  }

  /** Get the count of page buttons (excluding next/prev). */
  async getPageButtonCount() {
    return this.container.locator('button').count();
  }
}
