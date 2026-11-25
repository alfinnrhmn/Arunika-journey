import { and, eq, lt, notExists, sql } from 'drizzle-orm';
import { writeAudit } from '../../server/audit';
import type { getDb } from '../../server/db';
import { bookings, payments } from '../../server/db/schema';
import { releaseSeats } from '../schedules/quota';

type Db = ReturnType<typeof getDb>;

/**
 * Melepas hold yang sudah berakhir (PRD 7.2): booking `pending_payment` yang batasnya lewat menjadi `expired`,
 * pembayaran `pending` menjadi `expired`, dan kursi dikembalikan ke jadwal. Dijalankan job berkala.
 *
 * Booking yang bukti bayarnya sudah masuk antrean verifikasi (`needs_verification`) TIDAK dikedaluwarsakan:
 * pelanggan sudah membayar dan keputusan ada di admin, bukan di jam. Idempotent dan aman dijalankan paralel:
 * baris dikunci (`SKIP LOCKED`) dan hanya diproses bila statusnya masih `pending_payment`, sehingga kursi
 * tidak pernah dilepas dua kali.
 */
export async function expireHolds(db: Db, now: Date = new Date(), batchSize = 100) {
  return db.transaction(async (tx) => {
    const due = await tx
      .select({
        id: bookings.id,
        scheduleId: bookings.scheduleId,
        seats: bookings.seatCount,
        code: bookings.code,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.status, 'pending_payment'),
          lt(bookings.holdExpiresAt, now),
          notExists(
            tx
              .select({ one: sql`1` })
              .from(payments)
              .where(
                and(eq(payments.bookingId, bookings.id), eq(payments.status, 'needs_verification')),
              ),
          ),
        ),
      )
      .limit(batchSize)
      .for('update', { skipLocked: true });

    for (const b of due) {
      await tx.update(bookings).set({ status: 'expired' }).where(eq(bookings.id, b.id));
      await tx
        .update(payments)
        .set({ status: 'expired' })
        .where(and(eq(payments.bookingId, b.id), eq(payments.status, 'pending')));
      if (b.scheduleId) await releaseSeats(tx, b.scheduleId, b.seats);
      await writeAudit(tx, {
        action: 'booking.expired',
        entity: 'booking',
        entityId: b.id,
        before: { status: 'pending_payment' },
        after: { status: 'expired', code: b.code, releasedSeats: b.seats },
      });
    }
    return { expired: due.length };
  });
}
