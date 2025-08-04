FROM node:18-slim

# Install Python and pip for Garak
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Garak using --break-system-packages to override the externally managed environment
RUN pip3 install --break-system-packages garak

# Copy application code
COPY src/ ./src/

# Create necessary directories
RUN mkdir -p config temp logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]
