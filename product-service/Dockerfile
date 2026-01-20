# Use Node.js 18 LTS (alpine)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first (better cache)
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm install --production

# Copy application source
COPY . .

# Expose application port
EXPOSE 3002

# Start the service
CMD ["npm", "start"]
