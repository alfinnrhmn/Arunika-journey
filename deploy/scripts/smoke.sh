#!/bin/sh
# Uji cepat setelah install/upgrade: liveness, readiness (termasuk database), dan lewat Caddy.
set -eu
. "$(dirname "$0")/lib.sh"
load_env

echo "Liveness (/healthz)..."
compose exec -T app wget -q -O- http://127.0.0.1:4321/healthz >/dev/null
echo "Readiness (/readyz, cek database)..."
compose exec -T app wget -q -O- http://127.0.0.1:4321/readyz >/dev/null
echo "Lewat Caddy (HTTPS)..."
code="$(curl -ksS -o /dev/null -w '%{http_code}' --resolve "${SITE_HOST}:443:127.0.0.1" "https://${SITE_HOST}/healthz" || true)"
[ "$code" = "200" ] || { echo "Caddy membalas HTTP $code (harusnya 200)" >&2; exit 1; }
echo "Smoke test lulus."
