import { HeaderComponent } from './components/HeaderComponent.js';
import { NavComponent } from './components/NavComponent.js';
import { ModalComponent } from './components/ModalComponent.js';

export class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
    this.path = '/';
  }

  /** Navigate to this page using the configured path. */
  async goto() {
    await this.page.goto(this.path, { waitUntil: 'domcontentloaded' });
    await this.waitForReady();
  }

  /**
   * Override in subclasses to wait for a page-specific "loaded" indicator.
   * Default waits for network to settle.
   */
  async waitForReady() {
    await this.page.waitForLoadState('networkidle');
  }

  /** Return the document title. */
  async getTitle() {
    return this.page.title();
  }

  /** Return the current URL pathname. */
  getCurrentUrl() {
    return new URL(this.page.url()).pathname;
  }

  /** Shared header component (lazy). */
  get header() {
    if (!this._header) {
      this._header = new HeaderComponent(this.page);
    }
    return this._header;
  }

  /** Shared nav component (lazy). */
  get nav() {
    if (!this._nav) {
      this._nav = new NavComponent(this.page);
    }
    return this._nav;
  }

  /** Global modal component (lazy). */
  get modal() {
    if (!this._modal) {
      this._modal = new ModalComponent(this.page);
    }
    return this._modal;
  }

  /** Take a named screenshot (saved to test-results). */
  async screenshot(name) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
