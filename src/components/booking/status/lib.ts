import { formatDateShort } from '../../../lib/format';
import type { BookingError } from '../../../features/booking/errors';

/**
 * Pembantu tampilan halaman pesanan dan Cek Status. Tidak berisi aturan bisnis: status, nominal, dan batas
 * waktu semuanya datang dari server (domain booking); di sini hanya format dan pemetaan teks.
 */

/** Batas waktu dalam WIB (UTC+7), dihitung dari UTC agar sama di server mana pun. */
export function formatWib(date: Date): { date: string; time: string; full: string } {
  const shifted = new Date(date.getTime() + 7 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  const iso = `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}`;
  const time = `${p(shifted.getUTCHours())}.${p(shifted.getUTCMinutes())}`;
  const day = formatDateShort(iso);
  return { date: day, time: `${time} WIB`, full: `${day} pukul ${time} WIB` };
}

/**
 * Galat unggah bukti. Kode ini yang ikut di query (`?galat=`), sedangkan teksnya tetap di sini: nilai query
 * mentah tidak pernah dipantulkan ke HTML, hanya kunci yang dikenal yang dipetakan ke teks.
 */
export const PROOF_ERRORS = {
  format: 'Format berkas harus JPG, PNG, WebP, atau PDF. Pilih berkas lain lalu kirim ulang.',
  kosong: 'Berkas yang dipilih kosong. Pilih berkas bukti transfer yang benar.',
  ukuran:
    'Ukuran berkas maksimal 5 MB. Perkecil berkas atau ambil tangkapan layar, lalu kirim ulang.',
  isi: 'Isi berkas tidak sesuai dengan formatnya. Pilih berkas JPG, PNG, WebP, atau PDF yang asli.',
  'tanpa-berkas': 'Pilih berkas bukti transfer terlebih dahulu.',
  kedaluwarsa:
    'Batas waktu pembayaran sudah lewat, jadi bukti tidak bisa diterima. Muat ulang halaman untuk melihat status terbaru.',
  status:
    'Booking ini sedang tidak menunggu pembayaran. Muat ulang halaman untuk melihat status terbaru.',
  gagal: 'Bukti belum terkirim karena gangguan sementara. Coba lagi sebentar lagi.',
} as const;
export type ProofErrorKey = keyof typeof PROOF_ERRORS;

export const proofErrorText = (key: string | null): string | null =>
  key && Object.hasOwn(PROOF_ERRORS, key) ? PROOF_ERRORS[key as ProofErrorKey] : null;

/**
 * Memetakan galat domain ke kunci di atas. Domain hanya memberi satu kode (`proof_invalid`) untuk empat
 * penyebab, jadi penyebabnya dibaca dari pesan tetap di proof.ts; bila pesan berubah, jatuh ke "format".
 */
export function proofErrorKey(error: BookingError): ProofErrorKey {
  switch (error.code) {
    case 'proof_invalid': {
      const m = error.message;
      if (/kosong/i.test(m)) return 'kosong';
      if (/ukuran/i.test(m)) return 'ukuran';
      if (/isi berkas/i.test(m)) return 'isi';
      return 'format';
    }
    case 'hold_expired':
      return 'kedaluwarsa';
    case 'invalid_state':
    case 'booking_not_found':
    case 'payment_not_found':
      return 'status';
    default:
      return 'gagal';
  }
}

/** Label jenis peserta untuk ringkasan. */
export const KIND_LABEL = { adult: 'Dewasa', child: 'Anak', infant: 'Bayi' } as const;

/** "2 dewasa, 1 anak" dari jumlah di booking. */
export function partyText(adults: number, children: number): string {
  return children > 0 ? `${adults} dewasa, ${children} anak` : `${adults} dewasa`;
}

/** Label status booking untuk lencana; selalu teks, tidak hanya warna. */
export const STATUS_BADGE = {
  pending_payment: { label: 'Menunggu pembayaran', tone: 'pending' },
  verifying: { label: 'Verifikasi', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'ok' },
  completed: { label: 'Selesai', tone: 'ok' },
  expired: { label: 'Kedaluwarsa', tone: 'full' },
  cancelled: { label: 'Dibatalkan', tone: 'outline' },
  refunded: { label: 'Refund', tone: 'outline' },
  needs_attention: { label: 'Ditinjau tim', tone: 'pending' },
  draft: { label: 'Draf', tone: 'outline' },
} as const;

/** Bagian dari getTripDetail yang dipakai ringkasan (foto sampul, wilayah, durasi). */
export interface TripSummary {
  coverPhoto: string | null;
  where: string | null;
  durationDays: number;
  nights: number;
}

/** Judul dan lencana satu tampilan halaman pesanan (diteruskan ke StatusShell). */
export interface ShellInfo {
  title: string;
  step: 3 | 4 | null;
  display?: boolean;
  hand: string;
  lead: string;
  em: string;
  lede: string;
  badge: { label: string; tone: 'ok' | 'pending' | 'full' | 'outline' };
}
