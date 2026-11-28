// Validasi isian Request a Quote (fungsi murni, dipakai skrip klien). Mengembalikan teks galat atau '' bila valid.
// Hanya untuk umpan balik di layar: belum ada server penerima, dan kelak server tetap memvalidasi ulang.
import { errors, partyLimits, storyMax } from '../../../content/private-request';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Tanggal ISO (yyyy-mm-dd) yang benar-benar ada di kalender. */
export function isRealDate(v: string): boolean {
  const m = ISO.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
}

/** `min` berupa tanggal ISO hari ini (WIB) dari server; perbandingan teks ISO aman karena formatnya tetap. */
export function checkTanggal(v: string, min: string): string {
  if (!v) return errors.tanggal;
  if (!isRealDate(v)) return errors.tanggalFormat;
  if (min && v < min) return errors.tanggalLampau;
  return '';
}

export function checkDurasi(v: string): string {
  return v ? '' : errors.durasi;
}

export function checkDewasa(n: number): string {
  if (!Number.isFinite(n)) return errors.peserta;
  if (n < partyLimits.adultMin) return errors.dewasa;
  if (n > partyLimits.adultMax) return errors.peserta;
  return '';
}

export function checkAnak(n: number): string {
  if (!Number.isFinite(n) || n < partyLimits.childMin || n > partyLimits.childMax) {
    return errors.peserta;
  }
  return '';
}

export function checkCerita(v: string): string {
  return v.length > storyMax ? errors.cerita : '';
}

export function checkNama(v: string): string {
  const t = v.trim();
  if (!t) return errors.nama;
  if (t.length < 2) return errors.namaPendek;
  return '';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function checkEmail(v: string): string {
  const t = v.trim();
  if (!t) return errors.email;
  return EMAIL.test(t) ? '' : errors.emailFormat;
}

export function checkEmail2(v: string, email: string): string {
  const t = v.trim();
  if (!t) return errors.email2;
  return t.toLowerCase() === email.trim().toLowerCase() ? '' : errors.email2Beda;
}

/** Telepon opsional: kosong boleh. Terisi harus 8 sampai 13 angka (tanpa 0 di depan, kode negara sudah +62). */
export function checkTelepon(v: string): string {
  const t = v.trim();
  if (!t) return '';
  if (/[^\d\s-]/.test(t)) return errors.telepon;
  const digits = t.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 13 && !digits.startsWith('0') ? '' : errors.telepon;
}

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** "Januari 2027 (fleksibel)" atau "9 Januari 2027". Tanggal tidak valid mengembalikan ''. */
export function formatWaktu(iso: string, fleksibel: boolean): string {
  if (!isRealDate(iso)) return '';
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const bulan = BULAN[m - 1]!;
  return fleksibel ? `${bulan} ${y} (fleksibel)` : `${d} ${bulan} ${y}`;
}

export function formatPeserta(dewasa: number, anak: number): string {
  return anak > 0 ? `${dewasa} dewasa, ${anak} anak` : `${dewasa} dewasa`;
}
