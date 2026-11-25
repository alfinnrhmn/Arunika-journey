/**
 * Foto sementara. Desain memakai foto stok yang di-host di Doop; URL ini HANYA untuk pengembangan
 * dan harus diganti aset milik klien (CMS Pustaka Media) sebelum rilis. Semua halaman memakai
 * helper ini, jadi penggantian cukup dilakukan di satu tempat.
 */
export const photo = (file: string) => `https://doop.folkastudio.com/a/${file}`;

/**
 * Foto situs (WebP hasil konversi aset Stitch) di public/foto, disajikan lewat /foto/<nama>.webp.
 * Foldernya tidak ikut repo publik (lihat .gitignore): foto dibawa terpisah saat rilis.
 */
export const foto = (nama: string) => `/foto/${nama}.webp`;

/**
 * URL foto dari kunci penyimpanan (storage key) di tabel `media`. Kunci berawalan `foto/` menunjuk berkas
 * di public (mis. `foto/kawah-ijen.webp` menjadi `/foto/kawah-ijen.webp`); selain itu dianggap foto
 * stok lama dan dipetakan lewat `photo()`. Nanti diganti URL penyimpanan objek milik klien.
 */
export const mediaUrl = (key: string) => (key.startsWith('foto/') ? `/${key}` : photo(key));
