import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import {
  auditLogs,
  bookingParticipants,
  bookings,
  media,
  payments,
  tripSchedules,
  trips,
  users,
} from '../../server/db/schema';

/**
 * Daftar dan detail Reservasi untuk dashboard (DB-02, DB-28). Hanya baca. Izin `reservasi.kelola` diperiksa
 * pemanggil (halaman), bukan di sini. Tidak ada aksi yang mengubah data di modul ini: verifikasi pembayaran tetap
 * lewat antrean Pembayaran, dan pembatalan/pindah jadwal menunggu keputusan kebijakan refund klien.
 */
export type BookingStatus = (typeof bookings.$inferSelect)['status'];

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  draft: 'Draf',
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  completed: 'Selesai',
  expired: 'Kedaluwarsa',
  cancelled: 'Dibatalkan',
  refunded: 'Direfund',
  needs_attention: 'Perlu perhatian',
};

export const RESERVATION_TABS = [
  'semua',
  'pending_payment',
  'perlu_perhatian',
  'confirmed',
  'dibatalkan',
] as const;
export type ReservationTab = (typeof RESERVATION_TABS)[number];

export const RESERVATION_TAB_LABEL: Record<ReservationTab, string> = {
  semua: 'Semua',
  pending_payment: 'Pending Payment',
  perlu_perhatian: 'Perlu perhatian',
  confirmed: 'Confirmed',
  dibatalkan: 'Dibatalkan',
};

const TAB_STATUSES: Record<Exclude<ReservationTab, 'semua'>, BookingStatus[]> = {
  pending_payment: ['pending_payment'],
  perlu_perhatian: ['needs_attention'],
  confirmed: ['confirmed', 'completed'],
  // Kedaluwarsa dan refund ikut di sini: dari sisi operasional semuanya booking yang tidak jadi berangkat.
  dibatalkan: ['cancelled', 'expired', 'refunded'],
};

/** `draft` tidak pernah tampil: draf booking hidup di `booking_drafts`, bukan di daftar reservasi. */
const LISTED: BookingStatus[] = [
  'pending_payment',
  'needs_attention',
  'confirmed',
  'completed',
  'cancelled',
  'expired',
  'refunded',
];

export function parseReservationTab(value: string | null | undefined): ReservationTab {
  return (RESERVATION_TABS as readonly string[]).includes(value ?? '')
    ? (value as ReservationTab)
    : 'semua';
}

export interface ReservationFilters {
  tab?: ReservationTab;
  /** Cari kode, nama pemesan, atau nama trip. */
  q?: string;
  /** Bulan keberangkatan, `YYYY-MM`. */
  month?: string;
  tripId?: string;
  page?: number;
  pageSize?: number;
}

export interface ReservationRow {
  id: string;
  code: string;
  status: BookingStatus;
  contactName: string;
  tripTitle: string | null;
  departureDate: string | null;
  seatCount: number;
  totalAmount: number;
  createdAt: Date;
}

export interface ReservationList {
  items: ReservationRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Jumlah per tab dengan filter pencarian/bulan/trip yang sama (tab sendiri tidak dihitung sebagai filter). */
  counts: Record<ReservationTab, number>;
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

/** Kondisi di luar tab; masukan yang tidak valid diabaikan (bukan galat) agar URL buatan tangan tidak merusak halaman. */
function baseConditions(f: ReservationFilters): SQL[] {
  const out: SQL[] = [inArray(bookings.status, LISTED)];
  const q = f.q?.trim().slice(0, 80);
  if (q) {
    const like = `%${escapeLike(q)}%`;
    out.push(
      or(
        ilike(bookings.code, like),
        ilike(bookings.contactName, like),
        ilike(trips.title, like),
      ) as SQL,
    );
  }
  if (f.month && MONTH.test(f.month)) {
    const [y, m] = f.month.split('-').map(Number) as [number, number];
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    out.push(sql`${tripSchedules.departureDate} >= ${start}::date`);
    out.push(sql`${tripSchedules.departureDate} < ${next}::date`);
  }
  if (f.tripId && UUID.test(f.tripId)) out.push(eq(trips.id, f.tripId));
  return out;
}

export async function listReservations(
  db: Executor,
  filters: ReservationFilters = {},
): Promise<ReservationList> {
  const tab = filters.tab ?? 'semua';
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100);
  const base = baseConditions(filters);
  const tabWhere = tab === 'semua' ? [] : [inArray(bookings.status, TAB_STATUSES[tab])];
  const where = and(...base, ...tabWhere);

