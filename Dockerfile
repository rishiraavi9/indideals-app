# Multi-stage build for IndiaDeals

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Image
FROM node:20-alpine AS production
WORKDIR /app

# Install dependencies for backend (including tsx for running TypeScript)
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy backend source files (using tsx to run TypeScript directly)
COPY backend/src ./src
COPY backend/drizzle ./drizzle
COPY backend/drizzle.config.ts ./
COPY backend/tsconfig.json ./

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
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/deals?limit=1 || exit 1

# Start the application using tsx (TypeScript execution)
CMD ["npx", "tsx", "backend/src/index.ts"]
