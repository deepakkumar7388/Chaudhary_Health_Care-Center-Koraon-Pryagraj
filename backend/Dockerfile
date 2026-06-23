# 1. Use the official Node.js image as the base image
FROM node:20-alpine

# 2. Set the working directory inside the container
WORKDIR /usr/src/app

# 3. Copy package.json and package-lock.json files
COPY package*.json ./

# 4. Install production dependencies only
RUN npm ci --only=production

# 5. Copy the rest of the application source code
COPY . .

# 6. Expose the port (Back4app and Render will inject the PORT environment variable)
EXPOSE 5000

# 7. Start the application
CMD ["npm", "start"]
