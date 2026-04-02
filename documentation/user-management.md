# User Management

The admin page lets you manage user accounts, roles, permissions, and system settings. It is available at `[Domain]/admin/users`.

Requires the `manage:users` permission (admin or owner role).

## Managing Users

Admins can:
- View all registered accounts with their current roles
- Change a user's role
- Delete a user account

### Restrictions
- You cannot change your own role
- You cannot delete your own account
- Only owners can assign the `owner` role
- Only owners can delete other owner accounts
- The last owner account cannot be deleted

## Roles

The system has five built-in roles (see [Constants Reference](constants.md) for full permission details):

| Role | Description |
|---|---|
| `owner` | Full system access including all admin capabilities |
| `admin` | Administrative access to all features |
| `user` | Standard access — can create and edit charts, alerts, and reports |
| `viewer` | Read-only access to all pages |
| `visitor` | Limited access — dashboard and profile only |

### Custom Roles

Admins can create custom roles with specific permission sets. Requires the `manage:roles` permission.

To create a custom role:
1. Go to the admin page
2. Use the role creation form
3. Provide a name (3–50 characters), description (5–500 characters), and at least one permission
4. The new role becomes available for assignment immediately

Custom roles can be deleted as long as no users are currently assigned to them. System (built-in) roles cannot be deleted.

## Permissions

Permissions are granular access controls grouped by feature area. The available permissions list is served dynamically from the server and grouped by category. See the [Constants Reference](constants.md) for the full list.

The authorization middleware caches role permissions for 5 minutes to reduce database queries.

## System Settings

The admin page also exposes system-level configuration. Currently the only configurable setting is the AI log retention cutoff.

### AI Log Cutoff

Controls how long raw `AI_Log` entries are retained before the system falls back to `AI_Summary` data. The value is stored in milliseconds.

- `GET /admin/api/settings` — returns the current `aiLogCutoff` value
- `PUT /admin/api/settings/ai-log-cutoff` — updates the cutoff; body: `{ "value": <number in ms> }`

Changing this setting is logged as a `Setting_Changed` user log event and broadcast via SSE.

## API Reference

All endpoints require authentication. Role management endpoints additionally require `manage:roles`.

| Method | Endpoint | Permission | Description |
|---|---|---|---|
| `GET` | `/admin/users` | `manage:users` | Render the admin page |
| `GET` | `/admin/api/users` | `manage:users` | List all users (no passwords) |
| `PATCH` | `/admin/api/users/:id/roles` | `manage:roles` | Update a user's role |
| `DELETE` | `/admin/api/users/:id` | `manage:users` | Delete a user account |
| `GET` | `/admin/api/roles` | `manage:roles` | List all roles |
| `POST` | `/admin/api/roles` | `manage:roles` | Create a custom role |
| `DELETE` | `/admin/api/roles/:name` | `manage:roles` | Delete a custom role |
| `GET` | `/admin/api/permissions` | `manage:roles` | List all available permissions grouped by category |
| `GET` | `/admin/api/settings` | `manage:users` | Get system settings |
| `PUT` | `/admin/api/settings/ai-log-cutoff` | `manage:users` | Update the AI log cutoff value |

## Read Next
- [Authentication](authentication.md)
- [Logs](logs.md)
- [Constants Reference](constants.md)
