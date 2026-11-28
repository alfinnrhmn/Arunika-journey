import { formatDateShort, formatDuration } from '../../../lib/format';
import { formatWib } from '../../booking/status/lib';
import type {
  ProposalView,
  QuoteRequestRow,
  RequestLookupView,
} from '../../../content/private-proposal';

/**
 * Pembantu tampilan Proposal Review dan hasil permintaan di Cek Status. Hanya format dan pemetaan teks:
 * status, harga, DP, dan masa berlaku datang dari server (lihat src/content/private-proposal.ts).
 */

/** Keadaan halaman proposal. `closed` untuk permintaan yang ditolak atau sudah menjadi booking. */
export type ProposalKind = 'review' | 'revision' | 'approved' | 'expired' | 'closed';

export function proposalKind(view: ProposalView): ProposalKind {
  const { request, proposal } = view;
  if (proposal.status === 'approved' || request.status === 'approved') return 'approved';
  switch (request.status) {
    case 'expired':
      return 'expired';
    case 'revision_requested':
      return 'revision';
    case 'proposal_sent':
      return 'review';
    default:
      return 'closed';
  }
}

/** "Sen, 23 Nov 2026" (WIB). */
export const dateText = (date: Date): string => formatWib(date).date;
/** "Sen, 23 Nov 2026 pukul 14.20 WIB". */
export const dateTimeText = (date: Date): string => formatWib(date).full;

const SHORT = /^(\S+), (\d+) (\S+) (\d{4})$/;
const DAY_NAMES: Record<string, string> = {
  Min: 'Minggu',
  Sen: 'Senin',
  Sel: 'Selasa',
  Rab: 'Rabu',
  Kam: 'Kamis',
  Jum: 'Jumat',
  Sab: 'Sabtu',
};

/** ("2026-12-19", "2026-12-21") -> "19 sampai 21 Des 2026"; lintas bulan menyebut keduanya. */
export function rangeText(start: string | null, end: string | null): string {
  if (!start) return '[diisi klien]';
  const a = SHORT.exec(formatDateShort(start));
  const b = end ? SHORT.exec(formatDateShort(end)) : null;
  if (!a) return start;
  if (!b || (a[2] === b[2] && a[3] === b[3] && a[4] === b[4])) return `${a[2]} ${a[3]} ${a[4]}`;
  if (a[3] === b[3] && a[4] === b[4]) return `${a[2]} sampai ${b[2]} ${b[3]} ${b[4]}`;
  return `${a[2]} ${a[3]} sampai ${b[2]} ${b[3]} ${b[4]}`;
}

/** ("2026-12-19", "2026-12-21") -> "Sabtu sampai Senin". */
export function weekdayRange(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const a = SHORT.exec(formatDateShort(start));
  const b = SHORT.exec(formatDateShort(end));
  if (!a || !b) return null;
  return `${DAY_NAMES[a[1]!] ?? a[1]} sampai ${DAY_NAMES[b[1]!] ?? b[1]}`;
}

export function durationText(request: QuoteRequestRow): string {
  const days = request.durationDays;
  return days ? formatDuration(days, Math.max(0, days - 1)) : '[diisi klien]';
}

export const peopleText = (n: number): string => `${n} orang`;

/** Lencana hasil Cek Status menurut status permintaan; selalu teks, tidak hanya warna. */
export const REQUEST_BADGE: Record<
  QuoteRequestRow['status'],
  { label: string; tone: 'ok' | 'pending' | 'full' | 'outline' | 'default' }
> = {
  pending_review: { label: 'Menunggu ditinjau', tone: 'outline' },
  in_progress: { label: 'Sedang disusun', tone: 'outline' },
  proposal_sent: { label: 'Proposal siap ditinjau', tone: 'pending' },
  revision_requested: { label: 'Revisi diminta', tone: 'pending' },
  approved: { label: 'Disetujui', tone: 'ok' },
  expired: { label: 'Kedaluwarsa', tone: 'full' },
  declined: { label: 'Tidak dilanjutkan', tone: 'outline' },
  converted: { label: 'Sudah menjadi booking', tone: 'ok' },
};

