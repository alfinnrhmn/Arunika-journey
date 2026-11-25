/**
 * Pemeriksaan asal (CSRF) untuk permintaan yang mengubah data di dashboard. Lapisan kedua di atas cookie
 * `SameSite=Lax`: pemeriksaan bawaan Astro (`security.checkOrigin`) hanya berlaku untuk permintaan berjenis form,
 * sehingga POST tanpa badan dan tanpa tipe konten lolos darinya.
 *
 * Aturan: metode aman (GET/HEAD/OPTIONS) selalu lolos. Untuk metode lain, header `Origin` harus persis salah satu
 * asal situs; bila tidak ada `Origin`, diterima hanya jika browser menyatakan `Sec-Fetch-Site: same-origin`.
 * Klien non-browser tanpa kedua header ditolak, yang memang diinginkan karena dashboard hanya dipakai lewat browser.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function isSameOriginRequest(request: Request, allowedOrigins: readonly string[]): boolean {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;
  const origin = request.headers.get('origin');
  if (origin) return allowedOrigins.includes(origin);
  return request.headers.get('sec-fetch-site') === 'same-origin';
}
