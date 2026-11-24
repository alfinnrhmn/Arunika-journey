import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import {
  bookingParticipants,
  bookings,
  destinations,
  payments,
  tripSchedules,
  trips,
} from '../../server/db/schema';
import { hashToken, newToken } from './draft';
import { normalizePhone } from './schemas';

/**
 * Tampilan booking untuk halaman publik (Pending Payment, Menunggu verifikasi, Konfirmasi, Cek Status).
 * Hanya memuat apa yang boleh dilihat pemegang akses; tidak ada hash token atau data internal.
 */
export interface BookingView {
  id: string;
  code: string;
  status: (typeof bookings.$inferSelect)['status'];
  balanceStatus: (typeof bookings.$inferSelect)['balanceStatus'];
  contactName: string;
  contactEmail: string;
  adults: number;
  children: number;
  seatCount: number;
  priceLines: (typeof bookings.$inferSelect)['priceLines'];
  totalAmount: number;
  dpPercent: number;
  dpAmount: number;
  holdExpiresAt: Date | null;
  trip: { title: string; slug: string; meetingPoint: string | null; destination: string | null };
  schedule: { id: string; departureDate: string; returnDate: string };
  participants: {
    fullName: string;
    kind: 'adult' | 'child' | 'infant';
    specialNeeds: string | null;
  }[];
  payment: {
    id: string;
    status: (typeof payments.$inferSelect)['status'];
    amount: number;
    hasProof: boolean;
  } | null;
}

async function viewOf(db: Executor, bookingId: string): Promise<BookingView | null> {
  const [row] = await db
    .select({
      b: bookings,
      tripTitle: trips.title,
      tripSlug: trips.slug,
      meetingPoint: trips.meetingPoint,
      destination: destinations.name,
      departureDate: tripSchedules.departureDate,
      returnDate: tripSchedules.returnDate,
    })
    .from(bookings)
    .innerJoin(tripSchedules, eq(tripSchedules.id, bookings.scheduleId))
    .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
    .leftJoin(destinations, eq(destinations.id, trips.destinationId))
    .where(eq(bookings.id, bookingId));
  if (!row) return null;

  const [people, [payment]] = await Promise.all([
    db
      .select({
        fullName: bookingParticipants.fullName,
        kind: bookingParticipants.kind,
        specialNeeds: bookingParticipants.specialNeeds,
      })
      .from(bookingParticipants)
      .where(eq(bookingParticipants.bookingId, bookingId))
      .orderBy(asc(bookingParticipants.position)),
    db
      .select()
      .from(payments)
      .where(and(eq(payments.bookingId, bookingId), eq(payments.kind, 'dp')))
      .orderBy(desc(payments.createdAt))
      .limit(1),
  ]);

  const b = row.b;
  return {
    id: b.id,
    code: b.code,
    status: b.status,
    balanceStatus: b.balanceStatus,
    contactName: b.contactName,
    contactEmail: b.contactEmail,
    adults: b.adults,
    children: b.children,
    seatCount: b.seatCount,
    priceLines: b.priceLines,
    totalAmount: b.totalAmount,
    dpPercent: b.dpPercent,
    dpAmount: b.dpAmount,
    holdExpiresAt: b.holdExpiresAt,
    trip: {
      title: row.tripTitle,
      slug: row.tripSlug,
      meetingPoint: row.meetingPoint,
      destination: row.destination,
    },
    schedule: { id: b.scheduleId!, departureDate: row.departureDate, returnDate: row.returnDate },
    participants: people,
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          amount: payment.amount,
          hasProof: !!payment.proofMediaId,
        }
      : null,
  };
}

/** Booking milik pemegang token akses (cookie setelah pembayaran dimulai). Kode salah atau token salah: null. */
export async function findBookingByAccess(db: Executor, code: string, token: string) {
  if (!token) return null;
  const [row] = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.code, code), eq(bookings.accessTokenHash, hashToken(token))));
  return row ? viewOf(db, row.id) : null;
}

/**
 * Cek Status (BK-14): kode booking DAN (email ATAU empat digit akhir WhatsApp). Tidak membedakan "kode tidak
 * ada" dari "verifikasi salah" (selalu null) agar kode tidak bisa ditebak. Pembatasan laju per IP dipasang di rute.
 */
export async function findBookingForLookup(
  db: Executor,
  input: { code: string; email?: string; phoneLast4?: string },
) {
  const code = input.code.trim().toUpperCase();
  const email = input.email?.trim().toLowerCase();
  const last4 = input.phoneLast4?.replace(/\D/g, '');
  if (!code || (!email && !(last4 && last4.length === 4))) return null;

  const [row] = await db
    .select({
      id: bookings.id,
      email: sql<string>`lower(${bookings.contactEmail})`,
      phone: bookings.contactPhone,
    })
    .from(bookings)
    .where(eq(bookings.code, code));
  if (!row) return null;
  const emailOk = !!email && row.email === email;
  const phoneOk = !!last4 && last4.length === 4 && normalizePhone(row.phone).endsWith(last4);
  if (!emailOk && !phoneOk) return null;
  return viewOf(db, row.id);
}

/**
 * Menerbitkan token akses baru untuk sebuah booking dan MENCABUT yang lama (hanya hash yang tersimpan, jadi
 * token mentah tidak bisa dipulihkan). Dipakai setelah Cek Status berhasil memverifikasi pelanggan (kode +
 * email/4 digit WhatsApp), supaya ia bisa membuka halaman pesanan dan mengunggah bukti dari perangkat baru.
 * Pemanggil memasang token ini di cookie akses (lihat http.ts). Perangkat lain yang masih memegang token
 * lama kehilangan akses dan harus memverifikasi lagi lewat Cek Status.
 */
export async function issueAccessToken(db: Executor, bookingId: string) {
  const token = newToken();
  await db
    .update(bookings)
    .set({ accessTokenHash: hashToken(token) })
    .where(eq(bookings.id, bookingId));
  return token;
}
