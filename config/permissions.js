export const permissions = {
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