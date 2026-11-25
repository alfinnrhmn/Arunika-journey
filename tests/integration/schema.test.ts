import { afterAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import {
  bookings,
  payments,
  proposals,
  quoteRequests,
  refunds,
  tripSchedules,
  trips,
  users,
} from '../../src/server/db/schema';
import { expectPgError, makeBooking, makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
});

// Tabel menurut PRD Bagian 8 (+ code_counters untuk penomoran). Menjaga skema dan PRD tetap sejalan.
const EXPECTED_TABLES = [
  'accounts',
  'audit_logs',
  'booking_drafts',
  'booking_participants',
  'bookings',
  'cancellation_policies',
  'checkout_events',
  'code_counters',
  'contact_messages',
  'destinations',
  'documentation_items',
  'email_templates',
  'legal_documents',
  'media',
  'newsletter_subscribers',
  'outbox',
  'page_versions',
  'pages',
  'payments',
  'post_tags',
  'posts',
  'proposals',
  'quote_drafts',
  'quote_requests',
  'refunds',
  'schedule_waitlist',
  'sessions',
  'settings',
  'tags',
  'testimonials',
  'topics',
  'trip_faqs',
  'trip_inclusions',
  'trip_itinerary_days',
  'trip_media',
  'trip_schedules',
  'trips',
  'two_factors',
  'users',
  'verifications',
];

describe('skema hasil migrasi', () => {
  it('memuat semua tabel PRD Bagian 8', async () => {
    const res = await getDb().execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(res.rows.map((r) => r.table_name)).toEqual(EXPECTED_TABLES);
  });
});

describe('constraint kuota dan jadwal', () => {
  it('seats_taken tidak boleh melebihi kapasitas, walau lewat SQL langsung', async () => {
    const schedule = await makeSchedule((await makeTrip()).id, { capacity: 4 });
    await expectPgError(
      getDb().update(tripSchedules).set({ seatsTaken: 5 }).where(eq(tripSchedules.id, schedule.id)),
      '23514',
      'trip_schedules_seats_range',
    );
    await expectPgError(
      getDb()
        .update(tripSchedules)
        .set({ seatsTaken: -1 })
        .where(eq(tripSchedules.id, schedule.id)),
      '23514',
      'trip_schedules_seats_range',
    );
  });

  it('satu trip tidak boleh punya dua jadwal di tanggal yang sama', async () => {
    const trip = await makeTrip();
    await makeSchedule(trip.id, { departureDate: '2027-03-06', returnDate: '2027-03-07' });
    await expectPgError(
      makeSchedule(trip.id, { departureDate: '2027-03-06', returnDate: '2027-03-07' }),
      '23505',
      'trip_schedules_trip_date_unique',
    );
  });

  it('tanggal pulang tidak boleh sebelum berangkat; kuota minimum tidak boleh melebihi kapasitas', async () => {
    const trip = await makeTrip();
    await expectPgError(
      makeSchedule(trip.id, { departureDate: '2027-04-10', returnDate: '2027-04-09' }),
      '23514',
      'trip_schedules_dates',
    );
    await expectPgError(
      makeSchedule(trip.id, {
        departureDate: '2027-04-11',
        returnDate: '2027-04-12',
        capacity: 4,
        minParticipants: 5,
      }),
      '23514',
      'trip_schedules_min_participants',
    );
  });

  it('trip dengan jadwal tidak bisa dihapus', async () => {
    const trip = await makeTrip();
    await makeSchedule(trip.id);
    await expectPgError(getDb().delete(trips).where(eq(trips.id, trip.id)), '23503');
  });
});

describe('constraint trip', () => {
  it('Open Trip wajib punya harga; Private Trip boleh tanpa harga (lewat proposal)', async () => {
    await expectPgError(makeTrip({ basePrice: null }), '23514', 'trips_open_requires_price');
    const privateTrip = await makeTrip({ type: 'private', basePrice: null });
    expect(privateTrip.basePrice).toBeNull();
  });
});

describe('constraint booking', () => {
  it('Open Trip wajib terikat jadwal; Private Trip tidak', async () => {
    await expectPgError(makeBooking(null), '23514', 'bookings_open_requires_schedule');
    const privateBooking = await makeBooking(null, { type: 'private' });
    expect(privateBooking.scheduleId).toBeNull();
  });

  it('jumlah kursi harus sama dengan dewasa + anak', async () => {
    const schedule = await makeSchedule((await makeTrip()).id);
    await expectPgError(
      makeBooking(schedule.id, { adults: 2, children: 1, seatCount: 2 }),
      '23514',
      'bookings_seat_count',
    );
  });

  it('DP tidak boleh melebihi total', async () => {
    const schedule = await makeSchedule((await makeTrip()).id);
    await expectPgError(
      makeBooking(schedule.id, { totalAmount: 1_000_000, dpAmount: 1_500_000 }),
      '23514',
      'bookings_amounts',
    );
  });

  it('kode booking unik', async () => {
    const schedule = await makeSchedule((await makeTrip()).id);
    const code = `ARJ-T-${uuidv7()}`;
    await makeBooking(schedule.id, { code });
    await expectPgError(makeBooking(schedule.id, { code }), '23505', 'bookings_code_unique');
  });

  it('nominal rupiah besar tersimpan utuh (bigint, bukan integer 32-bit)', async () => {
    const schedule = await makeSchedule((await makeTrip()).id);
    const booking = await makeBooking(schedule.id, {
      totalAmount: 5_000_000_000,
      dpAmount: 1_500_000_000,
    });
    expect(booking.totalAmount).toBe(5_000_000_000);
  });
});

