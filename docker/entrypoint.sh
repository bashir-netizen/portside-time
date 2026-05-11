#!/usr/bin/env sh
set -euo pipefail

# Apply pending Prisma migrations against the SQLite file (mounted at /data).
echo "[entrypoint] running prisma migrate deploy"
node node_modules/prisma/build/index.js migrate deploy

# Seed if empty (skip-if-data via tsx)
if [ "${SKIP_SEED:-0}" != "1" ]; then
  echo "[entrypoint] running seed (idempotent)"
  node node_modules/.bin/tsx prisma/seed.ts || true
fi

exec "$@"
