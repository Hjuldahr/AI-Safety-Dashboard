# Error Handling
Currently there is no centralized error handler. Errors that are thrown can be found in one of three locations:

## Client Side - Handled
A handled client-side error is one that has been anticipated and will alert the user that they need to change something in their request. A notification or modal will be displayed letting the user know of the error and the steps required to fix it.

Common handled errors:
- Form validation failures (missing fields, invalid values)
- Permission denied (attempting an action without the required role)
- Duplicate entries (creating a user or tag that already exists)

## Client Side - Unhandled
Unhandled client-side errors will be thrown in the browser's console, visible by pressing F12 or right-clicking the page and heading to "Console". These are errors that have not been anticipated yet.

## Server Side
Server-side errors appear in the running server console. Controllers use try/catch blocks and return appropriate HTTP status codes:

| Status Code | Meaning |
|---|---|
| `400` | Bad Request — invalid input or missing required fields |
| `401` | Unauthorized — not authenticated |
| `403` | Forbidden — authenticated but lacking permission |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — duplicate resource or constraint violation |
| `500` | Internal Server Error — unexpected server failure |

### User Activity Logging
User actions are logged to the `User_Log` collection for audit purposes. This includes logins, logouts, chart/alert/report CRUD operations, and role changes. See [Logs](logs.md) for details.

## Read Next
* [API Documentation](http://localhost:2121/api/docs)
* [Logs](logs.md)
