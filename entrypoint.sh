#!/bin/sh
set -eu

echo "Menerapkan migrasi database..."
node scripts/migrate.mjs

exec "$@"
