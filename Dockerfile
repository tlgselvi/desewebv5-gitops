# Stage 1: Base image with pnpm
FROM node:20.19-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable pnpm
WORKDIR /app

# Stage 2: Install backend dependencies
FROM base AS backend-deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --prod=false

# Stage 3: Install frontend dependencies
FROM base AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile --prod=false

# Stage 4: Build backend
FROM base AS backend-builder
COPY . .
COPY --from=backend-deps /app/node_modules ./node_modules
RUN pnpm build:backend

# Stage 5: Build frontend
FROM base AS frontend-builder
WORKDIR /app
# Copy frontend source
COPY frontend/package.json frontend/pnpm-lock.yaml* frontend/tsconfig.json frontend/next.config.js ./frontend/
# Copy frontend dependencies
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
# Copy frontend source code after dependencies
COPY frontend ./frontend
WORKDIR /app/frontend
# Add build timestamp to bust cache
ARG BUILD_DATE=unknown
RUN echo "Build date: $BUILD_DATE" > /tmp/build-info.txt
RUN pnpm build

# Stage 6: Final production image
FROM node:20.19-alpine AS runner
RUN apk add --no-cache wget
RUN corepack enable pnpm
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 dese

# Copy production dependencies
COPY package.json pnpm-lock.yaml* ./
COPY --from=backend-deps /app/node_modules ./node_modules

# Copy compiled backend
COPY --from=backend-builder --chown=dese:nodejs /app/dist ./dist
# Copy source files for MCP servers (needed for tsx execution)
COPY --from=backend-builder --chown=dese:nodejs /app/src ./src
# Copy tsconfig.json for path alias resolution
COPY --from=backend-builder --chown=dese:nodejs /app/tsconfig.json ./tsconfig.json
# Copy drizzle migrations directory (from host, not from builder)
# Note: drizzle folder must exist in build context
COPY --chown=dese:nodejs ./drizzle ./drizzle

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create necessary directories
RUN mkdir -p logs uploads
RUN chown -R dese:nodejs logs uploads

# Copy entrypoint scripts
COPY --chown=dese:nodejs scripts/docker-entrypoint.sh scripts/wait-for-db.sh scripts/check-env.sh /app/scripts/
RUN chmod +x /app/scripts/docker-entrypoint.sh /app/scripts/wait-for-db.sh /app/scripts/check-env.sh

# Install PostgreSQL client for wait-for-db.sh and seed check
RUN apk add --no-cache postgresql-client netcat-openbsd

# Switch to non-root user
USER dese

EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Google Cloud credentials path should be provided via docker-compose or kubernetes secrets
# ENV GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-credentials.json

# Health check for backend API
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use entrypoint script
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]

# Start the application
CMD ["pnpm", "start"]
