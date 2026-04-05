import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const ADMIN_USER = {
  username: process.env.DEFAULT_APP_USER || 'admin',
  password: process.env.DEFAULT_APP_PASSWORD,
};

export const TEST_USER = {
  username: 'test_user_e2e',
  email: 'test_user_e2e@test.com',
  password: 'TestPassword123!',
};

export const KNOWN_MODELS = ['GoodModel', 'BadModel'];

export const ROUTES = {
  login: '/login',
  dashboard: '/',
  alerts: '/alerts',
  logs: '/logs',
  reports: '/reports',
  profile: '/profile',
  admin: '/admin/users',
  demo: '/demo',
  docs: '/docs/',
};
