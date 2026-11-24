import { expect } from 'vitest';
import { getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { bookings, tripSchedules, trips } from '../../src/server/db/schema';

type Over<T> = Partial<T>;

export async function makeTrip(over: Over<typeof trips.$inferInsert> = {}) {
  const [row] = await getDb()
    .insert(trips)
    .values({
      slug: `trip-${uuidv7()}`,
      type: 'open',
      title: 'Bromo Sunrise Experience',
      durationDays: 2,
      nights: 1,
      basePrice: 1_250_000,
      ...over,
    })
    .returning();
  return row!;
}

export async function makeSchedule(
  tripId: string,
  over: Over<typeof tripSchedules.$inferInsert> = {},
) {
  const [row] = await getDb()
    .insert(tripSchedules)
    .values({
      tripId,
      departureDate: '2026-12-12',
      returnDate: '2026-12-13',
      capacity: 4,
      status: 'open',
      ...over,
    })
    .returning();
  return row!;
}

export async function makeBooking(
  scheduleId: string | null,
  over: Over<typeof bookings.$inferInsert> = {},
) {
  const [row] = await getDb()
    .insert(bookings)
    .values({
      code: `ARJ-T-${uuidv7()}`,
      scheduleId,
      type: 'open',
      contactName: 'Nadia Putri',
      contactEmail: 'nadia@example.com',
      contactPhone: '081200000000',
      adults: 2,
      seatCount: 2,
      totalAmount: 2_500_000,
      dpPercent: 30,
      dpAmount: 750_000,
      ...over,
    })
    .returning();
  return row!;
}

/** Pastikan sebuah operasi database ditolak oleh constraint tertentu (kode SQLSTATE + nama constraint). */
export async function expectPgError(op: Promise<unknown>, code: string, constraint?: string) {
  const err = await op.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err, 'operasi seharusnya ditolak database').not.toBeNull();
  const cause = ((err as { cause?: unknown })?.cause ?? err) as {
    code?: string;
    constraint?: string;
  };
  expect(cause.code).toBe(code);
  if (constraint) expect(cause.constraint).toBe(constraint);
}
