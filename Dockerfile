# Use a lightweight node image
FROM node:20-alpine

# Create the folder inside the container
WORKDIR /app

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