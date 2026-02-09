# Features

## Auth
[] User Roles
    - Owner
    - Admin
    - Viewer
    - User
    - Guest
[] User Management Page
[] Permissions
    - Permsissions defined based on the above 5 roles.


## Dashboard

#### Dashboard Functionality
[] Zoom in / out on graphs.
[] Switch between chart types.

#### Dashboard UI
[] Graphs look better on all screen sizes (all zooms).
[] Dashboard page looks good on mobile
    - Currently it is unusable on mobile.


## Alerts

#### Alert Functionality
[] Add Tags to Alerts
[] Add a Mini "A;ert Dashboard" for key alert metrics
    - Number of high, medium, low, and info alerts triggered.
    - Number of flagged messages.
[] Alerts return the prompts that generated the alert.

#### Alert UI
[] Figure out what units we will allow users to enter in value textbox. This will need to be checked both in the frontend and the backend for good UX.
    - E.x. Accuracy greater than 90%, Usage greater than 100W, etc. What units are acceptable?
    - I think this has been completed?
[] Alerts page works well on mobile
    - Currently it works pretty well, but some buttons are too large, formatting issues, etc.


## Reports

#### Report Functionality
[] Report History
[] Send Report Via Email
[] Time Based Filtering
[] Users can select which variables to include in Report - (?)
    - This has not been discussed with team yet.
[] BUG - When selecting the date for a report, there is a mismatch between local and utc time or something - if you generate a report near the end of the 
         day you will have to select the next day in order for the logs to appear.

#### Report UI
[] Report PDF's are look good.
    - Need to ensure a limited amount of pages.
[] Report UI is consistent with rest of site.
    - Update Report UI.


## Logs

#### Logs Functionality
[] Add csv and pdf export functionality.
[] Add Time based filtering to AI_Logs.
[] Add Tags to Logs

#### Logs UI
[] Figure out placement of summaries / generalized data.
    - As another button on top? in the nav bar on the right?


## Testing
[] Unit Testing
    [] Controllers
    [] Routers
    [] Models
[] Integration Testing


## Documentation
[] API Specification
    - Discuss OpenAPI implementation and whether it works.
[] Overall Architechture

## UI
[] Darkmode
[] Consistent Theming
    - All the pages should use the same theme.



# Bugs

## Dashboard
[] Page becomes unresponsive and loads forever when editing a graph
    - Related to SSE's?
    - Cannot load any other page until the offending page is closed.
    - This bug has been hard to track down - limited instances of finding this bug in a while.
    - Likely caused by a server side error that is not being logged. The fix is adding more try/catch statements
    