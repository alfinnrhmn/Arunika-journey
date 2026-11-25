// Tautan daftar Journal: penyaring topik/destinasi dan nomor halaman berada di query string, jadi setiap
// keadaan daftar adalah tautan biasa (bisa disalin, dibuka ulang, dan bekerja tanpa JavaScript).
export interface ListParams {
  topik?: string | null;
  destinasi?: string | null;
  halaman?: number | null;
}

/** `/journal?topik=alam&destinasi=bromo&halaman=2#cerita`; hash membuat halaman melompat ke daftar cerita. */
export function listHref({ topik, destinasi, halaman }: ListParams): string {
  const q = new URLSearchParams();
  if (topik) q.set('topik', topik);
  if (destinasi) q.set('destinasi', destinasi);
  if (halaman && halaman > 1) q.set('halaman', String(halaman));
  const s = q.toString();
  return `/journal${s ? `?${s}` : ''}#cerita`;
}
