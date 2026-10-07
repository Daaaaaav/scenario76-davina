FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy application source
COPY src/ ./src/

# Expose the application port (NOT published to host directly —
# port mapping is controlled by docker-compose.yml)
EXPOSE 3075

# Run as non-root user for container security
USER node

CMD ["node", "src/server.js"]
