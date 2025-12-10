# Use a lightweight node image
FROM node:20-alpine

# Create the folder inside the container
WORKDIR /app

# 1. Install System Dependencies for Chromium
# Alpine uses 'apk' to install packages. We must install the 'chromium' package
# and other critical rendering dependencies (like nss, freetype, etc.)
RUN apk update \
    && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ttf-freefont \
    # Clean up apk cache to keep the image size minimal
    && rm -rf /var/cache/apk/*

# Copy package.json first (for better caching)
COPY package.json ./

# Install dependencies
# If Puppeteer is a dependency, it will now detect the system Chromium installation.
RUN npm install

# Copy the rest of your code
COPY . .

# 2. Switch to a Non-Root User (Best Practice for Chrome/Puppeteer)
# The node:alpine image conveniently includes a 'node' user.
# We just need to give it ownership of the app directory and switch to it.
RUN chown -R node:node /app
USER node

# Expose the internal port (Kept at 3000 as per your original file)
EXPOSE 3000

# Start the app
CMD ["node", "app.js"]