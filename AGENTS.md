# Petunjuk agen Arunika Journey

Berlaku untuk seluruh repo. Alur kerja mengikuti proyek Stokpa. Repo ini **publik**: PRD, Client Brief, UX Research, berkas desain, dan rahasia tidak ada di sini dan tidak boleh ditambahkan.

## Cabang dan commit

- `main` = produksi, **dilarang commit langsung**. `dev` = integrasi; `dev` digabung ke `main` oleh pemilik repo lewat pull request setelah CI hijau.
- Fitur dan perbaikan: `feat/<nama>`, `fix/<nama>`, `chore/<nama>` dari `dev`, lalu pull request ke `dev`. Saat pemilik atau tim lain ikut commit, pakai alur ini. Selama agen bekerja sendiri atas izin pemilik, commit kecil langsung ke `dev` diperbolehkan.
- Pesan commit: Conventional Commits berskop, mis. `feat(booking): hold kuota atomik`, `fix(db): ...`, `docs: ...`, `test: ...`, `ci: ...`, `chore: ...`.
- Agen tidak commit, push, merge, atau deploy kecuali diizinkan pemilik. Jangan pernah `git reset --hard`, `git clean -fd`, force push, atau membuang perubahan orang lain. Catat konflik di luar scope, jangan menimpanya.
- Jangan commit `.env`, rahasia, kunci, dump database, atau berkas besar (gambar referensi, `.pen`).

## Pemeriksaan sesuai ruang lingkup

Jalankan yang relevan, bukan semuanya. Skip bukan bukti lulus.

| Perubahan | Jalankan |
|---|---|
| Teks, gaya, tata letak | `npm run check` dan `npm run lint` |
| Logika murni (harga, status) | tes unit terkait (`npm test`) |
| Skema, query, kuota, kode booking | `npm run db:generate` bila skema berubah, lalu `npm run test:integration` (butuh Postgres uji) |
| Dockerfile, `deploy/`, entrypoint | build image dan `docker compose --profile app up` lokal |
| Dokumentasi saja | periksa tautan dan diff; catat bahwa tes aplikasi tidak dijalankan |

- Uji visual dan e2e tidak dijalankan untuk perubahan kecil. Uji visual otomatis baru dipasang menjelang rilis.
- Tes integrasi hanya terhadap database uji sekali pakai (`TEST_DATABASE_URL`, namanya wajib mengandung `test`). Jangan pernah mengarahkannya ke database pengembangan atau produksi.

## Aturan teknis

- Rupiah selalu bilangan bulat (`bigint`), tidak pernah float. Semua harga sudah termasuk PPN; tidak ada baris pajak terpisah.
- Harga, total, DP, kuota, dan status pembayaran **dihitung dan diputuskan di server**; jangan percaya nilai dari klien.
- Kuota dikunci lewat `holdSeats`/`releaseSeats` (UPDATE bersyarat atomik); jangan membaca lalu menulis kuota terpisah. `CHECK` di database adalah pagar terakhir, bukan pengganti.
- Kode booking `ARJ-YYMM-NNNN` dan permintaan `RQ-YYMM-NNNN` hanya dibuat lewat `nextCode`.
- Migrasi: tambahkan baru lewat `npm run db:generate`; jangan mengubah migrasi yang sudah di-commit. Produksi tidak pernah menjalankan migrasi "down"; pemulihan memakai backup. Log audit bersifat append-only (trigger database).
- Peran hanya `owner` dan `admin_ops`. Izin dicek di server, bukan hanya dengan menyembunyikan menu.
- Jangan mencetak rahasia, token, atau data pribadi pelanggan di log, komentar, atau pesan commit.

## Dependensi

- Versi dikunci (`save-exact`) dan `.npmrc` mematikan skrip instalasi. Pasang hanya rilis yang sudah berumur minimal 7 hari, kecuali patch keamanan kritis. Jangan memakai `npm audit fix --force`.
- Di CI dan Docker pakai `npm ci`. Perubahan `package-lock.json` harus disengaja dan ditinjau.

## Docker

- Lokal: `docker compose up -d --wait postgres`, aplikasi lewat `npm run dev`. Postgres 17 di semua lingkungan.
- Rilis: `deploy/` (lihat `deploy/README.md`): `install.sh`, `upgrade.sh`, `backup.sh`, `restore.sh`, `smoke.sh`.
- Berkas sementara, cache, dan unduhan besar di drive D: atau folder proyek, bukan C:.
