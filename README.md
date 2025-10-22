# CST8414-Applied-Research-Project
AI dashboard


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
- Send an email request to receive the contents of this env file (should not be posted to github for security purposes)

## Step 5 - Run the server
- You should now be good to go.
- Run `npm start` in the projects root directory, then head to `http://localhost:2121` to see the website or click on the hyperlink provided in the terminal.
