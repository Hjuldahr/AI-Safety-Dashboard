FROM node:20-alpine

# Create the folder inside the container
WORKDIR /app

# --- Install Chromium and dependencies ---
# Installs Chromium, specific font libraries, and graphical dependencies required by Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      yarn

# --- Puppeteer Configuration ---
# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

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