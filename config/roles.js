const permissions = {
    // Common/System permissions
    common: {
        'view:profile': 'View own profile',
        'edit:profile': 'Edit own profile',
    },
    
    // Dashboard permissions
    dashboard: {
        'view:dashboard': 'View dashboard',
        'create:graph': 'Create dashboard graph',
        'edit:graph': 'Edit dashboard graph',
        'delete:graph': 'Delete dashboard graphs',
    },
    
    // Alerts permissions
    alerts: {
        'view:alerts': 'View alerts',
        'create:alert': 'Create alerts',
        'edit:alert': 'Edit alerts',
        'delete:alert': 'Delete alerts',
        'acknowledge:alert': 'Acknowledge alerts',
        'manage:alert_rules': 'Manage alert rules',
    },
    
    // Reports permissions
    reports: {
        'view:reports': 'View reports',
        'create:report': 'Create reports',
        'edit:report': 'Edit reports',
        'delete:report': 'Delete reports',
        'export:report': 'Export reports',
    },
    
    // Logs permissions
    logs: {
        'view:logs': 'View logs',
        'export:logs': 'Export logs',
        'clear:logs': 'Clear logs',
    },
    
    // Admin/System permissions
    admin: {
        'manage:users': 'Manage users',
        'manage:roles': 'Manage roles',
        'view:system': 'View system settings',
        'edit:system': 'Edit system settings',
    }
};

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
            ...Object.keys(permissions.common),
        ]
    },
    visitor: {
        description: 'Limited public access',
        permissions: [
            'view:profile',
        ]
    }
};

export { permissions, roles }; 