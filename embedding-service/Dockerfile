FROM node:20-slim

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Expose port for the /search endpoint
EXPOSE 4000

# Start the application
CMD ["npm", "start"]
