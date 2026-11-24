import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { tripSchedules } from '../../src/server/db/schema';
import { holdSeats, releaseSeats } from '../../src/features/schedules/quota';
import { makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
});

const reload = async (id: string) =>
  (await getDb().select().from(tripSchedules).where(eq(tripSchedules.id, id)))[0]!;

describe('hold kuota atomik (PRD 7.2 dan 13)', () => {
  it('50 permintaan bersamaan ke jadwal sisa 4 kursi: tepat 4 terjual', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 4 });

    const results = await Promise.all(
      Array.from({ length: 50 }, () => getDb().transaction((tx) => holdSeats(tx, schedule.id, 1))),
    );

    expect(results.filter(Boolean)).toHaveLength(4);
    const after = await reload(schedule.id);
    expect(after.seatsTaken).toBe(4);
    expect(after.status).toBe('full');
  });

  it('dua pengguna berebut 3 kursi terakhir: satu berhasil, satu ditolak, kuota tidak negatif', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 5 });
    await holdSeats(getDb(), schedule.id, 2); // sisa 3

    const [a, b] = await Promise.all([
      getDb().transaction((tx) => holdSeats(tx, schedule.id, 3)),
      getDb().transaction((tx) => holdSeats(tx, schedule.id, 3)),
    ]);

    expect([a, b].filter(Boolean)).toHaveLength(1);
    const after = await reload(schedule.id);
    expect(after.seatsTaken).toBe(5);
    expect(after.seatsTaken).toBeLessThanOrEqual(after.capacity);
  });

  it('memilih 5 kursi saat sisa 4 ditolak dan tidak mengubah apa pun', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 4 });

    expect(await holdSeats(getDb(), schedule.id, 5)).toBeNull();
    const after = await reload(schedule.id);
    expect(after.seatsTaken).toBe(0);
    expect(after.status).toBe('open');
  });

  it('jadwal yang tidak terbuka tidak bisa di-hold', async () => {
    const trip = await makeTrip();
    for (const [i, status] of (['draft', 'closed', 'cancelled', 'full'] as const).entries()) {
      const schedule = await makeSchedule(trip.id, {
        status,
        departureDate: `2027-01-0${i + 1}`,
        returnDate: `2027-01-0${i + 2}`,
      });
      expect(await holdSeats(getDb(), schedule.id, 1), `status ${status}`).toBeNull();
    }
  });

  it('jadwal menjadi penuh saat sisa 0 dan terbuka lagi bila kursi dilepas', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 3 });

    expect((await holdSeats(getDb(), schedule.id, 2))?.status).toBe('open');
    expect((await holdSeats(getDb(), schedule.id, 1))?.status).toBe('full');

    const released = await releaseSeats(getDb(), schedule.id, 2);
    expect(released?.seatsTaken).toBe(1);
    expect(released?.status).toBe('open');
  });

  it('melepas lebih banyak daripada terisi ditolak', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 4 });
    await holdSeats(getDb(), schedule.id, 1);

    expect(await releaseSeats(getDb(), schedule.id, 2)).toBeNull();
    expect((await reload(schedule.id)).seatsTaken).toBe(1);
  });

  it('jadwal yang dibatalkan atau ditutup tidak dibuka kembali saat kursi dilepas', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 4 });
    await holdSeats(getDb(), schedule.id, 2);
    await getDb()
      .update(tripSchedules)
      .set({ status: 'cancelled' })
      .where(eq(tripSchedules.id, schedule.id));

    const released = await releaseSeats(getDb(), schedule.id, 2);
    expect(released?.status).toBe('cancelled');
  });

  it('hold dan lepas bersamaan tidak pernah melanggar batas 0..kapasitas', async () => {
    const trip = await makeTrip();
    const schedule = await makeSchedule(trip.id, { capacity: 6 });

    await Promise.all(
      Array.from({ length: 60 }, (_, i) =>
        getDb().transaction(async (tx) => {
          if (i % 3 === 0) await releaseSeats(tx, schedule.id, 1);
          else await holdSeats(tx, schedule.id, 1);
        }),
      ),
    );

    const after = await reload(schedule.id);
    expect(after.seatsTaken).toBeGreaterThanOrEqual(0);
    expect(after.seatsTaken).toBeLessThanOrEqual(after.capacity);
  });

  it('jumlah kursi tidak valid ditolak sebelum menyentuh database', async () => {
    await expect(holdSeats(getDb(), 'x', 0)).rejects.toThrow(RangeError);
    await expect(holdSeats(getDb(), 'x', 1.5)).rejects.toThrow(RangeError);
    await expect(releaseSeats(getDb(), 'x', -1)).rejects.toThrow(RangeError);
  });
});
