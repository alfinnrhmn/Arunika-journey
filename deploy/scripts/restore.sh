#!/bin/sh
# Pulihkan backup. Hanya ke database KOSONG (menolak menimpa data). Memverifikasi checksum.
# Pemakaian: deploy/scripts/restore.sh deploy/backups/<stempel>
set -eu
. "$(dirname "$0")/lib.sh"
load_env

dir="${1:?Pemakaian: restore.sh deploy/backups/<stempel>}"
[ -f "$dir/db.dump" ] || { echo "$dir/db.dump tidak ditemukan" >&2; exit 1; }

echo "Memverifikasi checksum..."
( cd "$dir" && sha256sum -c SHA256SUMS )

tables="$(compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "select count(*) from information_schema.tables where table_schema='public'")"
[ "$tables" = "0" ] || { echo "Database tidak kosong ($tables tabel). Restore dibatalkan." >&2; exit 1; }

echo "Memulihkan..."
compose exec -T postgres pg_restore -U "$DB_USER" -d "$DB_NAME" --no-owner --exit-on-error < "$dir/db.dump"
echo "Restore selesai. Jalankan smoke.sh untuk memeriksa."
