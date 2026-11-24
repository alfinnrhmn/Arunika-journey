import { and, eq, gte, sql } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import { tripSchedules } from '../../server/db/schema';

/**
 * Mengunci kursi secara atomik (PRD 7.2):
 *
 *   UPDATE trip_schedules SET seats_taken = seats_taken + :n
 *   WHERE id = :id AND status = 'open' AND seats_taken + :n <= capacity RETURNING *
 *
 * Satu pernyataan UPDATE bersyarat menggantikan "baca lalu tulis", sehingga permintaan bersamaan
 * tidak pernah menjual melebihi kapasitas. 0 baris = kuota tidak mencukupi atau jadwal tidak terbuka.
 * Jadwal otomatis menjadi `full` saat sisa 0. CHECK di tabel adalah pagar terakhir.
 */
export async function holdSeats(db: Executor, scheduleId: string, seats: number) {
  if (!Number.isInteger(seats) || seats < 1)
    throw new RangeError('Jumlah kursi harus bilangan bulat >= 1');
  const [row] = await db
    .update(tripSchedules)
    .set({
      seatsTaken: sql`${tripSchedules.seatsTaken} + ${seats}`,
      status: sql`case when ${tripSchedules.seatsTaken} + ${seats} = ${tripSchedules.capacity} then 'full'::schedule_status else ${tripSchedules.status} end`,
    })
    .where(
      and(
        eq(tripSchedules.id, scheduleId),
        eq(tripSchedules.status, 'open'),
        sql`${tripSchedules.seatsTaken} + ${seats} <= ${tripSchedules.capacity}`,
      ),
    )
    .returning();
  return row ?? null;
}

/**
 * Melepas kursi (hold kedaluwarsa, dibatalkan, pembayaran ditolak). Jadwal `full` kembali `open`.
 * Jadwal `closed`/`cancelled` tidak dibuka kembali. 0 baris = melepas lebih banyak daripada terisi.
 */
export async function releaseSeats(db: Executor, scheduleId: string, seats: number) {
  if (!Number.isInteger(seats) || seats < 1)
    throw new RangeError('Jumlah kursi harus bilangan bulat >= 1');
  const [row] = await db
    .update(tripSchedules)
    .set({
      seatsTaken: sql`${tripSchedules.seatsTaken} - ${seats}`,
      status: sql`case when ${tripSchedules.status} = 'full' then 'open'::schedule_status else ${tripSchedules.status} end`,
    })
    .where(and(eq(tripSchedules.id, scheduleId), gte(tripSchedules.seatsTaken, seats)))
    .returning();
  return row ?? null;
}
