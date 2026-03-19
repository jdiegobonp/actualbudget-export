# Use Node.js LTS version with Alpine for a small image
FROM node:20-alpine

# Install Python and build tools for native modules
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# The export.js script will run by default.
CMD ["node", "export.js"]