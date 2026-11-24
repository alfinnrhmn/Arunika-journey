#!/bin/sh
# Backup database ke deploy/backups/<stempel>/ (db.dump + SHA256SUMS). Jadwalkan harian (cron)
# dan salin foldernya ke luar server. Backup berisi data pribadi pelanggan: simpan terenkripsi.
set -eu
. "$(dirname "$0")/lib.sh"
load_env

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$DEPLOY_DIR/backups/$stamp"
mkdir -p "$out"

echo "Membuat dump database..."
compose exec -T postgres pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$out/db.dump"
[ -s "$out/db.dump" ] || { echo "Dump kosong, backup gagal" >&2; rm -rf "$out"; exit 1; }

( cd "$out" && sha256sum db.dump > SHA256SUMS )
echo "Backup selesai: $out"
