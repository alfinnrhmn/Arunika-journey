import { and, asc, eq, gte, inArray, isNull } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import {
  destinations,
  media,
  tripFaqs,
  tripInclusions,
  tripItineraryDays,
  tripMedia,
  tripSchedules,
  trips,
} from '../../server/db/schema';
import { todayInJakarta } from '../../lib/format';
import { seatStatus, seatsLeft, type SeatStatus } from '../schedules/seats';

/**
 * Kueri baca katalog Open Trip untuk halaman publik. Hanya trip `published` dan belum dihapus yang
 * terlihat; hanya jadwal `open`/`full` yang belum lewat yang ditampilkan. Foto dikembalikan sebagai
 * kunci penyimpanan (storage key); halaman memetakannya ke URL lewat `photo()`.
 */

export interface ScheduleView {
  id: string;
  departureDate: string;
  returnDate: string;
  /** Harga per orang untuk jadwal ini (harga jadwal menimpa harga paket), sudah termasuk PPN. */
  price: number;
  capacity: number;
  seatsLeft: number;
  status: SeatStatus;
  /** Dapat dipilih di booking (masih ada kursi dan jadwal terbuka). */
  bookable: boolean;
}

export interface TripCard {
  id: string;
  slug: string;
  title: string;
  /** Wilayah destinasi, mis. "Jawa Timur". */
  where: string | null;
  durationDays: number;
  nights: number;
  basePrice: number;
  badge: string | null;
  photo: string | null;
  /** Jadwal terdekat (terbuka atau penuh); kosong bila belum ada jadwal. */
  next: ScheduleView | null;
}

export interface ItineraryEntry {
  id: string;
  dayNumber: number;
  timeLabel: string | null;
  place: string | null;
  title: string;
  body: string | null;
  photo: string | null;
  lodging: { name: string; photo: string | null } | null;
}

export interface TripDetail {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  summary: string | null;
  description: string | null;
  where: string | null;
  durationDays: number;
  nights: number;
  basePrice: number;
  maxParticipants: number | null;
  difficulty: string | null;
  meetingPoint: string | null;
  coverPhoto: string | null;
  itinerary: ItineraryEntry[];
  includes: string[];
  excludes: string[];
  faqs: { question: string; answer: string }[];
  schedules: ScheduleView[];
}

const UPCOMING_STATUSES = ['open', 'full'] as const;

function toScheduleView(row: typeof tripSchedules.$inferSelect, basePrice: number): ScheduleView {
  const left = seatsLeft(row.capacity, row.seatsTaken);
  const status = row.status === 'full' ? 'full' : seatStatus(left);
  return {
    id: row.id,
    departureDate: row.departureDate,
    returnDate: row.returnDate,
    price: row.priceOverride ?? basePrice,
    capacity: row.capacity,
    seatsLeft: left,
    status,
    bookable: row.status === 'open' && left > 0,
  };
}

const publicTrips = and(
  eq(trips.type, 'open'),
  eq(trips.status, 'published'),
  isNull(trips.deletedAt),
);

/** Daftar Open Trip, diurutkan menurut jadwal terdekat (trip tanpa jadwal di akhir). */
export async function listOpenTrips(
  db: Executor,
  opts: { limit?: number; offset?: number; today?: string } = {},
): Promise<{ items: TripCard[]; total: number }> {
  const { limit = 12, offset = 0, today = todayInJakarta() } = opts;

  const rows = await db
    .select({ trip: trips, region: destinations.region })
    .from(trips)
    .leftJoin(destinations, eq(destinations.id, trips.destinationId))
    .where(publicTrips);

  if (rows.length === 0) return { items: [], total: 0 };
  const ids = rows.map((r) => r.trip.id);

  const [schedules, photos] = await Promise.all([
    db
      .select()
      .from(tripSchedules)
      .where(
        and(
          inArray(tripSchedules.tripId, ids),
          inArray(tripSchedules.status, [...UPCOMING_STATUSES]),
          gte(tripSchedules.departureDate, today),
        ),
      )
      .orderBy(asc(tripSchedules.departureDate)),
    db
      .select({
        tripId: tripMedia.tripId,
        key: media.storageKey,
        isHero: tripMedia.isHero,
        position: tripMedia.position,
      })
      .from(tripMedia)
      .innerJoin(media, eq(media.id, tripMedia.mediaId))
      .where(inArray(tripMedia.tripId, ids))
      .orderBy(asc(tripMedia.position)),
  ]);

  const nextByTrip = new Map<string, typeof tripSchedules.$inferSelect>();
  for (const s of schedules) if (!nextByTrip.has(s.tripId)) nextByTrip.set(s.tripId, s);

  const photoByTrip = new Map<string, string>();
  for (const p of photos) {
    // Foto kartu: yang bertanda hero; bila tidak ada, foto pertama.
    if (p.isHero) photoByTrip.set(p.tripId, p.key);
    else if (!photoByTrip.has(p.tripId)) photoByTrip.set(p.tripId, p.key);
  }

  const cards: TripCard[] = rows.map(({ trip, region }) => {
    const next = nextByTrip.get(trip.id);
    return {
      id: trip.id,
      slug: trip.slug,
      title: trip.title,
      where: region,
      durationDays: trip.durationDays,
      nights: trip.nights,
      basePrice: trip.basePrice ?? 0,
      badge: trip.badge,
      photo: photoByTrip.get(trip.id) ?? null,
      next: next ? toScheduleView(next, trip.basePrice ?? 0) : null,
    };
  });

  cards.sort((a, b) => {
    if (a.next && b.next) return a.next.departureDate.localeCompare(b.next.departureDate);
    if (a.next) return -1;
    if (b.next) return 1;
    return a.title.localeCompare(b.title);
  });

  return { items: cards.slice(offset, offset + limit), total: cards.length };
}

