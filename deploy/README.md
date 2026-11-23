# Paket rilis Arunika Journey

Server Linux + Docker Compose: PostgreSQL 17, aplikasi Astro (Node), dan Caddy (HTTPS). Cloudflare berada di depan (CDN, cache halaman anonim, Turnstile). Semua perintah dijalankan dari root repo di server.

## Prasyarat server

- Ubuntu 22.04/24.04, 2 vCPU, 4 GB RAM, 40 GB SSD; Docker Engine + Compose v2; `git`, `curl`, `openssl`.
- Satu nama host (`SITE_HOST`), port 80/443 terbuka. Di Cloudflare set SSL ke **Full (strict)**.
- HTTPS: `TLS_MODE=<email>` untuk Let's Encrypt (DNS publik mengarah ke server), atau `TLS_MODE=internal` untuk uji.

## Instalasi baru

```sh
git clone https://github.com/alfinnrhmn/Arunika-journey.git && cd Arunika-journey
git checkout <tag-rilis>
cp deploy/.env.release.example deploy/.env      # isi semua nilai; rahasia: openssl rand -base64 48
deploy/scripts/install.sh
```

`install.sh` menolak rahasia kosong, berisi nilai contoh, atau terlalu pendek; lalu membangun image, menjalankan stack (migrasi berjalan saat aplikasi start), dan menjalankan smoke test.

## Upgrade

```sh
git fetch --tags && git checkout <tag>
deploy/scripts/upgrade.sh <tag>
```

Urutan: backup, build, aplikasi baru menjalankan migrasi saat start, health check, smoke test. Gagal = pesan rollback. Setelah berhasil, ubah `ARUNIKA_VERSION` di `deploy/.env`.

## Backup dan restore

```sh
deploy/scripts/backup.sh                          # -> deploy/backups/<stempel>/ (db.dump + SHA256SUMS)
deploy/scripts/restore.sh deploy/backups/<stempel> # hanya ke database KOSONG, verifikasi checksum
```

- Jadwalkan `backup.sh` harian (cron) dan salin folder backup ke luar server. Backup berisi data pribadi pelanggan: simpan terenkripsi, akses terbatas.
- Uji restore ke server kosong setiap kuartal.
- Media (foto) akan disimpan di object storage (R2/MinIO) sehingga tidak ikut backup ini; atur versioning di storage-nya.

## Rollback

Migrasi **tidak pernah** di-rollback dengan perintah `down` di produksi (bisa menghapus kolom atau data). Bila upgrade gagal:

1. `docker compose -p arunika -f deploy/compose.release.yml --env-file deploy/.env down` (tanpa `-v`).
2. Checkout tag versi lama dan set `ARUNIKA_VERSION` lama di `deploy/.env`.
3. Bila skema sudah berubah, pulihkan backup sebelum upgrade ke database kosong baru dengan `restore.sh`, lalu `up -d`.
4. Transaksi yang masuk setelah waktu backup harus dicatat ulang manual; catat jam backup sebelum upgrade.

## Gejala dan pemeriksaan

| Gejala | Periksa |
|---|---|
| Situs tidak bisa dibuka | `docker compose ... ps`; `smoke.sh`; sertifikat (`TLS_MODE`, DNS, mode SSL Cloudflare) |
| `/readyz` membalas 503 | Database belum sehat: `docker compose ... logs postgres`; cek `DB_*` di `deploy/.env` |
| Aplikasi restart terus | `docker compose ... logs app`; kemungkinan migrasi gagal (log "Migrasi gagal") |

Log aplikasi: `docker compose -p arunika -f deploy/compose.release.yml --env-file deploy/.env logs -f app`.
