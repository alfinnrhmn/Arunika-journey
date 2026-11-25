// Dijalankan di tiap berkas tes: arahkan aplikasi ke database UJI, tidak pernah ke database lain.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL wajib diatur untuk tes integrasi');
if (!/test/.test(new URL(url).pathname)) {
  throw new Error('Nama database uji harus mengandung "test"');
}
process.env.DATABASE_URL = url;
// Secret khusus uji (bukan rahasia sungguhan) agar Better Auth dapat dibuat di tes.
process.env.BETTER_AUTH_SECRET ??= 'secret-khusus-uji-bukan-rahasia-0123456789abcdef';
process.env.PUBLIC_SITE_URL ??= 'http://localhost:4321';
// Berkas unggahan uji ditulis di dalam proyek (folder yang diabaikan Git), bukan di temp sistem.
process.env.UPLOAD_DIR = './uploads/_test';
