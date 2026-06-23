# Use the official full Node.js image (not alpine) to avoid native module build issues
# firebase-admin and other packages need build tools (python3, make, g++)
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev for build, then prune)
RUN npm ci --omit=dev

# Copy the rest of the application source code
COPY . .

# Expose the port (Back4app / Render will inject PORT env variable)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
