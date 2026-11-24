/**
 * Foto sementara. Desain memakai foto stok yang di-host di Doop; URL ini HANYA untuk pengembangan
 * dan harus diganti aset milik klien (CMS Pustaka Media) sebelum rilis. Semua halaman memakai
 * helper ini, jadi penggantian cukup dilakukan di satu tempat.
 */
export const photo = (file: string) => `https://doop.folkastudio.com/a/${file}`;
