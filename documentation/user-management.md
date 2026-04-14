# Administration Dashboard

The admin management page lets you manage users, roles, permissions, and system settings. It is available at `[Domain]/admin/users`.

Requires the `manage:users` permission (admin or owner role).

## Dashboard Overview

The management page is organized into three collapsible sections:
- **Users** — Manage user accounts and roles
- **Roles** — Create and manage custom roles with specific permissions
- **System** — Configure system-level settings like AI log retention

## Managing Users

The Users section provides a comprehensive interface for user management:

### Search & Filter
- **Search** by username or email address to quickly locate users
- **Filter by role** to view only users with a specific role
- **Refresh** button to reload the user list from the server

### Bulk Actions
- **Change role in bulk** — Select multiple users and assign them a new role at once
- **Delete selected users** — Remove multiple accounts in a single action

### Individual Actions
Admins can:
- View all registered accounts with their current roles and status
- Change any user's role individually
- Delete user accounts

### Restrictions
- You cannot change your own role
- You cannot delete your own account
- Only owners can assign the `owner` role
- Only owners can delete other owner accounts
- The last owner account cannot be deleted

## Built-in Roles

The system has five built-in roles (see [Constants Reference](constants.md) for full permission details):

| Role | Description |
|---|---|
| `owner` | Full system access including all admin capabilities |
| `admin` | Administrative access to all features |
| `user` | Standard access — can create and edit charts, alerts, and reports |
| `viewer` | Read-only access to all pages |
| `visitor` | Limited access — dashboard and profile only |

## Managing Custom Roles

The Roles section in the admin dashboard lets you create and manage custom roles tailored to your organization's needs.

### Creating a Custom Role

To create a new custom role:

1. Navigate to the **Roles** section on the admin dashboard
2. Under "Create New Role", fill in:
   - **Role Name** (3–50 characters, e.g., "moderator")
   - **Description** (5–500 characters) — Explain the role's purpose
   - **Permissions** — Select one or more permissions from the grouped list
3. Click **Create Role**

The new role becomes available for assignment to users immediately and appears in the "Existing Roles" list.

### Deleting Custom Roles

Custom roles can be deleted from the "Existing Roles" section as long as **no users are currently assigned to them**. Built-in system roles (owner, admin, user, viewer, visitor) cannot be deleted.

## Permissions

Permissions are granular access controls grouped by feature area. The available permissions list is served dynamically from the server and grouped by category. See the [Constants Reference](constants.md) for the full list.

The authorization middleware caches role permissions for 5 minutes to reduce database queries.

## System Configuration

The System section manages system-level settings that affect all users and data retention policies.

### AI Log Retention

Controls how long raw AI log entries (`AI_Log` documents) are retained in the database before the system falls back to summary data (`AI_Summary`). Configurable via a preset dropdown.

**Available retention periods:**
- 1 Hour
- 6 Hours
- 12 Hours
- 1 Day
- 3 Days
- 1 Week
- 2 Weeks
- 1 Month

To update:
1. Navigate to the **System** section
2. Select a retention period from the "Keep AI logs for:" dropdown
3. Click **Save**

The setting is stored in milliseconds and broadcast via server-sent events (SSE) to notify connected clients of the change. Updates are logged as `Setting_Changed` user log events.

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