describe('constraint pembayaran dan refund', () => {
  const makeBookingFor = async () => makeBooking((await makeSchedule((await makeTrip()).id)).id);

  it('hanya satu DP lunas per booking; DP lunas dan pelunasan lunas boleh berdampingan', async () => {
    const booking = await makeBookingFor();
    const base = { bookingId: booking.id, provider: 'manual', amount: 750_000 };
    await getDb()
      .insert(payments)
      .values({ ...base, kind: 'dp', status: 'paid' });
    await expectPgError(
      getDb()
        .insert(payments)
        .values({ ...base, kind: 'dp', status: 'paid' }),
      '23505',
      'payments_one_paid_dp_per_booking',
    );
    // DP gagal sebelumnya atau pelunasan tidak dihitung
    await getDb()
      .insert(payments)
      .values({ ...base, kind: 'dp', status: 'failed' });
    await getDb()
      .insert(payments)
      .values({ ...base, kind: 'balance', status: 'paid' });
  });

  it('referensi gateway unik (webhook ganda tidak membuat dua pembayaran)', async () => {
    const booking = await makeBookingFor();
    const base = { bookingId: booking.id, provider: 'midtrans', amount: 750_000 };
    const ref = `ref-${uuidv7()}`;
    await getDb()
      .insert(payments)
      .values({ ...base, providerRef: ref });
    await expectPgError(
      getDb()
        .insert(payments)
        .values({ ...base, providerRef: ref }),
      '23505',
      'payments_provider_ref_unique',
    );
  });

  it('nominal pembayaran dan refund harus positif', async () => {
    const booking = await makeBookingFor();
    await expectPgError(
      getDb().insert(payments).values({ bookingId: booking.id, provider: 'manual', amount: 0 }),
      '23514',
      'payments_amount_positive',
    );
  });

  it('refund yang disetujui wajib mencatat penyetuju', async () => {
    const booking = await makeBookingFor();
    const [payment] = await getDb()
      .insert(payments)
      .values({ bookingId: booking.id, provider: 'manual', amount: 750_000, status: 'paid' })
      .returning();
    await expectPgError(
      getDb().insert(refunds).values({
        paymentId: payment!.id,
        amount: 750_000,
        reason: 'Jadwal dibatalkan',
        status: 'approved',
      }),
      '23514',
      'refunds_approval_recorded',
    );
    const [owner] = await getDb()
      .insert(users)
      .values({ email: `owner-${uuidv7()}@example.com`, name: 'Reza', role: 'owner' })
      .returning();
    await getDb().insert(refunds).values({
      paymentId: payment!.id,
      amount: 750_000,
      reason: 'Jadwal dibatalkan',
      status: 'approved',
      approvedBy: owner!.id,
    });
  });
});

describe('constraint Private Trip', () => {
  it('proposal yang disetujui wajib mencatat waktu dan IP', async () => {
    const [request] = await getDb()
      .insert(quoteRequests)
      .values({
        code: `RQ-T-${uuidv7()}`,
        contactName: 'Bagas Pratama',
        contactEmail: 'bagas@example.com',
        contactPhone: '081200000001',
        participants: 4,
      })
      .returning();
    const base = {
      quoteRequestId: request!.id,
      priceTotal: 18_000_000,
      validUntil: new Date('2027-01-31T00:00:00Z'),
    };
    await expectPgError(
      getDb()
        .insert(proposals)
        .values({ ...base, status: 'approved' }),
      '23514',
      'proposals_approval_recorded',
    );
    await getDb()
      .insert(proposals)
      .values({
        ...base,
        version: 2,
        status: 'approved',
        approvedAt: new Date(),
        approvedIp: '203.0.113.7',
      });
  });
});

describe('constraint pengguna', () => {
  it('email harus huruf kecil dan unik', async () => {
    await expectPgError(
      getDb().insert(users).values({ email: 'Salsa@Example.com', name: 'Salsa' }),
      '23514',
      'users_email_lowercase',
    );
    const email = `salsa-${uuidv7()}@example.com`;
    await getDb().insert(users).values({ email, name: 'Salsa' });
    await expectPgError(getDb().insert(users).values({ email, name: 'Salsa 2' }), '23505');
  });

  it('peran hanya Owner atau Admin Operasional', async () => {
    await expectPgError(
      getDb().execute(
        sql`insert into users (id, email, name, role) values (${uuidv7()}, ${`x-${uuidv7()}@example.com`}, 'X', 'editor')`,
      ),
      '22P02',
    );
  });
});

describe('booking tetap terkait jadwal', () => {
  it('jadwal yang punya booking tidak bisa dihapus', async () => {
    const schedule = await makeSchedule((await makeTrip()).id);
    const booking = await makeBooking(schedule.id);
    await expectPgError(
      getDb().delete(tripSchedules).where(eq(tripSchedules.id, schedule.id)),
      '23503',
    );
    const [row] = await getDb().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.scheduleId).toBe(schedule.id);
  });
});