export interface TrackItem {
  state: 'done' | 'current' | 'todo';
  when: string;
  title: string;
  desc: string;
}

/** Linimasa hasil Cek Status; langkah dan tanggalnya hanya dari data baris. */
export function lookupTrack(view: RequestLookupView): TrackItem[] {
  const { request, proposal } = view;
  const received: TrackItem = {
    state: 'done',
    when: `Selesai, ${dateText(request.createdAt)}`,
    title: 'Permintaan diterima',
    desc: `Nomor ${request.code} tercatat dan dibaca tim kami.`,
  };
  const sent = proposal?.sentAt
    ? `Proposal versi ${proposal.version} sudah dikirim.`
    : 'Proposal Anda sedang disusun.';
  switch (request.status) {
    case 'pending_review':
    case 'in_progress':
      return [
        received,
        {
          state: 'current',
          when: 'Sedang berjalan',
          title: 'Admin meninjau',
          desc: 'Kebutuhan Anda sedang dibaca dan disusun menjadi proposal.',
        },
        {
          state: 'todo',
          when: 'Berikutnya',
          title: 'Proposal dikirim',
          desc: 'Itinerary, fasilitas, dan harga final siap Anda tinjau. Belum ada pembayaran.',
        },
      ];
    case 'proposal_sent':
      return [
        received,
        {
          state: 'done',
          when: proposal?.sentAt ? dateText(proposal.sentAt) : 'Selesai',
          title: 'Proposal dikirim',
          desc: sent,
        },
        {
          state: 'current',
          when: 'Menunggu Anda',
          title: 'Persetujuan Anda',
          desc: 'Setujui proposal atau minta revisi sebelum masa berlaku habis.',
        },
        {
          state: 'todo',
          when: 'Setelah Anda menyetujui',
          title: 'Pembayaran DP',
          desc: 'Admin mengirim tautan pembayaran DP. Belum ada pembayaran sebelum Anda menyetujui.',
        },
      ];
    case 'revision_requested':
      return [
        received,
        {
          state: 'done',
          when: proposal?.sentAt ? dateText(proposal.sentAt) : 'Selesai',
          title: 'Proposal dikirim',
          desc: sent,
        },
        {
          state: 'current',
          when: 'Sedang berjalan',
          title: 'Revisi dikerjakan',
          desc: 'Permintaan revisi Anda sudah kami terima. Versi baru dikirim setelah selesai.',
        },
        {
          state: 'todo',
          when: 'Berikutnya',
          title: 'Persetujuan Anda',
          desc: 'Anda meninjau versi baru. Belum ada pembayaran sebelum Anda menyetujui.',
        },
      ];
    case 'approved':
      return [
        received,
        {
          state: 'done',
          when: proposal?.sentAt ? dateText(proposal.sentAt) : 'Selesai',
          title: 'Proposal dikirim',
          desc: sent,
        },
        {
          state: 'done',
          when: proposal?.approvedAt ? dateText(proposal.approvedAt) : 'Selesai',
          title: 'Proposal disetujui',
          desc: 'Persetujuan Anda sudah tercatat.',
        },
        {
          state: 'current',
          when: 'Menunggu tautan DP',
          title: 'Pembayaran DP',
          desc: 'Admin mengirim tautan pembayaran DP. Belum ada pembayaran yang dilakukan.',
        },
      ];
    case 'expired':
      return [
        received,
        {
          state: 'done',
          when: proposal?.sentAt ? dateText(proposal.sentAt) : 'Selesai',
          title: 'Proposal dikirim',
          desc: sent,
        },
        {
          state: 'current',
          when: proposal ? `Berlaku hingga ${dateText(proposal.validUntil)}` : 'Kedaluwarsa',
          title: 'Masa berlaku lewat',
          desc: 'Harga dan ketersediaan pada proposal ini tidak berlaku lagi. Kami bisa menyusun proposal baru.',
        },
      ];
    case 'declined':
    case 'converted':
      return [received];
  }
}
