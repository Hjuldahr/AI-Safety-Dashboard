# CST8414-Applied-Research-Project
AI dashboard

> **New to this project?** See [Students.md](Students.md) for an in-depth guide to the architecture (MVC, MongoDB, SSE, Chart.js, Puppeteer) written for students inheriting the codebase.


# Installing the Project:
To run the project you must install both node JS and mongo DB.

## Step 1: Node.js
Ensure you have Node.js and npm (Node Package Manager) installed:
- **Check** if they're installed, in cmd run:
    - `node -v`
    - `npm -v`
- **If not installed**, download and install them from the [official Node.js website](https://nodejs.org/).

## Step 2:  Mongo DB
Download MonogoDB compass from the following link, and follow the installer to set it up (pretty sure I left everything as defaults)
##### Mongo DB download link (Mongo Compass)
- https://www.mongodb.com/try/download/community
Then download mongoDb CLI tools from the link below:
https://www.mongodb.com/try/download/database-tools

Here are some instructions you can follow to install the mongo CLI tools:
##### Installing MongoDB Database Tools on Windows
Follow these steps to install the MongoDB Database Tools on your Windows system:
1. **Download the Tools:**
    - Visit the [MongoDB Database Tools Download Center](https://www.mongodb.com/try/download/database-tools).
    - Select your operating system (e.g., Windows x86_64).
    - Choose the MSI installer package.
    - Click the **Download** button.
2. **Install the Tools:**
    - Run the downloaded MSI installer.
    - Follow the installation prompts to complete the setup.
3. **Add Tools to System PATH:**
    - After installation, add the tools to your system's PATH environment variable to access them from any command prompt:
        - Open the **Start Menu** and search for "Environment Variables."
        - Click on **"Edit the system environment variables."**
        - In the **System Properties** window, click on the **"Environment Variables..."** button.
        - Under **System variables**, find and select the **Path** variable, then click **Edit**.
        - Click **New** and add the path to the `bin` directory where the MongoDB tools were installed. By default, this is:
            `C:\Program Files\MongoDB\Tools\100\bin`
        - Click **OK** to close all dialog boxes

## Step 3 - Installing local project dependencies
In the project's root directory, run:
- `npm install`
- (i.e.: in cmd first "cd" to the location you unzipped the folder then run above command)
This command installs all dependencies listed in `package.json`.

## Step 4 - Creating the ENV file:
- Create a file named `.env` in the projects root directory.
- Check out the `.env.example` file for an example of how this file should look.

## Step 5 - Run the server
- You should now be good to go.
- Run `npm start` in the projects root directory, then head to `http://localhost:2121` to see the website or click on the hyperlink provided in the terminal.

---

# Running the Unit Tests

The project uses [Jest](https://jestjs.io/) for unit testing. Unit tests are located in the `tests/` folder and cover middleware, controllers, services, models, and helpers.

## Unit Test Commands

| Command | Description |
|---|---|
| `npm test` | Run all unit tests. This is the default unit-test workflow. |
| `npm run test:unit` | Run all unit tests explicitly using Jest. |

## Notes
- `npm test` runs only the unit test suite and ignores the Playwright E2E folder (`tests/e2e/`).
- Use `npm run test:e2e` for end-to-end testing with Playwright instead of `npm test`.

---

# Running the E2E Tests

The project uses [Playwright](https://playwright.dev/) for end-to-end testing. Tests are located in `tests/e2e/specs/` and cover authentication, dashboard, alerts, reports, profile, admin, navigation, logs, and smoke tests.

## Test Commands

| Command | Description |
|---|---|
| `npm run test:e2e` | Run all E2E tests headlessly. The server starts automatically on port 2121. |
| `npm run test:e2e:headed` | Run all E2E tests in a visible browser window (useful for debugging). |
| `npm run test:e2e:smoke` | Run only tests tagged with `@smoke` — a quick sanity check. |
| `npm run test:e2e:report` | Open the HTML test report from the last run in your browser. |

## Notes
- The Playwright config (`tests/e2e/playwright.config.js`) automatically starts the app server before tests run, so you **do not** need to run `npm start` separately.
- On failure, screenshots, videos, and traces are saved to `test-results/` for debugging.
- To run a single test file, use:
  ```
  npx playwright test --config=tests/e2e/playwright.config.js tests/e2e/specs/<filename>.spec.js
  ```
