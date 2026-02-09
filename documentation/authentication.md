# Authenticating Yourself
In order to access many of the API endpoints, and sections of the web application, you must first authenticate yourself.

Authentication can be done in two ways.

## Browser-based Authentication
- For users using the web application, they can either click on the login button in the top right, or visit `[Domain]/login` to view the login / sign up page.


## API Authentication
- For users directly interacting with the API, they can log in via the following API Endpoint:

#### **POST**  `[Domain]/api/login`:
Send `multipart/form-data`:
```JSON
{
	"username": "john_doe",
	"password": "securePassword123"
}
```

## Read Next
* [API Documentation](http://localhost:2121/api/docs)
* [Errors](errors.md)