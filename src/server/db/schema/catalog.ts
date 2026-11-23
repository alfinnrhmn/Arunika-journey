import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { idr, pk, timestamps, tstz } from './_helpers';
import { media } from './media';

export const contentStatus = pgEnum('content_status', ['draft', 'published', 'archived']);
export const tripType = pgEnum('trip_type', ['open', 'private']);
export const inclusionKind = pgEnum('inclusion_kind', ['include', 'exclude']);
export const scheduleStatus = pgEnum('schedule_status', [
  'draft',
  'open',
  'full',
  'closed',
  'cancelled',
]);

export const destinations = pgTable('destinations', {
  id: pk(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  region: text('region'),
  summary: text('summary'),
  highlights: jsonb('highlights')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  heroMediaId: uuid('hero_media_id').references(() => media.id, { onDelete: 'set null' }),
  status: contentStatus('status').notNull().default('draft'),
  deletedAt: tstz('deleted_at'),
  ...timestamps(),
});

/** Kebijakan batal berupa tingkatan (H-hari, persentase refund). Berversi; hanya berlaku ke booking baru. */
export const cancellationPolicies = pgTable(
  'cancellation_policies',
  {
    id: pk(),
    name: text('name').notNull(),
    tiers: jsonb('tiers')
      .$type<{ fromDays: number; toDays: number | null; refundPercent: number }[]>()
      .notNull(),
    version: integer('version').notNull().default(1),
    ...timestamps(),
  },
  (t) => [check('cancellation_policies_version_positive', sql`${t.version} > 0`)],
);

export const trips = pgTable(
  'trips',
  {
    id: pk(),
    slug: text('slug').notNull().unique(),
    type: tripType('type').notNull(),
    title: text('title').notNull(),
    tagline: text('tagline'),
    destinationId: uuid('destination_id').references(() => destinations.id, {
      onDelete: 'restrict',
    }),
    durationDays: integer('duration_days').notNull(),
    nights: integer('nights').notNull(),
    /** Harga per orang (IDR, sudah termasuk PPN). Private Trip: kosong, harga lewat proposal. */
    basePrice: idr('base_price'),
    childPrice: idr('child_price'),
    meetingPoint: text('meeting_point'),
    summary: text('summary'),
    description: text('description'),
    defaultCapacity: integer('default_capacity'),
    cancellationPolicyId: uuid('cancellation_policy_id').references(() => cancellationPolicies.id, {
      onDelete: 'restrict',
    }),
    status: contentStatus('status').notNull().default('draft'),
    seo: jsonb('seo').$type<{ title?: string; description?: string; ogMediaId?: string }>(),
    deletedAt: tstz('deleted_at'),
    ...timestamps(),
  },
  (t) => [
    check('trips_duration_positive', sql`${t.durationDays} > 0 and ${t.nights} >= 0`),
    check('trips_price_nonnegative', sql`${t.basePrice} >= 0 and ${t.childPrice} >= 0`),
    // Open Trip wajib punya harga dasar; Private Trip tidak (harga lewat proposal).
    check('trips_open_requires_price', sql`${t.type} = 'private' or ${t.basePrice} is not null`),
    index('trips_status_type_idx').on(t.status, t.type),
    index('trips_destination_idx').on(t.destinationId),
  ],
);

export const tripItineraryDays = pgTable(
  'trip_itinerary_days',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    items: jsonb('items').$type<{ time?: string; text: string }[]>(),
  },
  (t) => [unique('trip_itinerary_days_pos_unique').on(t.tripId, t.position)],
);

export const tripInclusions = pgTable(
  'trip_inclusions',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    kind: inclusionKind('kind').notNull(),
    position: smallint('position').notNull(),
    text: text('text').notNull(),
  },
  (t) => [index('trip_inclusions_trip_idx').on(t.tripId)],
);

export const tripFaqs = pgTable(
  'trip_faqs',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    question: text('question').notNull(),
    answer: text('answer').notNull(),
  },
  (t) => [index('trip_faqs_trip_idx').on(t.tripId)],
);

export const tripMedia = pgTable(
  'trip_media',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    position: smallint('position').notNull(),
    isHero: boolean('is_hero').notNull().default(false),
  },
  (t) => [unique('trip_media_unique').on(t.tripId, t.mediaId)],
);

/**
 * Jadwal keberangkatan Open Trip. `seats_taken` dijaga atomik oleh UPDATE bersyarat
 * (lihat features/schedules/quota.ts) dan CHECK di bawah sebagai pagar terakhir.
 */
export const tripSchedules = pgTable(
  'trip_schedules',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'restrict' }),
    departureDate: date('departure_date', { mode: 'string' }).notNull(),
    returnDate: date('return_date', { mode: 'string' }).notNull(),
    capacity: integer('capacity').notNull(),
    /** Kuota minimum; di bawahnya operator dapat membatalkan jadwal. */
    minParticipants: integer('min_participants').notNull().default(1),
    /** Tutup otomatis H-n sebelum keberangkatan (angka dari klien). */
    bookingCutoffDays: integer('booking_cutoff_days').notNull().default(0),
    seatsTaken: integer('seats_taken').notNull().default(0),
    /** Menimpa harga dasar paket untuk jadwal ini (mis. musim liburan). */
    priceOverride: idr('price_override'),
    status: scheduleStatus('status').notNull().default('draft'),
    note: text('note'),
    ...timestamps(),
  },
  (t) => [
    unique('trip_schedules_trip_date_unique').on(t.tripId, t.departureDate),
    check('trip_schedules_seats_range', sql`${t.seatsTaken} between 0 and ${t.capacity}`),
    check('trip_schedules_capacity_positive', sql`${t.capacity} > 0`),
    check('trip_schedules_dates', sql`${t.returnDate} >= ${t.departureDate}`),
    check('trip_schedules_min_participants', sql`${t.minParticipants} between 1 and ${t.capacity}`),
    check('trip_schedules_cutoff_nonnegative', sql`${t.bookingCutoffDays} >= 0`),
    check('trip_schedules_price_nonnegative', sql`${t.priceOverride} >= 0`),
    index('trip_schedules_status_idx').on(t.status),
  ],
);

/** Daftar tunggu "Beri tahu saya" untuk trip yang belum punya jadwal terbuka. */
export const scheduleWaitlist = pgTable(
  'schedule_waitlist',
  {
    id: pk(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    consentAt: tstz('consent_at').notNull(),
    notifiedAt: tstz('notified_at'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('schedule_waitlist_trip_email_unique').on(t.tripId, sql`lower(${t.email})`)],
);
