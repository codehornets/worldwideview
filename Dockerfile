# Stage 1: Install ALL dependencies (needed for build)
FROM node:22-alpine AS deps
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY . .
RUN pnpm i --frozen-lockfile

# Stage 2: Install PRODUCTION-ONLY dependencies (for runtime)
FROM node:22-alpine AS proddeps
RUN corepack enable pnpm
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY . .
RUN pnpm i --prod --frozen-lockfile

# Stage 3: Build the application
FROM deps AS builder
RUN npx prisma generate

# Create an empty SQLite database with all tables applied
RUN mkdir -p ./data && DATABASE_URL=file:./data/wwv.db npx prisma migrate deploy

RUN pnpm run build
RUN node scripts/copy-cesium.mjs

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:./data/wwv.db
ENV AUTH_TRUST_HOST=true

# Copy Prisma schema + migrations for runtime DB init
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy Prisma generated client
COPY --from=builder /app/src/generated ./src/generated

# Copy standalone server output
COPY --from=builder /app/.next/standalone ./

# Copy production-only node_modules (much smaller than full deps).
# This is future-proof: any production dependency is automatically available.
COPY --from=proddeps /app/node_modules ./node_modules

# Copy static assets that standalone mode does NOT include
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Entrypoint: migrate DB on first run, then start server
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Declare /app/data as a persistent volume mount point.
# When deploying via Coolify/Dockerfile (not docker-compose), you MUST
# add a Persistent Storage mount to /app/data in the Coolify UI.
VOLUME ["/app/data"]

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