/** Detail satu Open Trip menurut slug; null bila tidak ada, belum terbit, atau sudah dihapus. */
export async function getTripDetail(
  db: Executor,
  slug: string,
  opts: { today?: string } = {},
): Promise<TripDetail | null> {
  const { today = todayInJakarta() } = opts;

  const [row] = await db
    .select({ trip: trips, region: destinations.region })
    .from(trips)
    .leftJoin(destinations, eq(destinations.id, trips.destinationId))
    .where(and(publicTrips, eq(trips.slug, slug)))
    .limit(1);
  if (!row) return null;
  const { trip, region } = row;

  const [days, inclusions, faqs, schedules, gallery] = await Promise.all([
    db
      .select()
      .from(tripItineraryDays)
      .where(eq(tripItineraryDays.tripId, trip.id))
      .orderBy(asc(tripItineraryDays.position)),
    db
      .select()
      .from(tripInclusions)
      .where(eq(tripInclusions.tripId, trip.id))
      .orderBy(asc(tripInclusions.position)),
    db.select().from(tripFaqs).where(eq(tripFaqs.tripId, trip.id)).orderBy(asc(tripFaqs.position)),
    db
      .select()
      .from(tripSchedules)
      .where(
        and(
          eq(tripSchedules.tripId, trip.id),
          inArray(tripSchedules.status, [...UPCOMING_STATUSES]),
          gte(tripSchedules.departureDate, today),
        ),
      )
      .orderBy(asc(tripSchedules.departureDate)),
    db
      .select({ key: media.storageKey })
      .from(tripMedia)
      .innerJoin(media, eq(media.id, tripMedia.mediaId))
      .where(eq(tripMedia.tripId, trip.id))
      .orderBy(asc(tripMedia.position))
      .limit(1),
  ]);

  // Kunci foto untuk baris itinerary dan penginapan dimuat sekaligus.
  const mediaIds = [...days.map((d) => d.mediaId), ...days.map((d) => d.lodging?.mediaId)].filter(
    (id): id is string => Boolean(id),
  );
  const mediaRows = mediaIds.length
    ? await db
        .select({ id: media.id, key: media.storageKey })
        .from(media)
        .where(inArray(media.id, mediaIds))
    : [];
  const keyById = new Map(mediaRows.map((m) => [m.id, m.key]));

  return {
    id: trip.id,
    slug: trip.slug,
    title: trip.title,
    tagline: trip.tagline,
    summary: trip.summary,
    description: trip.description,
    where: region,
    durationDays: trip.durationDays,
    nights: trip.nights,
    basePrice: trip.basePrice ?? 0,
    maxParticipants: trip.defaultCapacity,
    difficulty: trip.difficulty,
    meetingPoint: trip.meetingPoint,
    coverPhoto: gallery[0]?.key ?? null,
    itinerary: days.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      timeLabel: d.timeLabel,
      place: d.place,
      title: d.title,
      body: d.body,
      photo: d.mediaId ? (keyById.get(d.mediaId) ?? null) : null,
      lodging: d.lodging
        ? {
            name: d.lodging.name,
            photo: d.lodging.mediaId ? (keyById.get(d.lodging.mediaId) ?? null) : null,
          }
        : null,
    })),
    includes: inclusions.filter((i) => i.kind === 'include').map((i) => i.text),
    excludes: inclusions.filter((i) => i.kind === 'exclude').map((i) => i.text),
    faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    schedules: schedules.map((s) => toScheduleView(s, trip.basePrice ?? 0)),
  };
}
