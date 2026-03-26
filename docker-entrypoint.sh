#!/bin/sh
# ─── Docker Entrypoint ───────────────────────────────────────
# Ensures the SQLite database exists and is migrated before
# starting the application. On first run with a fresh volume
# the DB file won't exist yet, so we run prisma migrate deploy.

set -e

mkdir -p ./data
echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy
echo "[entrypoint] Migrations complete."

exec node server.js
