import { request } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:2121';
const ADMIN_STORAGE = path.resolve(__dirname, 'auth/admin.storageState.json');

export default async function globalSetup() {
  // Create a request context and login as admin
  const context = await request.newContext({ baseURL: BASE_URL });

  const loginResponse = await context.post('/api/login', {
    data: {
      username: process.env.DEFAULT_APP_USER || 'admin',
      password: process.env.DEFAULT_APP_PASSWORD,
    },
  });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    throw new Error(`Global setup: admin login failed (${loginResponse.status()}): ${body}`);
  }

  // Save authenticated state (cookies) to file
  await context.storageState({ path: ADMIN_STORAGE });
  await context.dispose();

  console.log('[Global Setup] Admin auth state saved.');
}
