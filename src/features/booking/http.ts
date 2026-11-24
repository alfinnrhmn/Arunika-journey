import type { AstroCookies } from 'astro';
import { DRAFT_COOKIE } from './draft';
import { isBookingError, type BookingError } from './errors';

/**
 * Jembatan HTTP untuk halaman booking: cookie draf, cookie akses booking, dan pemetaan galat domain ke state
 * di desain. Halaman tidak boleh membaca atau menulis cookie booking dengan cara lain.
 */

const isProd = import.meta.env.PROD;

/** Cookie draf (langkah 1 sampai 3): berisi token acak, httpOnly; hanya hash-nya yang ada di database. */
export function setDraftCookie(cookies: AstroCookies, token: string, hours: number) {
  cookies.set(DRAFT_COOKIE, token, {
    path: '/booking',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: hours * 3600,
  });
}
export const readDraftToken = (cookies: AstroCookies) => cookies.get(DRAFT_COOKIE)?.value ?? '';
export function clearDraftCookie(cookies: AstroCookies) {
  cookies.delete(DRAFT_COOKIE, { path: '/booking' });
}

/**
 * Cookie akses booking: satu cookie per kode (`arj_b_ARJ-2611-0001`), berlaku di /pesanan, 30 hari. Pemegangnya
 * dapat membuka halaman status dan mengunggah bukti bayar; tanpa cookie, orang harus lewat Cek Status.
 */
const accessName = (code: string) => `arj_b_${code}`;
export function setAccessCookie(cookies: AstroCookies, code: string, token: string) {
  cookies.set(accessName(code), token, {
    path: '/pesanan',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 30 * 24 * 3600,
  });
}
export const readAccessToken = (cookies: AstroCookies, code: string) =>
  cookies.get(accessName(code))?.value ?? '';

/** Kode booking yang valid secara bentuk (ARJ-YYMM-NNNN); dipakai sebelum kode masuk ke nama cookie atau query. */
export const isBookingCode = (s: string) => /^ARJ-\d{4}-\d{4}$/.test(s);

/**
 * State halaman yang dipetakan dari galat domain (sesuai frame desain):
 * - quota        Booking: Kuota tidak mencukupi (`error.detail.seatsLeft`, `error.detail.requested`)
 * - unavailable  Booking: Tanggal tidak tersedia (`error.detail.reason`: not_open | past | cutoff)
 * - incomplete   Langkah 2: Data belum lengkap (`error.detail.issues`: peta bidang ke pesan)
 * - active_hold  Email sudah punya booking menunggu pembayaran (kode TIDAK diberikan: lihat Cek Status)
 * - expired      Hold sudah berakhir
 * - not_found    Draf/jadwal/booking tidak ditemukan atau sudah berakhir
 * - invalid      Masukan tidak valid (jumlah peserta, berkas bukti)
 */
export type BookingUiState =
  'quota' | 'unavailable' | 'incomplete' | 'active_hold' | 'expired' | 'not_found' | 'invalid';

export function uiStateFor(error: BookingError): BookingUiState {
  switch (error.code) {
    case 'quota_insufficient':
      return 'quota';
    case 'schedule_unavailable':
      return 'unavailable';
    case 'draft_incomplete':
      return 'incomplete';
    case 'active_hold_exists':
      return 'active_hold';
    case 'hold_expired':
      return 'expired';
    case 'schedule_not_found':
    case 'draft_not_found':
    case 'booking_not_found':
    case 'payment_not_found':
      return 'not_found';
    case 'party_invalid':
    case 'proof_invalid':
    case 'invalid_state':
      return 'invalid';
  }
}

/** Menjalankan aksi domain dan mengembalikan hasil atau state UI; galat tak terduga dilempar ulang (jadi 500). */
export async function attempt<T>(
  run: () => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: BookingError; state: BookingUiState }> {
  try {
    return { ok: true, value: await run() };
  } catch (e) {
    if (isBookingError(e)) return { ok: false, error: e, state: uiStateFor(e) };
    throw e;
  }
}
