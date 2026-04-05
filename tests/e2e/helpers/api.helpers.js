/**
 * Direct API helpers for test data seeding and cleanup.
 * Uses Playwright's request context (no browser needed).
 */

/**
 * Login via API and return the request context with session cookies.
 */
export async function apiLogin(request, username, password) {
  const response = await request.post('/api/login', {
    data: { username, password },
  });
  return response;
}

/**
 * Sign up a new user via API.
 */
export async function apiSignup(request, { username, email, password }) {
  const response = await request.post('/api/signup', {
    data: { username, email, password },
  });
  return response;
}

/**
 * Logout via API.
 */
export async function apiLogout(request) {
  const response = await request.post('/api/logout');
  return response;
}
