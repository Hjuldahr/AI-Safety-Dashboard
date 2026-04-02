# Authenticating Yourself
In order to access many of the API endpoints and sections of the web application, you must first authenticate yourself.

Authentication is handled by [Passport.js](http://www.passportjs.org/) using the local strategy (username + password). Sessions are stored in MongoDB via `connect-mongo`.

## Browser-based Authentication
For users using the web application, visit `[Domain]/login` to access the login/signup page. You can also click the login button in the navigation bar.

### Signing Up
New users can register with a username, email, and password. All new accounts are assigned the `viewer` role by default. An admin can later upgrade the role.

### Logging In
Enter your username and password. On success, a session cookie (`dashboard_v2.sid`) is set and you are redirected to the dashboard.

## API Authentication
For users directly interacting with the API, authenticate via:

#### **POST** `[Domain]/api/login`
Send JSON:
```json
{
    "username": "john_doe",
    "password": "securePassword123"
}
```

On success, the response includes a session cookie that must be sent with subsequent requests.

#### **POST** `[Domain]/api/signup`
```json
{
    "username": "john_doe",
    "email": "john@example.com",
    "password": "securePassword123"
}
```

Returns `201` on success, `409` if the username or email already exists.

#### **POST** `[Domain]/api/logout`
Destroys the session and redirects to the login page.

## Authorization
After authentication, access to pages and API endpoints is controlled by role-based permissions. See [User Management](user-management.md) for details on roles and permissions.

The authorization middleware checks the user's role against the required permission for each route. Permissions are cached for 5 minutes to reduce database queries.

## Read Next
* [API Documentation](http://localhost:2121/api/docs)
* [User Management](user-management.md)
* [Errors](errors.md)
