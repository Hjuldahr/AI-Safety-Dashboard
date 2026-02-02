// middleware/authorization.js
import { roles as rolesConfig } from '../config/roles.js';

// return a Set of permissions for a user
export const getUserPermissions = (user) => {
  if (!user || !Array.isArray(user.roles)) return new Set();

  // Owners implicitly have every permission
  if (user.roles.includes('owner')) {
    const allPerms = Object.values(rolesConfig).flatMap(r => r.permissions || []);
    return new Set(allPerms);
  }

  return new Set(user.roles.flatMap(r => rolesConfig[r]?.permissions || []));
};

export const userHasPermission = (user, permission) => {
  const perms = getUserPermissions(user);
  // owners implicitly allowed
  if (user?.roles?.includes('owner')) return true;
  return perms.has(permission);
};

// middleware - require a raw role name
export const requireRole = (roleName) => (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.includes(roleName)) return next();
  // for API requests return JSON; for HTML redirect or render a 403 page
  return res.status(403).json({ message: 'Forbidden' });
};

// middleware - require a specific permission
export const authorize = (permission) => (req, res, next) => {
  if (userHasPermission(req.user, permission)) return next();
  return res.status(403).json({ message: 'Forbidden' });
};

// middleware to expose user and permissions to templates
export const setTemplatePermissions = (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.permissions = req.user ? Array.from(getUserPermissions(req.user)) : [];
  // Debug helper: log when templates are rendered and what permissions are set (remove in production)
  console.debug('[Auth] Template permissions set for user:', req.user ? req.user.username : 'anonymous', res.locals.permissions);
  next();
};