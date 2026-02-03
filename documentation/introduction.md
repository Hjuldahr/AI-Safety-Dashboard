# Introduction
This file contains information about the rest of the documentation available about the AI Safety Dashboard project.

## About the documentation
- Some wildcards are used in the documentation which are meant to be filled in by the user depending on their environment:
	- `[Domain]`: This refers to the domain the site is running on, whether it be `http://localhost:2121/`, `https://danielbierman.ca/dashboard`, or some other domain. When you see `[Domain]` in the documentation use whichever domain the application is active on.

## Authentication
- Information about how to authenticate yourself as a user can be found in the [Authentication](/authentication.md) file.
- API endpoints which require authentication will be tagged "*requires authentication*" as well as include the level of authentication required.

## API Documentation
- We are have created OpenAPI documentation which is availible [here](http://localhost:2121/api/docs/).
- We are using [Swagger](https://swagger.io/) to render the api documentation.

## Errors
- Information about how the sites errors are logged can be found in [Errors](errors.md).

## Open API Documentation
- Open API documentation is provided in [API Documentation](http://localhost:2121/api/docs).
- It is also available at `[Domain]/api/docs/`.
- More information about this in [About OpenAPI Documentation](openapi_documentation.md)

## Read Next
* [Installation](installation.md)
* [Authentication](authentication.md)