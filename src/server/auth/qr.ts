import qrcode from 'qrcode-generator';

/**
 * Kode QR sebagai SVG sebaris (untuk aplikasi autentikator). Dibuat di server dari URI otpauth milik pengguna itu
 * sendiri, jadi aman disisipkan sebagai HTML; halaman yang menampilkannya wajib `no-store` karena memuat rahasia.
 * Pustaka qrcode-generator: tanpa dependensi dan tanpa skrip instalasi.
 */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
}
