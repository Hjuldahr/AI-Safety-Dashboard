FROM node:20

# Create the folder inside the container
WORKDIR /app

# --- Install Chromium and dependencies ---
# Installs Chromium, specific font libraries, and graphical dependencies required by Alpine
RUN apt-get update && \
    apt-get install -y \
    chromium \
    fonts-noto-color-emoji \
    libhdf5-dev

# Copy package.json first (for better caching)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of your code
COPY . .

# Expose the internal port
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]