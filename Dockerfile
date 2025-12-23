# Multi-stage build for IndiaDeals

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/src ./src
COPY backend/drizzle ./drizzle
COPY backend/drizzle.config.ts ./
COPY backend/tsconfig.json ./
# Build backend using esbuild (fast, skips type checking)
RUN npm run build

# Stage 3: Production Image
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only for backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev

# Copy built backend from builder stage
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/drizzle ./drizzle

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start the pre-built application
CMD ["node", "backend/dist/index.js"]
