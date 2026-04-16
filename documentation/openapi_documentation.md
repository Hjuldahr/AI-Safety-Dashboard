# About OpenAPI Documentation
- OpenAPI is a standard for documenting REST APIs and their endpoints.
	- This means we can write the API specification, then use tools like Postman or Swagger UI to automatically generate interactive documentation and run tests against the API.
- The API specification is defined in `documentation/openapi.yml` using YAML syntax and follows the OpenAPI 3.0 standard.
- The specification is rendered using [Swagger UI Express](https://www.npmjs.com/package/swagger-ui-express) and [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc).

## Viewing the Docs
You can view the interactive API documentation in your browser at:
- Development: [http://localhost:2121/api/docs](https://danielbierman.ca/dashboard/api/docs)
- Production: [https://danielbierman.ca/dashboard/api/docs/](https://danielbierman.ca/dashboard/api/docs/)

Or at `[Domain]/api/docs/`.

## API Sections

The API is organized into the following tag groups:

| Tag | Description |
|---|---|
| Auth | Login, signup, and logout endpoints |
| Dashboard | Main dashboard page and recent data |
| Alerts | Alert CRUD, history, and unread counts |
| Logs | User logs, AI logs, AI summaries, and exports |
| Reports | PDF and CSV report generation |
| ControlPanel | Scheduler state and chart configuration |
| Admin | User management, roles, and permissions |
| Profile | User profile and preferences |
| Tags | Tag and historical tag management |
| Notifications | Real-time notification system |
| Demo | Demo scenario management |
| SSE | Server-Sent Events stream |
| Documentation | Documentation pages |
| HTML Page | Endpoints that return rendered HTML pages |

## Authentication
Most API endpoints require authentication via a session cookie. Log in via `POST /api/login` to obtain a session, then include the `dashboard_v2.sid` cookie with subsequent requests.

Public endpoints (login, signup) are marked with `security: []` in the spec.

## Read Next
- [API Documentation](https://danielbierman.ca/dashboard/api/docs)
- [Authentication](authentication.md)
