# Introduction
This file contains information about the rest of the documentation available about the AI Safety Dashboard project.

## About the documentation
- Some wildcards are used in the documentation which are meant to be filled in by the user depending on their environment:
	- `[Domain]`: This refers to the domain the site is running on, whether it be `http://localhost:2121/`, `https://danielbierman.ca/dashboard`, or some other domain. When you see `[Domain]` in the documentation use whichever domain the application is active on.

## Authentication
- Information about how to authenticate yourself as a user can be found in the [Authentication](authentication.md) file.
- API endpoints which require authentication will be tagged "*requires authentication*" as well as include the level of authentication required.

## Pages
- There are 4 main pages that drive the rest of the site:
	- [Dashboard](dashboard.md)
	- [Alerts](alerts.md)
	- [Reports](reports.md)
	- [Logs](logs.md)
- There are several other pages used to drive functionality to the above pages:
	- [Profile](profile.md)
	- [Management](management.md)
	- [Demo Controls](demo-controls.md)

## API Documentation
- We have created OpenAPI documentation which is available [here](https://danielbierman.ca/dashboard/api/docs/).
- We are using [Swagger](https://swagger.io/) to render the API documentation.

## Reference
- [Constants Reference](constants.md) — documentation for all shared constants (charts, roles, permissions, notifications, SSE)
- [Installation](installation.md) — architecture, project structure, and setup guide
- [AI Integration Guide](ai-integration.md) — how to replace the fake data generator with a real AI system

## Errors
- Information about how the site's errors are logged can be found in [Errors](errors.md).

## Open API Documentation
- Open API documentation is provided at [API Documentation](https://danielbierman.ca/dashboard/api/docs/).
- It is also available at `[Domain]/api/docs/`.
- More information about this in [About OpenAPI Documentation](openapi_documentation.md)

## Read Next
* [Installation](installation.md)
* [Authentication](authentication.md)
* [Dashboard](dashboard.md)
