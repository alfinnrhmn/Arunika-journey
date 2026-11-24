/**
 * Pembantu sisi server untuk halaman alur booking (langkah 1 sampai 3). Hanya merangkai fungsi domain
 * (`src/features/booking`) dan kueri katalog; tidak ada aturan harga, kuota, atau status di sini.
 * Dipakai oleh `src/pages/booking/**` dan komponen di folder ini.
 */
import type { Executor } from '../../../server/db/codes';
import {
  bookability,
  contactSchema,
  fieldIssues,
  loadSchedule,
  participantSchema,
  priceFor,
  seatsRemaining,
  isBookingError,
  type Bookability,
  type BookableSchedule,
  type Draft,
} from '../../../features/booking';
import type { PriceResult } from '../../../features/pricing/pricing';
import { getTripDetail, type ScheduleView, type TripDetail } from '../../../features/trips/queries';

/** Jadwal di halaman booking: tampilan katalog ditambah keputusan domain "dapat dipesan sekarang". */
export interface FlowSchedule extends ScheduleView {
  /** Dapat dipilih: status terbuka, masih ada kursi, belum lewat batas pemesanan (menurut `bookability`). */
  open: boolean;
  why: Bookability;
}

export interface FlowTrip {
  detail: TripDetail;
  schedules: FlowSchedule[];
  /** Harga per anak; null = sama dengan dewasa (diputuskan `calcPrice`). */
  childPrice: number | null;
  found: Map<string, BookableSchedule>;
}

/**
 * Trip beserta jadwal yang bisa ditampilkan. Kolom `bookable` dari katalog tidak mengenal batas pemesanan
 * (H-n), jadi tiap jadwal dicek ulang lewat `bookability` agar pengunjung tidak memilih tanggal yang pasti
 * ditolak. Jumlah jadwal per trip kecil, jadi satu kueri per jadwal tidak masalah.
 */
export async function loadFlowTrip(db: Executor, slug: string): Promise<FlowTrip | null> {
  const detail = await getTripDetail(db, slug);
  if (!detail) return null;
  const rows = await Promise.all(detail.schedules.map((s) => loadSchedule(db, s.id)));
  const found = new Map<string, BookableSchedule>();
  const schedules = detail.schedules.map((s, i): FlowSchedule => {
    const row = rows[i];
    if (row) found.set(s.id, row);
    const why: Bookability = row ? bookability(row.schedule) : 'not_open';
    return { ...s, why, open: why === 'ok' && s.seatsLeft > 0 };
  });
  const childPrice = rows.find((r) => r)?.trip.childPrice ?? null;
  return { detail, schedules, childPrice, found };
}

/** Bilangan bulat nonnegatif dari isian form; null bila bukan angka utuh (tidak ada pembulatan diam-diam). */
export function parseCount(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value.trim())) return null;
  return Number(value.trim());
}

/** Teks form (FormData) sebagai string; berkas atau nilai kosong menjadi ''. */
export const formText = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

/** "2 dewasa" atau "2 dewasa, 1 anak". */
export const partyLabel = (adults: number, children: number): string =>
  children > 0 ? `${adults} dewasa, ${children} anak` : `${adults} dewasa`;

/** Harga dari server (`priceFor`); null bila harga trip belum ditentukan, supaya halaman tidak jadi 500. */
export function safePrice(
  found: BookableSchedule | undefined | null,
  party: { adults: number; children: number },
  dpPercent: number,
): PriceResult | null {
  if (!found || party.adults < 1) return null;
  try {
    return priceFor(found, party, dpPercent);
  } catch (e) {
    if (isBookingError(e)) return null;
    throw e;
  }
}

