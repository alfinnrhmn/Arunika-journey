/**
 * Galat domain booking. UI memetakan `code` ke state di desain (Kuota tidak mencukupi, Tanggal tidak
 * tersedia, Data belum lengkap, dst.), jadi kode ini bagian dari kontrak dan tidak boleh berubah sembarangan.
 */
export type BookingErrorCode =
  /** Jadwal tidak ditemukan atau trip belum terbit. */
  | 'schedule_not_found'
  /** Jadwal tidak terbuka (penuh, ditutup, dibatalkan, lewat batas pemesanan). State "Tanggal tidak tersedia". */
  | 'schedule_unavailable'
  /** Peserta melebihi sisa kursi. State "Kuota tidak mencukupi"; `detail.seatsLeft` berisi sisa. */
  | 'quota_insufficient'
  /** Jumlah peserta di luar batas (minimal 1 dewasa, maksimal dari Pengaturan). */
  | 'party_invalid'
  | 'draft_not_found'
  /** Data pemesan/peserta/persetujuan belum lengkap; `detail.issues` berisi peta bidang ke pesan. */
  | 'draft_incomplete'
  /** Email yang sama sudah punya hold aktif; `detail.code` berisi kode booking untuk dilanjutkan. */
  | 'active_hold_exists'
  | 'booking_not_found'
  /** Hold sudah berakhir. */
  | 'hold_expired'
  | 'payment_not_found'
  /** Aksi tidak diizinkan pada status saat ini. */
  | 'invalid_state'
  /** Berkas bukti bayar tidak valid (jenis atau ukuran). */
  | 'proof_invalid';

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly detail: Record<string, unknown>;

  constructor(code: BookingErrorCode, message: string, detail: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BookingError';
    this.code = code;
    this.detail = detail;
  }
}

export const isBookingError = (e: unknown): e is BookingError => e instanceof BookingError;
