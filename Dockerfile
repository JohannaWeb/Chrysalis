FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/

# Build TypeScript (optional, can run directly with tsx)
RUN npm run build || true

# Make tsx available
RUN npm install -g tsx

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -D appuser

USER appuser

ENTRYPOINT ["npx", "tsx", "src/index.ts"]
CMD ["chat"]
