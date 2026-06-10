// middleware/authorization.js
import { roles as rolesConfig } from "../constants/roles.js";
import { Role } from '../models/role.js';

// Base path for the login redirect (mirrors middleware/authMiddleware.js)
const BASE = process.env.PUBLIC_URL || '/';

// Cache for role permissions to avoid repeated DB queries
let roleCache = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Invalidate the role cache (call after role create/update/delete)
export const invalidateRoleCache = () => {
  roleCache = {};
  cacheExpiry = 0;
};

// Get all roles (from both config and database)
const getAllRoles = async () => {
  const now = Date.now();
  
  // Return cached roles if still valid
  if (roleCache && cacheExpiry > now) {
    return roleCache;
  }

  try {
    const dbRoles = await Role.find().lean();
    
    // Combine database roles with config roles
    const allRoles = {};
    
    // Add database roles first
    dbRoles.forEach(role => {
      allRoles[role.name] = {
        description: role.description,
        permissions: role.permissions
      };
    });
    
    // System config roles always take priority — prevent DB from shadowing them
    Object.assign(allRoles, rolesConfig);
    
    roleCache = allRoles;
    cacheExpiry = now + CACHE_TTL;
    
    return allRoles;
  } catch (err) {
    console.error('Error fetching roles from database:', err);
    // Fall back to config roles if DB fails
    return rolesConfig;
  }
};

// return a Set of permissions for a user
export const getUserPermissions = async (user) => {
  const allRoles = await getAllRoles();

  // Unauthenticated requests are treated as the virtual 'visitor' role
  const roleNames = (user && Array.isArray(user.roles) && user.roles.length)
    ? user.roles
    : ['visitor'];

  // Owners implicitly have every permission
  if (roleNames.includes('owner')) {
    const allPerms = Object.values(allRoles).flatMap(r => r.permissions || []);
    return new Set(allPerms);
  }

  return new Set(roleNames.flatMap(r => allRoles[r]?.permissions || []));
};

export const userHasPermission = async (user, permission) => {
  const perms = await getUserPermissions(user);
  return perms.has(permission);
};

// middleware - require a raw role name
export const requireRole = (roleName) => (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.includes(roleName)) return next();
  // for API requests return JSON; for HTML redirect or render a 403 page
  return res.status(403).json({ message: 'Forbidden' });
};

// middleware - require a specific permission.
// Unauthenticated users are checked against the virtual 'visitor' role; if they
// still lack the permission they are redirected to login (the old isAuthenticated
// behavior, now folded in here). Authenticated users who lack it get a 403.
export const authorize = (permission) => async (req, res, next) => {
  if (await userHasPermission(req.user, permission)) return next();
  if (!req.isAuthenticated()) return res.redirect(`${BASE}login`);
  return res.status(403).json({ message: 'Forbidden' });
};

// middleware to expose user and permissions to templates
export const setTemplatePermissions = async (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.permissions = req.user ? Array.from(await getUserPermissions(req.user)) : [];
  next();
};