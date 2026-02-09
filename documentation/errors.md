# Error Handling
Currently there is no centralized error handler. Errors that are thrown can be found in one of three locations:

## Client Side - Handled
- A Handled client side error is one that has been anticipated and will alert the user that they need to change something in their request.
- A client side alert will be displayed letting the user know of their error, and the steps required to remedy it.

## Client Side - Unhandled
- Unhandled client side errors will be thrown in the browser's console, visible by either pressing F12 or right clicking the page, and then heading to "console".
- These are client side errors that we have not anticipated and or fixed yet.

## Server Side:
- Server side errors will appear in the running server console, and depending on whether they are handled or not may cause a server crash.

## Read Next
* [API Documentation](http://localhost:2121/api/docs)
