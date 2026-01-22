
This file contains information about the rest of the documentation available about the AI Safety Dashboard project.

## About the documentation
- Some wildcards are used in the documentation which are meant to be filled in by the user depending on their environment:
	- `[Domain]`: This refers to the domain the site is running on, whether it be `http://localhost:2121/`, `https://danielbierman.ca/dashboard`, or some other domain. When you see `[Domain]` in the documentation use whichever domain the application is active on.

## Authentication
- Information about how to authenticate yourself as a user can be found in the `documentation/authentication.md` file.
- API endpoints which require authentication will be tagged "*requires authentication*" as well as include the level of authentication required.

## End Points
- API endpoints are documented in `.md` files in the `documentation/endpoints/` folder. Within 
- Includes the following:
	- `documentation/endpoints/Users.md`: Contains endpoints for users to signup, login, and logout.
	- ToDo: write this section after determining endpoints lol.

## Errors
- Information about how the sites errors are logged can be found in the `documentation/errors.md` file.

## Open API Documentation
- Open API documentation is provided in yaml format in the `documentation/openapi.yml` file.
- It is also available at `[Domain]/docs/`.
- More information about this in the `documentation/openapi_documentation.md` file

