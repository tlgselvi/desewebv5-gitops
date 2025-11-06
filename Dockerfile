# Multi-stage build for Dese EA Plan v6.8.0
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
# Copy lockfile if exists, otherwise install without it
COPY pnpm-lock.yaml* ./
RUN corepack enable pnpm && \
    if [ -f pnpm-lock.yaml ]; then \
        pnpm i --no-frozen-lockfile || pnpm install; \
    else \
        pnpm install; \
    fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN corepack enable pnpm && pnpm build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 dese

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs uploads
RUN chown -R dese:nodejs logs uploads

# Switch to non-root user
USER dese

# Expose port
# Expose ports (Backend API + MCP Servers)
EXPOSE 3001 5555 5556 5557 5558

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check for backend API
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
