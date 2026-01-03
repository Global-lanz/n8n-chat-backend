# Build Stage
FROM node:20-bullseye-slim AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install build dependencies and npm packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && if [ -f package-lock.json ]; then npm ci --production=false; else npm install; fi

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:20-bullseye-slim

WORKDIR /app

# Build argument for version
ARG APP_VERSION=unknown

# Copy package files
COPY package.json package-lock.json* ./

# Copy from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copy migrations and entrypoint
COPY migrations ./migrations
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create version file
RUN echo "{\"version\": \"${APP_VERSION}\"}" > /app/version.json

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]