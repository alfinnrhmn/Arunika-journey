#!/bin/sh
# Instalasi baru di server. Menolak rahasia kosong/placeholder/pendek.
set -eu
. "$(dirname "$0")/lib.sh"
load_env

require_value ARUNIKA_VERSION
require_value SITE_HOST
require_value TLS_MODE
require_value DB_NAME
require_value DB_USER
require_secret DB_PASSWORD 16
require_secret BETTER_AUTH_SECRET 32

echo "Membangun image dan menjalankan stack..."
compose build
compose up -d --wait
echo "Menjalankan smoke test..."
sh "$DEPLOY_DIR/scripts/smoke.sh"
echo "Instalasi selesai."