  const [totalRow] = await db
    .select({ n: count() })
    .from(bookings)
    .leftJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .leftJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(where);
  const total = totalRow?.n ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(Math.trunc(filters.page ?? 1) || 1, 1), lastPage);

  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      status: bookings.status,
      contactName: bookings.contactName,
      tripTitle: trips.title,
      departureDate: tripSchedules.departureDate,
      seatCount: bookings.seatCount,
      totalAmount: bookings.totalAmount,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .leftJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .leftJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(where)
    // Terbaru di atas; id sebagai pemutus seri agar halaman tidak tumpang tindih saat dibuat pada detik yang sama.
    .orderBy(desc(bookings.createdAt), desc(bookings.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const byStatus = await db
    .select({ status: bookings.status, n: count() })
    .from(bookings)
    .leftJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .leftJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(and(...base))
    .groupBy(bookings.status);
  const n = (statuses: BookingStatus[]) =>
    byStatus.filter((r) => statuses.includes(r.status)).reduce((a, r) => a + r.n, 0);
  const counts: Record<ReservationTab, number> = {
    semua: n(LISTED),
    pending_payment: n(TAB_STATUSES.pending_payment),
    perlu_perhatian: n(TAB_STATUSES.perlu_perhatian),
    confirmed: n(TAB_STATUSES.confirmed),
    dibatalkan: n(TAB_STATUSES.dibatalkan),
  };

  return { items: rows, total, page, pageSize, counts };
}

/** Trip untuk pilihan filter (hanya yang punya booking, supaya pilihan tidak berisi trip kosong). */
export async function listTripsWithBookings(db: Executor) {
  return db
    .selectDistinct({ id: trips.id, title: trips.title })
    .from(bookings)
    .innerJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(inArray(bookings.status, LISTED))
    .orderBy(asc(trips.title));
}

export interface ReservationEvent {
  at: Date;
  action: string;
  actorName: string | null;
}

export interface ReservationDetail {
  booking: Omit<typeof bookings.$inferSelect, 'accessTokenHash'>;
  trip: {
    id: string;
    title: string;
    type: 'open' | 'private';
    durationDays: number;
    nights: number;
    meetingPoint: string | null;
  } | null;
  schedule: {
    departureDate: string;
    returnDate: string;
    capacity: number;
    seatsTaken: number;
  } | null;
  participants: {
    fullName: string;
    kind: 'adult' | 'child' | 'infant';
    specialNeeds: string | null;
  }[];
  payments: {
    id: string;
    kind: 'dp' | 'balance';
    status: (typeof payments.$inferSelect)['status'];
    amount: number;
    method: string | null;
    createdAt: Date;
    paidAt: Date | null;
    verifiedAt: Date | null;
    verifiedByName: string | null;
    hasProof: boolean;
    proofSize: number | null;
  }[];
  /** Riwayat peristiwa dari log audit (booking dan pembayarannya), terlama di atas. */
  events: ReservationEvent[];
  /** Jumlah sudah dibayar (pembayaran berstatus paid) dan sisa tagihan terhadap total. */
  paidAmount: number;
  remainingAmount: number;
}

/** Detail satu reservasi. null bila id tidak valid atau tidak ada (tanpa melempar galat). */
export async function getReservation(db: Executor, id: string): Promise<ReservationDetail | null> {
  if (!UUID.test(id)) return null;
  const [row] = await db
    .select({
      b: bookings,
      trip: {
        id: trips.id,
        title: trips.title,
        type: trips.type,
        durationDays: trips.durationDays,
        nights: trips.nights,
        meetingPoint: trips.meetingPoint,
      },
      schedule: {
        departureDate: tripSchedules.departureDate,
        returnDate: tripSchedules.returnDate,
        capacity: tripSchedules.capacity,
        seatsTaken: tripSchedules.seatsTaken,
      },
    })
    .from(bookings)
    .leftJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .leftJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(eq(bookings.id, id));
  if (!row || row.b.status === 'draft') return null;

  const { accessTokenHash: _omit, ...booking } = row.b;
  void _omit;

  const [people, pays] = await Promise.all([
    db
      .select({
        fullName: bookingParticipants.fullName,
        kind: bookingParticipants.kind,
        specialNeeds: bookingParticipants.specialNeeds,
      })
      .from(bookingParticipants)
      .where(eq(bookingParticipants.bookingId, id))
      .orderBy(asc(bookingParticipants.position)),
    db
      .select({
        id: payments.id,
        kind: payments.kind,
        status: payments.status,
        amount: payments.amount,
        method: payments.method,
        createdAt: payments.createdAt,
        paidAt: payments.paidAt,
        verifiedAt: payments.verifiedAt,
        verifiedByName: users.name,
        proofMediaId: payments.proofMediaId,
        proofSize: media.size,
      })
      .from(payments)
      .leftJoin(users, eq(users.id, payments.verifiedBy))
      .leftJoin(media, eq(media.id, payments.proofMediaId))
      .where(eq(payments.bookingId, id))
      .orderBy(asc(payments.kind), asc(payments.createdAt), asc(payments.id)),
  ]);

  const paymentIds = pays.map((p) => p.id);
  const eventScope = paymentIds.length
    ? or(
        and(eq(auditLogs.entity, 'booking'), eq(auditLogs.entityId, id)),
        and(eq(auditLogs.entity, 'payment'), inArray(auditLogs.entityId, paymentIds)),
      )
    : and(eq(auditLogs.entity, 'booking'), eq(auditLogs.entityId, id));
  const events = await db
    .select({ at: auditLogs.createdAt, action: auditLogs.action, actorName: users.name })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(eventScope)
    .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));

  const paidAmount = pays.filter((p) => p.status === 'paid').reduce((a, p) => a + p.amount, 0);
  return {
    booking,
    trip: row.trip?.id ? row.trip : null,
    schedule: row.schedule?.departureDate ? row.schedule : null,
    participants: people,
    payments: pays.map((p) => ({
      id: p.id,
      kind: p.kind,
      status: p.status,
      amount: p.amount,
      method: p.method,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
      verifiedAt: p.verifiedAt,
      verifiedByName: p.verifiedByName,
      hasProof: !!p.proofMediaId,
      proofSize: p.proofSize,
    })),
    events,
    paidAmount,
    remainingAmount: Math.max(0, booking.totalAmount - paidAmount),
  };
}