/** "2 jam", "90 menit", "1 jam 30 menit". */
export function holdLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} jam` : `${h} jam ${m} menit`;
}

/** Jenis peserta berurutan: semua dewasa dulu, lalu anak. Urutan ini sama dengan yang dibentuk `updateParty`. */
export const kindsFor = (adults: number, children: number): ('adult' | 'child')[] => [
  ...Array<'adult'>(adults).fill('adult'),
  ...Array<'child'>(children).fill('child'),
];

/**
 * Kekurangan isian draf (hanya baca, tidak menulis). Memakai skema domain yang sama dengan `saveDetails` dan
 * `startPayment`; dipakai untuk memutuskan apakah langkah 3 boleh dibuka dan untuk menampilkan galat bila
 * pengunjung dikembalikan ke langkah 2. Keputusan akhir tetap di `startPayment`.
 */
export function draftIssues(draft: Draft): Record<string, string> {
  const issues: Record<string, string> = {};
  const contact = contactSchema.safeParse(draft.contact ?? {});
  if (!contact.success) Object.assign(issues, fieldIssues(contact.error, 'contact'));
  const seats = draft.adults + draft.children;
  if (draft.participants.length !== seats) issues.participants = `Isi data untuk ${seats} peserta`;
  draft.participants.forEach((raw, i) => {
    const p = participantSchema.safeParse(raw);
    if (!p.success) Object.assign(issues, fieldIssues(p.error, `participants.${i}`));
  });
  if (!draft.acceptedAt) {
    issues.accepted =
      'Setujui syarat dan ketentuan, kebijakan privasi, dan kebijakan batal untuk melanjutkan';
  }
  return issues;
}

export type Problem =
  { state: 'quota'; left: number } | { state: 'unavailable'; reason: Bookability };

/**
 * Apakah jadwal masih bisa dipesan untuk `seats` kursi. Hanya untuk menampilkan state sebelum pengunjung
 * mengirim form; penguncian kursi yang sebenarnya tetap `startPayment`. Jadwal penuh dipetakan ke
 * "Tanggal tidak tersedia" (alasan `full`) karena tidak ada jumlah peserta yang bisa dikurangi.
 */
export function problemFor(
  found: BookableSchedule | null | undefined,
  seats: number,
): Problem | null {
  if (!found) return { state: 'unavailable', reason: 'not_open' };
  const why = bookability(found.schedule);
  if (why !== 'ok') return { state: 'unavailable', reason: why };
  const left = seatsRemaining(found.schedule);
  if (left <= 0) return { state: 'unavailable', reason: 'full' };
  if (seats > left) return { state: 'quota', left };
  return null;
}

/** Kalimat untuk alasan jadwal tidak tersedia (judul kotak peringatan). */
export function reasonTitle(reason: Bookability, dateLabel: string): string {
  switch (reason) {
    case 'full':
      return `Jadwal ${dateLabel} baru saja penuh.`;
    case 'past':
      return `Tanggal ${dateLabel} sudah lewat.`;
    case 'cutoff':
      return `Pemesanan untuk ${dateLabel} sudah ditutup.`;
    default:
      return `Jadwal ${dateLabel} sedang tidak dibuka untuk pemesanan.`;
  }
}

export function reasonBody(reason: Bookability, partyText: string): string {
  const kept = `Data dan jumlah peserta Anda (${partyText}) tetap tersimpan, tinggal pilih tanggal lain.`;
  switch (reason) {
    case 'full':
      return `Peserta lain menyelesaikan pembayaran lebih dulu. ${kept}`;
    case 'cutoff':
      return `Batas pemesanan untuk tanggal ini sudah terlewati. ${kept}`;
    case 'past':
      return `Tanggal keberangkatan sudah berlalu. ${kept}`;
    default:
      return `Jadwal ini ditutup atau dibatalkan oleh tim kami. ${kept}`;
  }
}

/** Label lencana jadwal yang tidak bisa dipilih. */
export const reasonBadge = (reason: Bookability): string =>
  reason === 'full' ? 'Penuh' : 'Ditutup';

/** Nama bidang untuk daftar galat di atas form langkah 2. */
export function issueLabel(key: string): string {
  if (key === 'contact.name') return 'Nama pemesan';
  if (key === 'contact.email') return 'Email';
  if (key === 'contact.phone') return 'No. WhatsApp';
  if (key === 'accepted') return 'Persetujuan';
  if (key === 'participants') return 'Data peserta';
  const m = /^participants\.(\d+)\.(\w+)$/.exec(key);
  if (m) {
    const n = Number(m[1]) + 1;
    return m[2] === 'fullName' ? `Nama peserta ${n}` : `Kebutuhan khusus peserta ${n}`;
  }
  return 'Isian';
}

/** Id elemen input untuk kunci galat, agar daftar galat dapat menaut ke bidangnya. */
export function fieldIdFor(key: string): string {
  if (key === 'contact.name') return 'f-nama';
  if (key === 'contact.email') return 'f-email';
  if (key === 'contact.phone') return 'f-wa';
  if (key === 'accepted') return 'f-setuju';
  const m = /^participants\.(\d+)\.(\w+)$/.exec(key);
  if (m) return m[2] === 'fullName' ? `f-p${m[1]}-nama` : `f-p${m[1]}-khusus`;
  if (key === 'participants') return 'f-peserta';
  return '';
}
