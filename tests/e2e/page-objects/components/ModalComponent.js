export class ModalComponent {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.overlay = page.locator('#global-modal');
    this.title = page.locator('#global-modal-title');
    this.body = page.locator('#global-modal-body');
    this.footer = page.locator('#global-modal-footer');
    this.closeButton = page.locator('.close-modal-btn');
  }

  /** Wait for the modal to become visible. */
  async waitForOpen() {
    await this.overlay.waitFor({ state: 'visible' });
  }

  /** Wait for the modal to close. */
  async waitForClose() {
    await this.overlay.waitFor({ state: 'hidden' });
  }

  /** Close the modal via the close button. */
  async close() {
    await this.closeButton.click();
    await this.waitForClose();
  }

  /** Check if the modal is currently open. */
  async isOpen() {
    return this.overlay.isVisible();
  }

  /** Get the modal title text. */
  async getTitle() {
    return this.title.textContent();
  }
}
