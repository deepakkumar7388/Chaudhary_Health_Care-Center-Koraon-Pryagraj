# Use Node.js 18 base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install root and backend dependencies
RUN npm install
RUN cd backend && npm install

# Copy project files
COPY . .

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080
ENV PORT=8080

# Run the app using root package.json start script
CMD ["npm", "start"]
