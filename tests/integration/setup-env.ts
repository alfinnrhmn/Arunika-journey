// Dijalankan di tiap berkas tes: arahkan aplikasi ke database UJI, tidak pernah ke database lain.
const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL wajib diatur untuk tes integrasi');
if (!/test/.test(new URL(url).pathname)) {
  throw new Error('Nama database uji harus mengandung "test"');
}
process.env.DATABASE_URL = url;
