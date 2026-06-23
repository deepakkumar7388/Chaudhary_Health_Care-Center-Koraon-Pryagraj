# Use full Node.js Debian image (has all build tools: python3, make, g++)
# Required for firebase-admin and other packages with native modules
FROM node:20

# Set the working directory
WORKDIR /usr/src/app

# Copy package files first (for Docker layer caching)
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the rest of the source code
COPY . .

# Expose port (Back4app injects PORT env variable)
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]
