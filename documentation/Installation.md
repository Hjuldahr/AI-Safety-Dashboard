# Installing the Project

The project can be run either locally (Node.js + MongoDB) or via Docker.

---

## Option A: Local Development

### Step 1: Node.js
Ensure you have Node.js 20+ and npm installed:
- **Check** if they're installed:
    - `node -v`
    - `npm -v`
- **If not installed**, download from the [official Node.js website](https://nodejs.org/).

### Step 2: MongoDB
Download MongoDB Community Edition and MongoDB Compass from the following link:
- https://www.mongodb.com/try/download/community

Then download MongoDB CLI tools:
- https://www.mongodb.com/try/download/database-tools

#### Installing MongoDB Database Tools on Windows
1. Download the MSI installer from the [MongoDB Database Tools Download Center](https://www.mongodb.com/try/download/database-tools).
2. Run the installer and follow the prompts.
3. Add the tools to your system PATH:
    - Open **Start Menu** → search "Environment Variables"
    - Click **"Edit the system environment variables"**
    - Click **"Environment Variables..."**
    - Under **System variables**, find **Path** → click **Edit**
    - Click **New** and add: `C:\Program Files\MongoDB\Tools\100\bin`
    - Click **OK** to close all dialogs

### Step 3: Install Dependencies
In the project's root directory, run:
```bash
npm install
```

### Step 4: Create the ENV File
Create a `.env` file in the project root. Use `.example.env` as a template:

```env
DEFAULT_APP_USER=admin
DEFAULT_ADD_EMAIL=admin@example.com
DEFAULT_APP_PASSWORD=yourpassword
SESSION_SECRET=your-session-secret
MONGO_URL=mongodb://127.0.0.1:27017/dashboardDB
```

See [Development Environment](development-environment.md) for a full list of environment variables.

### Step 5: Run the Server
```bash
npm start
```
Then visit `http://localhost:2121`.

---

## Option B: Docker

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. Create a `.env` file in the project root (same as Step 4 above)
2. Run:
   ```bash
   docker compose up --build
   ```
3. Visit `http://localhost:2121`

Docker Compose will start:
- The Node.js application container
- A MongoDB 7 container with persistent storage

The `docker-compose.override.yml` maps port 2121 for local development. For production, you would configure your own port mapping and reverse proxy.

---

## First Startup

On first startup, the server will automatically:
1. Connect to MongoDB
2. Create a default admin user from the `.env` credentials
3. Seed default chart configurations
4. Seed default roles (owner, admin, user, viewer, visitor)
5. Start the real-time data scheduler

## Read Next
* [Authentication](authentication.md)
* [Development Environment](development-environment.md)
* [API Documentation](https://danielbierman.ca/dashboard/api/docs/)
