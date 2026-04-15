import { test as base } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_STORAGE = path.resolve(__dirname, '../auth/admin.storageState.json');

/**
 * Extended test fixture that provides pre-authenticated browser contexts.
 *
 * Usage in specs:
 *   import { test, expect } from '../fixtures/auth.fixture.js';
 *   test('my test', async ({ adminPage }) => { ... });
 */
export const test = base.extend({
  /**
   * A Page instance already authenticated as admin.
   * Each test gets a fresh browser context (isolated cookies).
   */
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ADMIN_STORAGE,
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
