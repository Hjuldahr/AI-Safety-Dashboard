// middleware/authorization.js
import { roles as rolesConfig } from '../config/roles.js';
import { Role } from '../models/role.js';

// Cache for role permissions to avoid repeated DB queries
let roleCache = {};
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    
    // Add config roles
    Object.assign(allRoles, rolesConfig);
    
    // Add/override with database roles
    dbRoles.forEach(role => {
      allRoles[role.name] = {
        description: role.description,
        permissions: role.permissions
      };
    });
    
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
  if (!user || !Array.isArray(user.roles)) return new Set();

  const allRoles = await getAllRoles();

  // Owners implicitly have every permission
  if (user.roles.includes('owner')) {
    const allPerms = Object.values(allRoles).flatMap(r => r.permissions || []);
    return new Set(allPerms);
  }

  return new Set(user.roles.flatMap(r => allRoles[r]?.permissions || []));
};

export const userHasPermission = async (user, permission) => {
  const perms = await getUserPermissions(user);
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
export const authorize = (permission) => async (req, res, next) => {
  if (await userHasPermission(req.user, permission)) return next();
  return res.status(403).json({ message: 'Forbidden' });
};

// middleware to expose user and permissions to templates
export const setTemplatePermissions = async (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.permissions = req.user ? Array.from(await getUserPermissions(req.user)) : [];
  next();
};