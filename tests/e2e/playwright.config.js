import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:2121';

export default defineConfig({
  testDir: './specs',

  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',

  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,

  reporter: [
    ['list'],
    ['html', { outputFolder: path.resolve(__dirname, 'playwright-report'), open: 'never' }],
  ],

  use: {
    baseURL: BASE_URL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'node app.js',
    cwd: path.resolve(__dirname, '../..'),
    port: 2121,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },

  outputDir: path.resolve(__dirname, '../../test-results'),
});
