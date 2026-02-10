// Todo: Figure out the use of this file
// Is it only for seeding roles? Is it also for checking roles on the fly?
import { permissions } from "./permissions.js"

const roles = {
    owner: {
        description: 'Full system access',
        permissions: [
            // Owner has all permissions
            ...Object.values(permissions).flatMap(p => Object.keys(p))
        ]
    },
    admin: {
        description: 'Administrative access',
        permissions: [
            // All dashboard, alerts, reports, logs
            ...Object.keys(permissions.dashboard),
            ...Object.keys(permissions.alerts),
            ...Object.keys(permissions.reports),
            ...Object.keys(permissions.logs),
            ...Object.keys(permissions.admin),
            ...Object.keys(permissions.common),
            ...Object.keys(permissions.documentation),
            ...Object.keys(permissions.demo),
        ]
    },
    user: {
        description: 'Standard user access',
        permissions: [
            'view:dashboard',
            'create:graph', 'edit:graph',
            'view:alerts', 'create:alert', 'acknowledge:alert',
            'view:reports', 'create:report',
            'view:logs',
            "read:docs",
            ...Object.keys(permissions.common),
        ]
    },
    viewer: {
        description: 'Read-only access',
        permissions: [
            'view:dashboard',
            'view:alerts',
            'view:reports',
            'view:logs',
            "read:docs",
            ...Object.keys(permissions.common),
        ]
    },
    visitor: {
        description: 'Limited public access',
        permissions: [
            'view:dashboard',
            'view:profile',
            "read:docs",
        ]
    }
};

export { roles }; 