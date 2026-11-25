import { formatDateShort } from '../../lib/format';
import type { PaymentQueueItem } from '../../features/payments';
import type { Role } from '../../server/auth/permissions';

/**
 * Pembantu tampilan dashboard. Tidak berisi aturan bisnis atau izin: status dan nominal datang dari domain,
 * izin diputuskan server (`guard`/`can`). Di sini hanya format, label, dan pemetaan kunci kilas balik ke teks.
 */

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin_ops: 'Admin Operasional',
};

/** "Reza Pratama" -> "RP"; satu kata -> dua huruf pertama. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0]!.slice(0, 2) : words[0]![0]! + words[1]![0]!;
  return letters.toUpperCase();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** Cap waktu dalam WIB (UTC+7), dihitung dari UTC agar sama di server mana pun: "21 Nov, 20.04". */
export function stamp(date: Date, withYear = false): string {
  const s = new Date(date.getTime() + 7 * 3_600_000);
  const day = `${s.getUTCDate()} ${MONTHS[s.getUTCMonth()]}${withYear ? ` ${s.getUTCFullYear()}` : ''}`;
  return `${day}, ${p2(s.getUTCHours())}.${p2(s.getUTCMinutes())}`;
}

/** Selisih ke `now` dalam bahasa lazim: "14 jam lalu". Untuk waktu di masa depan: "dalam 2 jam". */
export function ago(date: Date, now: Date): string {
  const diff = now.getTime() - date.getTime();
  const min = Math.floor(Math.abs(diff) / 60_000);
  if (min < 1) return 'baru saja';
  let text: string;
  if (min < 60) text = `${min} menit`;
  else if (min < 1440) text = `${Math.floor(min / 60)} jam`;
  else text = `${Math.floor(min / 1440)} hari`;
  return diff >= 0 ? `${text} lalu` : `dalam ${text}`;
}

export const dateWithDay = (iso: string) => formatDateShort(iso);

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

export function paymentBadge(status: PaymentQueueItem['status']): { label: string; tone: Tone } {
  switch (status) {
    case 'needs_verification':
      return { label: 'Perlu verifikasi', tone: 'warn' };
    case 'paid':
      return { label: 'Terverifikasi', tone: 'ok' };
    case 'rejected':
      return { label: 'Ditolak', tone: 'bad' };
    case 'refunded':
      return { label: 'Refund', tone: 'info' };
    case 'partially_refunded':
      return { label: 'Refund sebagian', tone: 'info' };
    case 'pending':
      return { label: 'Menunggu bukti', tone: 'neutral' };
    case 'failed':
      return { label: 'Gagal', tone: 'bad' };
    default:
      return { label: 'Kedaluwarsa', tone: 'neutral' };
  }
}

export const KIND_LABEL = { dp: 'DP', balance: 'Pelunasan' } as const;

export const BOOKING_STATUS_LABEL: Record<PaymentQueueItem['bookingStatus'], string> = {
  draft: 'Draf',
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  needs_attention: 'Perlu perhatian',
};

export const PARTICIPANT_LABEL = { adult: 'Dewasa', child: 'Anak', infant: 'Bayi' } as const;

/**
 * Kilas balik halaman Pembayaran. Kunci tetap dari redirect endpoint aksi dipetakan ke teks di sini; nilai
 * query mentah tidak pernah dipantulkan ke HTML (kunci tak dikenal diabaikan).
 */
export interface Flash {
  tone: 'ok' | 'warn' | 'bad';
  text: string;
}
const RESULTS: Record<string, Flash> = {
  disetujui: {
    tone: 'ok',
    text: 'Pembayaran disetujui. Booking menjadi Confirmed dan email konfirmasi dikirim ke pemesan.',
  },
  'perlu-perhatian': {
    tone: 'warn',
    text: 'Pembayaran disetujui, tetapi kursi jadwal sudah habis. Booking masuk status Perlu perhatian: putuskan refund atau pindah jadwal.',
  },
  ditolak: {
    tone: 'ok',
    text: 'Bukti ditolak. Kursi dilepas kembali ke jadwal dan pemesan diberi tahu lewat email beserta alasannya.',
  },
};
const ERRORS: Record<string, Flash> = {
  'tidak-ditemukan': { tone: 'bad', text: 'Pembayaran tidak ditemukan.' },
  status: {
    tone: 'bad',
    text: 'Pembayaran ini sudah diputuskan atau statusnya berubah. Muat ulang antrean untuk melihat keadaan terbaru.',
  },
  alasan: {
    tone: 'bad',
    text: 'Alasan penolakan wajib diisi (3 sampai 500 karakter). Tidak ada yang diubah.',
  },
};
export function paymentFlash(result: string | null, error: string | null): Flash | null {
  if (error && Object.hasOwn(ERRORS, error)) return ERRORS[error]!;
  if (result && Object.hasOwn(RESULTS, result)) return RESULTS[result]!;
  return null;
}
