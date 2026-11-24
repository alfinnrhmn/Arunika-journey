/**
 * Format tampilan bahasa Indonesia. Ditulis manual (tanpa Intl) agar keluaran sama di semua
 * lingkungan (server, browser, CI) dan sama persis dengan teks di desain.
 */

const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** 1250000 -> "Rp 1.250.000" */
export function formatRupiah(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const digits = String(Math.abs(Math.trunc(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Rp ${digits}`;
}

function parseDate(iso: string): { y: number; m: number; d: number; dow: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) throw new RangeError(`Tanggal harus berformat YYYY-MM-DD: ${iso}`);
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Hari dihitung di UTC dari tanggal kalender, jadi tidak terpengaruh zona waktu server.
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "2026-12-12" -> "Sab, 12 Des 2026" */
export function formatDateShort(iso: string): string {
  const { y, m, d, dow } = parseDate(iso);
  return `${DAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** (2, 1) -> "2 hari 1 malam"; (1, 0) -> "1 hari" */
export function formatDuration(days: number, nights: number): string {
  return nights > 0 ? `${days} hari ${nights} malam` : `${days} hari`;
}

/** Tanggal kalender hari ini di Asia/Jakarta (YYYY-MM-DD), untuk menyaring jadwal yang sudah lewat. */
export function todayInJakarta(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
