#!/bin/sh
# Fungsi bersama untuk skrip rilis. Dijalankan dari server (root repo atau mana saja).
set -eu

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ROOT_DIR="$(cd "$DEPLOY_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

load_env() {
  [ -f "$ENV_FILE" ] || { echo "deploy/.env belum ada. Salin dari .env.release.example." >&2; exit 1; }
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
}

compose() {
  docker compose -p "${ARUNIKA_PROJECT:-arunika}" -f "$DEPLOY_DIR/compose.release.yml" --env-file "$ENV_FILE" "$@"
}

# require_secret NAMA PANJANG_MIN: tolak kosong, placeholder, atau terlalu pendek.
require_secret() {
  name="$1"; min="$2"
  eval "val=\${$name:-}"
  [ -n "$val" ] || { echo "$name kosong di deploy/.env" >&2; exit 1; }
  case "$val" in
    *ganti*|*changeme*|*example*|*password*) echo "$name masih berisi nilai contoh" >&2; exit 1 ;;
  esac
  [ "${#val}" -ge "$min" ] || { echo "$name terlalu pendek (minimal $min karakter)" >&2; exit 1; }
}

require_value() {
  name="$1"
  eval "val=\${$name:-}"
  [ -n "$val" ] || { echo "$name kosong di deploy/.env" >&2; exit 1; }
}
