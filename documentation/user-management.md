# User Management

The user management page allows admins to manage user accounts, roles, and permissions. It is available at `[Domain]/admin/users`.

Requires the `manage:users` permission (admin or owner role).

## Managing Users

Admins can:
- **View all users** — see a list of all registered accounts with their roles
- **Change a user's role** — assign a different role to a user
- **Delete a user** — remove a user account from the system

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

Admins can create custom roles with specific permission sets:
1. Go to the user management page
2. Use the role creation form
3. Select a name, description, and permissions
4. The new role becomes available for assignment

Custom roles can be deleted as long as no users are currently assigned to them. System (built-in) roles cannot be deleted.

## Permissions

Permissions are granular access controls grouped by feature area. See the [Constants Reference](constants.md) for the full list of permissions.

The authorization middleware caches role permissions for 5 minutes to reduce database queries.

## Read Next
- [Authentication](authentication.md)
- [Logs](logs.md)
