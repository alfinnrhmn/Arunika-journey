import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import {
  destinations,
  media,
  tripFaqs,
  tripInclusions,
  tripItineraryDays,
  tripMedia,
} from '../../src/server/db/schema';
import { getTripDetail, listOpenTrips } from '../../src/features/trips/queries';
import { makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
});

const TODAY = '2026-11-24';
const uid = () => uuidv7().slice(-12);

/** Trip terbit milik tes ini; slug berawalan unik agar tidak tercampur data tes lain. */
async function publishedTrip(prefix: string, over: Parameters<typeof makeTrip>[0] = {}) {
  return makeTrip({ slug: `${prefix}-${uid()}`, status: 'published', ...over });
}
const mine = (prefix: string, slugs: string[]) => slugs.filter((s) => s.startsWith(prefix));

describe('listOpenTrips', () => {
  it('hanya menampilkan Open Trip yang terbit dan belum dihapus', async () => {
    const p = `vis-${uid()}`;
    const ok = await publishedTrip(p);
    await makeSchedule(ok.id, { departureDate: '2026-12-12', returnDate: '2026-12-13' });
    await publishedTrip(p, { status: 'draft' });
    await publishedTrip(p, { status: 'archived' });
    await publishedTrip(p, { type: 'private', basePrice: null });
    await publishedTrip(p, { deletedAt: new Date() });

    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    expect(
      mine(
        p,
        items.map((i) => i.slug),
      ),
    ).toEqual([ok.slug]);
  });

  it('diurutkan menurut jadwal terdekat; trip tanpa jadwal di akhir', async () => {
    const p = `ord-${uid()}`;
    const later = await publishedTrip(p, { title: 'B Belakangan' });
    const sooner = await publishedTrip(p, { title: 'A Lebih dulu' });
    const none = await publishedTrip(p, { title: 'C Tanpa jadwal' });
    await makeSchedule(later.id, { departureDate: '2027-02-06', returnDate: '2027-02-07' });
    await makeSchedule(sooner.id, { departureDate: '2026-12-12', returnDate: '2026-12-13' });

    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    expect(
      mine(
        p,
        items.map((i) => i.slug),
      ),
    ).toEqual([sooner.slug, later.slug, none.slug]);
    expect(items.find((i) => i.slug === none.slug)?.next).toBeNull();
  });

  it('jadwal lampau, draf, ditutup, dan dibatalkan tidak dianggap jadwal terdekat', async () => {
    const p = `skip-${uid()}`;
    const trip = await publishedTrip(p);
    await makeSchedule(trip.id, { departureDate: '2026-11-01', returnDate: '2026-11-02' }); // lampau
    await makeSchedule(trip.id, {
      departureDate: '2026-12-01',
      returnDate: '2026-12-02',
      status: 'draft',
    });
    await makeSchedule(trip.id, {
      departureDate: '2026-12-02',
      returnDate: '2026-12-03',
      status: 'closed',
    });
    await makeSchedule(trip.id, {
      departureDate: '2026-12-03',
      returnDate: '2026-12-04',
      status: 'cancelled',
    });
    await makeSchedule(trip.id, { departureDate: '2027-01-09', returnDate: '2027-01-10' });

    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    expect(items.find((i) => i.slug === trip.slug)?.next?.departureDate).toBe('2027-01-09');
  });

  it('status kursi mengikuti desain: sisa banyak, sedikit, penuh', async () => {
    const p = `seat-${uid()}`;
    const cases = [
      { cap: 16, taken: 7, left: 9, status: 'ok' },
      { cap: 14, taken: 11, left: 3, status: 'few' },
      { cap: 10, taken: 10, left: 0, status: 'full', rowStatus: 'full' as const },
    ];
    const slugs: string[] = [];
    for (const [i, c] of cases.entries()) {
      const t = await publishedTrip(p);
      slugs.push(t.slug);
      await makeSchedule(t.id, {
        departureDate: `2026-12-${String(10 + i).padStart(2, '0')}`,
        returnDate: `2026-12-${String(11 + i).padStart(2, '0')}`,
        capacity: c.cap,
        seatsTaken: c.taken,
        status: c.rowStatus ?? 'open',
      });
    }
    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    const got = slugs.map((s) => items.find((i) => i.slug === s)!.next!);
    expect(got.map((g) => [g.seatsLeft, g.status])).toEqual(cases.map((c) => [c.left, c.status]));
    expect(got.map((g) => g.bookable)).toEqual([true, true, false]);
  });

  it('harga jadwal menimpa harga paket; basePrice tetap harga paket', async () => {
    const p = `price-${uid()}`;
    const t = await publishedTrip(p, { basePrice: 1_250_000 });
    await makeSchedule(t.id, {
      departureDate: '2027-01-09',
      returnDate: '2027-01-10',
      priceOverride: 1_350_000,
    });
    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    const card = items.find((i) => i.slug === t.slug)!;
    expect(card.basePrice).toBe(1_250_000);
    expect(card.next?.price).toBe(1_350_000);
  });

  it('wilayah dan foto kartu (hero) terbawa', async () => {
    const p = `meta-${uid()}`;
    const [dest] = await getDb()
      .insert(destinations)
      .values({ slug: `d-${uid()}`, name: 'Bromo', region: 'Jawa Timur', status: 'published' })
      .returning();
    const [m1, m2] = await getDb()
      .insert(media)
      .values([
        { storageKey: `k-${uid()}.jpg`, mime: 'image/jpeg', size: 1 },
        { storageKey: `k-${uid()}.jpg`, mime: 'image/jpeg', size: 1 },
      ])
      .returning();
    const t = await publishedTrip(p, { destinationId: dest!.id, badge: 'Terlaris' });
    await getDb()
      .insert(tripMedia)
      .values([
        { tripId: t.id, mediaId: m1!.id, position: 0, isHero: false },
        { tripId: t.id, mediaId: m2!.id, position: 1, isHero: true },
      ]);
    const { items } = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    const card = items.find((i) => i.slug === t.slug)!;
    expect(card.where).toBe('Jawa Timur');
    expect(card.badge).toBe('Terlaris');
    expect(card.photo).toBe(m2!.storageKey);
  });

  it('paginasi: potongan dan total konsisten', async () => {
    const p = `pg-${uid()}`;
    for (let i = 0; i < 3; i++) {
      const t = await publishedTrip(p);
      await makeSchedule(t.id, {
        departureDate: `2027-03-0${i + 1}`,
        returnDate: `2027-03-0${i + 2}`,
      });
    }
    const all = await listOpenTrips(getDb(), { limit: 1000, today: TODAY });
    const page = await listOpenTrips(getDb(), { limit: 2, offset: 1, today: TODAY });
    expect(page.total).toBe(all.total);
    expect(page.items.map((i) => i.slug)).toEqual(all.items.slice(1, 3).map((i) => i.slug));
  });
});

