import { and, eq } from 'drizzle-orm';
import { todayInJakarta } from '../../lib/format';
import type { Executor } from '../../server/db/codes';
import { tripSchedules, trips } from '../../server/db/schema';
import { calcPrice, type PriceResult } from '../pricing/pricing';
import { seatsLeft } from '../schedules/seats';
import { BookingError } from './errors';

export interface BookableSchedule {
  schedule: typeof tripSchedules.$inferSelect;
  trip: typeof trips.$inferSelect;
}

/** Jadwal beserta trip-nya; hanya trip Open yang terbit yang dapat dipesan. */
export async function loadSchedule(
  db: Executor,
  scheduleId: string,
): Promise<BookableSchedule | null> {
  const [row] = await db
    .select({ schedule: tripSchedules, trip: trips })
    .from(tripSchedules)
    .innerJoin(trips, eq(trips.id, tripSchedules.tripId))
    .where(
      and(eq(tripSchedules.id, scheduleId), eq(trips.type, 'open'), eq(trips.status, 'published')),
    );
  return row ?? null;
}

/** Tanggal (YYYY-MM-DD) dikurangi n hari, dihitung di kalender UTC agar tidak terpengaruh zona waktu server. */
function minusDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export type Bookability = 'ok' | 'full' | 'not_open' | 'past' | 'cutoff';

/**
 * Apakah jadwal dapat dipesan sekarang. "Hari ini" menurut Asia/Jakarta. Pemesanan tutup otomatis H-n
 * (`booking_cutoff_days`): pada hari H-n pemesanan sudah ditutup. Status `full`/`closed`/`cancelled`
 * dihitung `not_open`; kuota sendiri diputuskan atomik oleh `holdSeats`, bukan di sini.
 */
export function bookability(
  schedule: Pick<
    typeof tripSchedules.$inferSelect,
    'status' | 'departureDate' | 'bookingCutoffDays'
  >,
  now: Date = new Date(),
): Bookability {
  // Penuh bukan "tidak tersedia": pelanggan masih bisa memilih jadwal lain, jadi dipetakan ke Kuota tidak mencukupi.
  if (schedule.status === 'full') return 'full';
  if (schedule.status !== 'open') return 'not_open';
  const today = todayInJakarta(now);
  if (schedule.departureDate < today) return 'past';
  if (
    schedule.bookingCutoffDays > 0 &&
    minusDays(schedule.departureDate, schedule.bookingCutoffDays) < today
  ) {
    return 'cutoff';
  }
  return 'ok';
}

/** Pastikan jadwal ada dan bisa dipesan; bila tidak, lempar galat yang dipetakan ke state di desain. */
export async function requireBookable(
  db: Executor,
  scheduleId: string,
  now: Date = new Date(),
): Promise<BookableSchedule> {
  const found = await loadSchedule(db, scheduleId);
  if (!found) throw new BookingError('schedule_not_found', 'Jadwal tidak ditemukan');
  const state = bookability(found.schedule, now);
  if (state === 'full') {
    throw new BookingError('quota_insufficient', 'Jadwal ini sudah penuh', { seatsLeft: 0 });
  }
  if (state !== 'ok') {
    throw new BookingError('schedule_unavailable', 'Jadwal tidak tersedia untuk dipesan', {
      reason: state,
    });
  }
  return found;
}

/** Harga dari server: harga jadwal menimpa harga paket; semua sudah termasuk PPN. */
export function priceFor(
  found: BookableSchedule,
  party: { adults: number; children: number },
  dpPercent: number,
): PriceResult {
  const unitPrice = found.schedule.priceOverride ?? found.trip.basePrice;
  if (unitPrice == null)
    throw new BookingError('schedule_unavailable', 'Harga trip belum ditentukan');
  return calcPrice({
    unitPrice,
    childPrice: found.trip.childPrice,
    adults: party.adults,
    children: party.children,
    dpPercent,
  });
}

export const seatsRemaining = (
  s: Pick<typeof tripSchedules.$inferSelect, 'capacity' | 'seatsTaken'>,
) => seatsLeft(s.capacity, s.seatsTaken);
