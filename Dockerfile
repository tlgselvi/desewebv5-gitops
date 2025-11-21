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
RUN pnpm install --frozen-lockfile --prod=false

# Stage 4: Build backend
FROM base AS backend-builder
COPY . .
COPY --from=backend-deps /app/node_modules ./node_modules
RUN pnpm build:backend

# Stage 5: Build frontend
FROM base AS frontend-builder
WORKDIR /app
# Copy frontend source
COPY frontend ./frontend
# Copy frontend dependencies
COPY --from=frontend-deps /app/frontend/node_modules ./frontend/node_modules
# Build frontend (use --no-cache to ensure fresh build)
WORKDIR /app/frontend
# Add build timestamp to bust cache
ARG BUILD_DATE=unknown
RUN echo "Build date: $BUILD_DATE" > /tmp/build-info.txt
RUN pnpm build

# Stage 6: Final production image
FROM node:20.19-alpine AS runner
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

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public

# Create necessary directories
RUN mkdir -p logs uploads
RUN chown -R dese:nodejs logs uploads

# Switch to non-root user
USER dese

EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check for backend API
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["pnpm", "start"]