describe('getTripDetail', () => {
  it('null untuk slug tidak ada, draf, privat, atau dihapus', async () => {
    const p = `nd-${uid()}`;
    const draft = await publishedTrip(p, { status: 'draft' });
    const priv = await publishedTrip(p, { type: 'private', basePrice: null });
    const del = await publishedTrip(p, { deletedAt: new Date() });
    for (const slug of ['tidak-ada-' + uid(), draft.slug, priv.slug, del.slug]) {
      expect(await getTripDetail(getDb(), slug, { today: TODAY })).toBeNull();
    }
  });

  it('memuat itinerary berurutan, fasilitas, FAQ, dan jadwal mendatang', async () => {
    const p = `det-${uid()}`;
    const [cover, stop1, stop2, lodge] = await getDb()
      .insert(media)
      .values(
        ['c', 's1', 's2', 'l'].map((k) => ({
          storageKey: `${k}-${uid()}.jpg`,
          mime: 'image/jpeg',
          size: 1,
        })),
      )
      .returning();
    const t = await publishedTrip(p, {
      difficulty: 'ringan sampai sedang',
      defaultCapacity: 16,
      meetingPoint: 'Stasiun',
    });
    await getDb()
      .insert(tripMedia)
      .values({ tripId: t.id, mediaId: cover!.id, position: 0, isHero: false });
    // sengaja dimasukkan tidak berurutan
    await getDb()
      .insert(tripItineraryDays)
      .values([
        {
          tripId: t.id,
          position: 2,
          dayNumber: 2,
          timeLabel: '03.30',
          place: 'Penanjakan',
          title: 'Matahari terbit',
          mediaId: stop2!.id,
        },
        {
          tripId: t.id,
          position: 1,
          dayNumber: 1,
          timeLabel: '21.30 WIB',
          place: 'Stasiun',
          title: 'Dijemput',
          mediaId: stop1!.id,
          lodging: { name: 'Cemara Hill Lodge', mediaId: lodge!.id },
        },
      ]);
    await getDb()
      .insert(tripInclusions)
      .values([
        { tripId: t.id, kind: 'include', position: 1, text: 'Jip' },
        { tripId: t.id, kind: 'exclude', position: 1, text: 'Sewa kuda' },
        { tripId: t.id, kind: 'include', position: 2, text: 'Tiket' },
      ]);
    await getDb()
      .insert(tripFaqs)
      .values({ tripId: t.id, position: 1, question: 'Apa?', answer: 'Itu.' });
    await makeSchedule(t.id, { departureDate: '2026-11-01', returnDate: '2026-11-02' }); // lampau
    await makeSchedule(t.id, { departureDate: '2027-01-09', returnDate: '2027-01-10' });
    await makeSchedule(t.id, { departureDate: '2026-12-12', returnDate: '2026-12-13' });

    const d = (await getTripDetail(getDb(), t.slug, { today: TODAY }))!;
    expect(d.itinerary.map((e) => e.title)).toEqual(['Dijemput', 'Matahari terbit']);
    expect(d.itinerary[0]!.lodging).toEqual({
      name: 'Cemara Hill Lodge',
      photo: lodge!.storageKey,
    });
    expect(d.itinerary[0]!.photo).toBe(stop1!.storageKey);
    expect(d.itinerary[1]!.lodging).toBeNull();
    expect(d.includes).toEqual(['Jip', 'Tiket']);
    expect(d.excludes).toEqual(['Sewa kuda']);
    expect(d.faqs).toEqual([{ question: 'Apa?', answer: 'Itu.' }]);
    expect(d.schedules.map((s) => s.departureDate)).toEqual(['2026-12-12', '2027-01-09']);
    expect(d.maxParticipants).toBe(16);
    expect(d.difficulty).toBe('ringan sampai sedang');
    expect(d.coverPhoto).toBe(cover!.storageKey);
  });
});
