import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import {
  bookingParticipants,
  bookings,
  media,
  payments,
  tripSchedules,
  trips,
  users,
} from '../../server/db/schema';

/**
 * Antrean verifikasi pembayaran untuk dashboard (DB-04). Hanya dibaca oleh staf yang berizin
 * `pembayaran.verifikasi`; pemeriksaan izin dilakukan pemanggil (halaman dan endpoint), bukan di sini.
 * Keputusan (setujui/tolak) memakai `approvePayment`/`rejectPayment` dari domain booking.
 */
export type QueueTab = 'verifikasi' | 'riwayat';

export interface PaymentQueueItem {
  id: string;
  status: (typeof payments.$inferSelect)['status'];
  kind: (typeof payments.$inferSelect)['kind'];
  amount: number;
  /** Kapan bukti masuk antrean (pembayaran dibuat/diperbarui). */
  submittedAt: Date;
  decidedAt: Date | null;
  bookingId: string;
  code: string;
  bookingStatus: (typeof bookings.$inferSelect)['status'];
  contactName: string;
  seatCount: number;
  totalAmount: number;
  tripTitle: string;
  departureDate: string;
  hasProof: boolean;
}

/** Status yang tampil di tiap tab. Antrean berisi yang menunggu keputusan; riwayat berisi yang sudah diputuskan. */
const TAB_STATUSES = {
  verifikasi: ['needs_verification'],
  riwayat: ['paid', 'rejected', 'refunded', 'partially_refunded'],
} as const;

export async function listPayments(
  db: Executor,
  tab: QueueTab,
  limit = 50,
): Promise<PaymentQueueItem[]> {
  const rows = await db
    .select({
      id: payments.id,
      status: payments.status,
      kind: payments.kind,
      amount: payments.amount,
      updatedAt: payments.updatedAt,
      verifiedAt: payments.verifiedAt,
      proofMediaId: payments.proofMediaId,
      bookingId: bookings.id,
      code: bookings.code,
      bookingStatus: bookings.status,
      contactName: bookings.contactName,
      seatCount: bookings.seatCount,
      totalAmount: bookings.totalAmount,
      tripTitle: trips.title,
      departureDate: tripSchedules.departureDate,
    })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .innerJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(inArray(payments.status, [...TAB_STATUSES[tab]]))
    // Antrean: yang paling lama menunggu di atas (FIFO). Riwayat: yang terbaru di atas.
    .orderBy(tab === 'verifikasi' ? asc(payments.updatedAt) : desc(payments.updatedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    kind: r.kind,
    amount: r.amount,
    submittedAt: r.updatedAt,
    decidedAt: r.verifiedAt,
    bookingId: r.bookingId,
    code: r.code,
    bookingStatus: r.bookingStatus,
    contactName: r.contactName,
    seatCount: r.seatCount,
    totalAmount: r.totalAmount,
    tripTitle: r.tripTitle,
    departureDate: r.departureDate,
    hasProof: !!r.proofMediaId,
  }));
}

/** Jumlah yang menunggu verifikasi (lencana menu dan KPI Ringkasan). */
export async function countAwaitingVerification(db: Executor): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(payments)
    .where(eq(payments.status, 'needs_verification'));
  return row?.n ?? 0;
}

export interface PaymentReview {
  payment: PaymentQueueItem & { method: string | null };
  booking: {
    contactEmail: string;
    contactPhone: string;
    adults: number;
    children: number;
    priceLines: (typeof bookings.$inferSelect)['priceLines'];
    dpPercent: number;
    dpAmount: number;
    holdExpiresAt: Date | null;
    createdAt: Date;
  };
  participants: {
    fullName: string;
    kind: 'adult' | 'child' | 'infant';
    specialNeeds: string | null;
  }[];
  proof: { mime: string; size: number } | null;
  decidedBy: string | null;
}

/** Detail satu pembayaran untuk ditinjau admin. null bila tidak ada. */
export async function getPaymentReview(
  db: Executor,
  paymentId: string,
): Promise<PaymentReview | null> {
  const [p] = await db
    .select({
      id: payments.id,
      status: payments.status,
      kind: payments.kind,
      method: payments.method,
      amount: payments.amount,
      updatedAt: payments.updatedAt,
      verifiedAt: payments.verifiedAt,
      verifiedBy: payments.verifiedBy,
      proofMediaId: payments.proofMediaId,
      b: bookings,
      tripTitle: trips.title,
      departureDate: tripSchedules.departureDate,
    })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .innerJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(eq(payments.id, paymentId));
  if (!p) return null;

  const [people, proof, decider] = await Promise.all([
    db
      .select({
        fullName: bookingParticipants.fullName,
        kind: bookingParticipants.kind,
        specialNeeds: bookingParticipants.specialNeeds,
      })
      .from(bookingParticipants)
      .where(eq(bookingParticipants.bookingId, p.b.id))
      .orderBy(asc(bookingParticipants.position)),
    p.proofMediaId
      ? db
          .select({ mime: media.mime, size: media.size })
          .from(media)
          .where(and(eq(media.id, p.proofMediaId)))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    p.verifiedBy
      ? db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, p.verifiedBy))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  return {
    payment: {
      id: p.id,
      status: p.status,
      kind: p.kind,
      method: p.method,
      amount: p.amount,
      submittedAt: p.updatedAt,
      decidedAt: p.verifiedAt,
      bookingId: p.b.id,
      code: p.b.code,
      bookingStatus: p.b.status,
      contactName: p.b.contactName,
      seatCount: p.b.seatCount,
      totalAmount: p.b.totalAmount,
      tripTitle: p.tripTitle,
      departureDate: p.departureDate,
      hasProof: !!p.proofMediaId,
    },
    booking: {
      contactEmail: p.b.contactEmail,
      contactPhone: p.b.contactPhone,
      adults: p.b.adults,
      children: p.b.children,
      priceLines: p.b.priceLines,
      dpPercent: p.b.dpPercent,
      dpAmount: p.b.dpAmount,
      holdExpiresAt: p.b.holdExpiresAt,
      createdAt: p.b.createdAt,
    },
    participants: people,
    proof,
    decidedBy: decider?.name ?? null,
  };
}

/** Kunci penyimpanan dan jenis berkas bukti sebuah pembayaran, untuk disajikan ke staf berizin. */
export async function getProofFile(db: Executor, paymentId: string) {
  const [row] = await db
    .select({ key: media.storageKey, mime: media.mime })
    .from(payments)
    .innerJoin(media, eq(media.id, payments.proofMediaId))
    .where(eq(payments.id, paymentId));
  return row ?? null;
}
