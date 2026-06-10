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
            ...Object.keys(permissions.notifications),
            ...Object.keys(permissions.realtime),
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
            'view:logs', 'edit:logs',
            "read:docs",
            ...Object.keys(permissions.common),
            ...Object.keys(permissions.notifications),
            ...Object.keys(permissions.realtime),
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
            ...Object.keys(permissions.notifications),
            ...Object.keys(permissions.realtime),
        ]
    },
    visitor: {
        description: 'Limited public access',
        permissions: [
            // Unauthenticated users get this role virtually: read-only access to
            // every page except Management (manage:* is intentionally excluded).
            'view:dashboard',
            'view:alerts',
            'view:reports',
            'view:logs',
            'view:demo',
            "read:docs",
            ...Object.keys(permissions.notifications), // view:notifications (header fetch)
            ...Object.keys(permissions.realtime),      // view:sse (live feed)
            ...Object.keys(permissions.common),
        ]
    }
};

export { roles }; 