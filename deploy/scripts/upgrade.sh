#!/bin/sh
# Upgrade ke tag rilis. Urutan: backup, build, jalankan (migrasi berjalan saat app start), smoke.
# Pemakaian: deploy/scripts/upgrade.sh <tag>
set -eu
. "$(dirname "$0")/lib.sh"
load_env

tag="${1:?Pemakaian: upgrade.sh <tag>}"
echo "Backup sebelum upgrade..."
sh "$DEPLOY_DIR/scripts/backup.sh"

echo "Upgrade ke $tag..."
ARUNIKA_VERSION="$tag"
export ARUNIKA_VERSION
compose build
compose up -d --wait

if sh "$DEPLOY_DIR/scripts/smoke.sh"; then
  echo "Upgrade ke $tag berhasil. Perbarui ARUNIKA_VERSION=$tag di deploy/.env."
else
  echo "UPGRADE GAGAL. Lihat bagian Rollback di deploy/README.md." >&2
  exit 1
fi
