import { eq } from 'drizzle-orm';
import { formatRupiah } from '../../lib/format';
import { writeAudit } from '../../server/audit';
import type { getDb } from '../../server/db';
import { bookings, payments, tripSchedules, trips } from '../../server/db/schema';
import { queueEmail } from '../../server/outbox';
import { holdSeats, releaseSeats } from '../schedules/quota';
import { BookingError } from './errors';

type Db = ReturnType<typeof getDb>;

/**
 * Keputusan admin atas bukti transfer (DB-04). Izin (Owner dan Admin Operasional) diperiksa oleh pemanggil
 * (rute/Action) sebelum fungsi ini; `actorId` wajib agar setiap keputusan tercatat di log audit.
 */

/**
 * Menyetujui pembayaran: `needs_verification` menjadi `paid`, booking menjadi `confirmed`, dan sisa tagihan
 * ditandai `balance_status = due` (kosong bila DP sudah melunasi seluruhnya). Booking hanya bisa Confirmed lewat
 * jalan ini (PRD 7.3: pembayaran berhasil dan terverifikasi).
 *
 * Kasus tepi (PRD 7.2): bila hold sempat berakhir dan kursi sudah dilepas, kursi diambil lagi. Bila sudah tidak
 * ada, booking menjadi `needs_attention` (admin memutuskan refund atau pindah jadwal); tidak ada oversell diam-diam.
 */
export async function approvePayment(
  db: Db,
  input: { paymentId: string; actorId: string },
  now: Date = new Date(),
) {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .for('update');
    if (!payment) throw new BookingError('payment_not_found', 'Pembayaran tidak ditemukan');
    if (payment.status !== 'needs_verification') {
      throw new BookingError('invalid_state', 'Pembayaran ini tidak sedang menunggu verifikasi', {
        status: payment.status,
      });
    }
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .for('update');
    if (!booking) throw new BookingError('booking_not_found', 'Booking tidak ditemukan');

    let next: 'confirmed' | 'needs_attention';
    if (booking.status === 'pending_payment') {
      next = 'confirmed';
    } else if (booking.status === 'expired' || booking.status === 'needs_attention') {
      // Kursi sudah dilepas: coba ambil lagi secara atomik.
      const held = booking.scheduleId
        ? await holdSeats(tx, booking.scheduleId, booking.seatCount)
        : null;
      next = held ? 'confirmed' : 'needs_attention';
    } else {
      throw new BookingError('invalid_state', 'Status booking tidak memungkinkan persetujuan', {
        status: booking.status,
      });
    }

    await tx
      .update(payments)
      .set({ status: 'paid', paidAt: now, verifiedBy: input.actorId, verifiedAt: now })
      .where(eq(payments.id, payment.id));
    const [updated] = await tx
      .update(bookings)
      .set({
        status: next,
        balanceStatus: next === 'confirmed' && booking.totalAmount > payment.amount ? 'due' : null,
      })
      .where(eq(bookings.id, booking.id))
      .returning();

    await writeAudit(tx, {
      actorId: input.actorId,
      action: 'payment.approved',
      entity: 'payment',
      entityId: payment.id,
      before: { status: 'needs_verification', bookingStatus: booking.status },
      after: { status: 'paid', bookingStatus: next, code: booking.code, amount: payment.amount },
    });

    if (next === 'confirmed') {
      const [info] = await tx
        .select({ title: trips.title, departure: tripSchedules.departureDate })
        .from(tripSchedules)
        .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
        .where(eq(tripSchedules.id, booking.scheduleId!));
      await queueEmail(tx, {
        template: 'booking_confirmed',
        to: booking.contactEmail,
        payload: {
          kode_booking: booking.code,
          nama: booking.contactName,
          paket: info?.title ?? '',
          tanggal: info?.departure ?? '',
          total: formatRupiah(booking.totalAmount),
          dp: formatRupiah(payment.amount),
        },
      });
    }
    return { booking: updated!, status: next };
  });
}

/**
 * Menolak bukti transfer dengan alasan (wajib). Sesuai PRD 7.2, penolakan melepas hold: booking menjadi
 * `expired` dan kursi kembali ke jadwal; pelanggan memulai ulang dari langkah 1 (BK-10). Booking yang bukan
 * `pending_payment` (mis. `needs_attention`) hanya ditandai pembayarannya ditolak dan tidak diubah statusnya.
 */
export async function rejectPayment(
  db: Db,
  input: { paymentId: string; actorId: string; reason: string },
  now: Date = new Date(),
) {
  const reason = input.reason.trim();
  if (reason.length < 3) throw new BookingError('invalid_state', 'Alasan penolakan wajib diisi');

  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(payments)
      .where(eq(payments.id, input.paymentId))
      .for('update');
    if (!payment) throw new BookingError('payment_not_found', 'Pembayaran tidak ditemukan');
    if (payment.status !== 'needs_verification') {
      throw new BookingError('invalid_state', 'Pembayaran ini tidak sedang menunggu verifikasi', {
        status: payment.status,
      });
    }
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .for('update');
    if (!booking) throw new BookingError('booking_not_found', 'Booking tidak ditemukan');

    await tx
      .update(payments)
      .set({ status: 'rejected', verifiedBy: input.actorId, verifiedAt: now })
      .where(eq(payments.id, payment.id));

    let bookingStatus = booking.status;
    if (booking.status === 'pending_payment') {
      await tx.update(bookings).set({ status: 'expired' }).where(eq(bookings.id, booking.id));
      if (booking.scheduleId) await releaseSeats(tx, booking.scheduleId, booking.seatCount);
      bookingStatus = 'expired';
    }

    await writeAudit(tx, {
      actorId: input.actorId,
      action: 'payment.rejected',
      entity: 'payment',
      entityId: payment.id,
      before: { status: 'needs_verification', bookingStatus: booking.status },
      after: { status: 'rejected', bookingStatus, code: booking.code, reason },
    });
    await queueEmail(tx, {
      template: 'payment_rejected',
      to: booking.contactEmail,
      payload: { kode_booking: booking.code, nama: booking.contactName, alasan: reason },
    });
    return { bookingStatus };
  });
}
