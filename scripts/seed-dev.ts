/**
 * Data contoh UNTUK PENGEMBANGAN, mengikuti isi desain (Design V2). Foto memakai kunci berkas stok di
 * Doop (lihat src/lib/photo.ts) dan harus diganti aset klien. Jalankan: npm run db:seed
 *
 * Aman diulang: trip yang slug-nya sudah ada dilewati. Menolak berjalan di produksi atau pada
 * database yang bukan lokal. Harga sudah termasuk PPN.
 */
import { eq, inArray } from 'drizzle-orm';
import { closeDb, getDb } from '../src/server/db';
import {
  destinations,
  media,
  settings,
  tripFaqs,
  tripInclusions,
  tripItineraryDays,
  tripMedia,
  tripSchedules,
  trips,
} from '../src/server/db/schema';

const url = process.env.DATABASE_URL ?? '';
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
})();
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', 'postgres'].includes(host)
) {
  console.error(
    `Seed ditolak: hanya untuk database lokal (host sekarang: "${host || 'tidak diatur'}").`,
  );
  process.exit(1);
}

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

interface Seed {
  slug: string;
  title: string;
  dest: string;
  days: number;
  nights: number;
  price: number;
  photo: string;
  badge?: string;
  capacity: number;
  taken: number;
  departure: string;
  full?: boolean;
}

const DESTINATIONS: Record<string, { name: string; region: string }> = {
  bromo: { name: 'Bromo', region: 'Jawa Timur' },
  dieng: { name: 'Dieng', region: 'Jawa Tengah' },
  yogyakarta: { name: 'Yogyakarta', region: 'Yogyakarta' },
  karimunjawa: { name: 'Karimunjawa', region: 'Jawa Tengah' },
  ijen: { name: 'Ijen', region: 'Jawa Timur' },
  borobudur: { name: 'Borobudur', region: 'Jawa Tengah' },
  malang: { name: 'Malang', region: 'Jawa Timur' },
  banyuwangi: { name: 'Banyuwangi', region: 'Jawa Timur' },
  wonosobo: { name: 'Wonosobo', region: 'Jawa Tengah' },
  ubud: { name: 'Ubud', region: 'Bali' },
};

// Urutan, harga, jadwal, dan sisa kursi sama dengan kartu di desain Trip Listing.
const TRIPS: Seed[] = [
  {
    slug: 'bromo-sunrise-experience',
    title: 'Bromo Sunrise Experience',
    dest: 'bromo',
    days: 2,
    nights: 1,
    price: 1_250_000,
    photo: 'tWUmhvsHku.jpg',
    badge: 'Terlaris',
    capacity: 16,
    taken: 7,
    departure: '2026-12-12',
  },
  {
    slug: 'dieng-golden-sunrise',
    title: 'Dieng Golden Sunrise',
    dest: 'dieng',
    days: 2,
    nights: 1,
    price: 1_650_000,
    photo: '2q_R6nYxey.jpg',
    badge: 'Terlaris',
    capacity: 12,
    taken: 6,
    departure: '2026-12-18',
  },
  {
    slug: 'yogyakarta-heritage-weekend',
    title: 'Yogyakarta Heritage Weekend',
    dest: 'yogyakarta',
    days: 3,
    nights: 2,
    price: 1_450_000,
    photo: '0c6vhge8VF.jpg',
    capacity: 14,
    taken: 11,
    departure: '2027-01-09',
  },
  {
    slug: 'karimunjawa-island-escape',
    title: 'Karimunjawa Island Escape',
    dest: 'karimunjawa',
    days: 3,
    nights: 2,
    price: 2_350_000,
    photo: 'O3pRkMFOdB.jpg',
    capacity: 12,
    taken: 4,
    departure: '2027-01-23',
  },
  {
    slug: 'ijen-blue-fire-sunrise',
    title: 'Ijen Blue Fire Sunrise',
    dest: 'ijen',
    days: 2,
    nights: 1,
    price: 1_550_000,
    photo: 'vTtBTXPM1x.jpg',
    capacity: 12,
    taken: 2,
    departure: '2027-02-06',
  },
  {
    slug: 'borobudur-sunrise-day-trip',
    title: 'Borobudur Sunrise Day Trip',
    dest: 'borobudur',
    days: 1,
    nights: 0,
    price: 650_000,
    photo: '62u7LKHlYm.jpg',
    capacity: 10,
    taken: 10,
    departure: '2027-02-14',
    full: true,
  },
  {
    slug: 'malang-highland-escape',
    title: 'Malang Highland Escape',
    dest: 'malang',
    days: 3,
    nights: 2,
    price: 1_950_000,
    photo: 'RFVCPvl63W.jpg',
    capacity: 12,
    taken: 5,
    departure: '2027-02-19',
  },
  {
    slug: 'banyuwangi-savana-dan-pantai',
    title: 'Banyuwangi Savana dan Pantai',
    dest: 'banyuwangi',
    days: 3,
    nights: 2,
    price: 1_850_000,
    photo: 'zoV0_r58Qo.jpg',
    capacity: 12,
    taken: 7,
    departure: '2027-02-27',
  },
  {
    slug: 'wonosobo-family-trip',
    title: 'Wonosobo Family Trip',
    dest: 'wonosobo',
    days: 2,
    nights: 1,
    price: 1_750_000,
    photo: 'RfEIV_31BQ.jpg',
    capacity: 10,
    taken: 6,
    departure: '2027-03-06',
  },
  {
    slug: 'honeymoon-di-karimunjawa',
    title: 'Honeymoon di Karimunjawa',
    dest: 'karimunjawa',
    days: 4,
    nights: 3,
    price: 3_450_000,
    photo: 'nZjLiVZAGp.jpg',
    capacity: 6,
    taken: 4,
    departure: '2027-03-13',
  },
  {
    slug: 'yogyakarta-untuk-remaja',
    title: 'Yogyakarta untuk Remaja',
    dest: 'yogyakarta',
    days: 3,
    nights: 2,
    price: 1_350_000,
    photo: '-V7DfFNIJG.jpg',
    capacity: 16,
    taken: 4,
    departure: '2027-03-19',
  },
  {
    slug: 'ubud-retreat',
    title: 'Ubud Retreat',
    dest: 'ubud',
    days: 4,
    nights: 3,
    price: 4_250_000,
    photo: 'iE7SfRLJW3.jpg',
    capacity: 12,
    taken: 6,
    departure: '2027-04-03',
  },
];

const BROMO = {
  cover: '5Ly9mCIJwQ.jpg',
  tagline: 'Matahari terbit di atas lautan kabut dan lautan pasir Bromo.',
  description:
    'Pengantar dua hari yang terjangkau ke kawasan Bromo: menginap di lodge hangat, berburu matahari terbit dari Penanjakan, melintasi lautan pasir dengan jip 4×4, dan berjalan ke tepi kawah bersama pemandu lokal yang menemani Anda sepanjang perjalanan.',
  meetingPoint:
    'Stasiun Malang Kota, penjemputan pukul 21.30 WIB. Titik kumpul alternatif dan nomor kontak pemandu: [diisi klien].',
  itinerary: [
    {
      day: 1,
      time: '21.30 WIB',
      place: 'Stasiun Malang Kota',
      title: 'Dijemput menuju lereng Bromo',
      photo: 'MPNJ-TRi_h.jpg',
      body: 'Pemandu menjemput Anda di Stasiun Malang Kota pukul 21.30 WIB. Perjalanan malam sekitar tiga jam membawa Anda ke lodge di Cemoro Lawang, lalu beristirahat sebelum dini hari.',
      lodging: { name: 'Cemara Hill Lodge', photo: '9o7fTkW4C1.jpg' },
    },
    {
      day: 2,
      time: '03.30',
      place: 'Penanjakan',
      title: 'Matahari terbit di Penanjakan',
      photo: 'kuhQchKfqw.jpg',
      body: 'Jip membawa Anda ke titik pandang Penanjakan untuk menyaksikan matahari terbit di atas lautan kabut dan puncak Bromo.',
    },
    {
      day: 2,
      time: '06.30',
      place: 'Lautan Pasir',
      title: 'Jip melintasi lautan pasir',
      photo: 'gFF5lKwxR6.jpg',
      body: 'Perjalanan melintasi lautan pasir menuju kaki kawah dengan jip 4×4 bersama pemandu lokal.',
    },
    {
      day: 2,
      time: '08.00',
      place: 'Kawah Bromo',
      title: 'Berjalan ke tepi kawah',
      photo: 'eL1qgOeMu8.jpg',
      body: 'Berjalan menaiki anak tangga ke tepi kawah. Kuda tersedia bagi yang ingin menempuh sebagian jalur (opsional, di luar paket).',
    },
    {
      day: 2,
      time: '10.30',
      place: 'Cemoro Lawang',
      title: 'Sarapan dan kembali ke Malang',
      photo: 'pJTUIUqgFW.jpg',
      body: 'Sarapan di Cemoro Lawang, lalu perjalanan kembali ke Malang dan berpisah di titik awal.',
    },
  ],
  includes: [
    'Jip 4×4 Bromo (berbagi)',
    'Penginapan 1 malam',
    'Tiket masuk kawasan Bromo',
    'Pemandu lokal, makan, asuransi',
  ],
  excludes: [
    'Transportasi ke dan dari Malang',
    'Makan di luar paket',
    'Pengeluaran pribadi dan tip',
    'Sewa kuda (opsional)',
  ],
  faqs: [
    {
      question: 'Apakah perlu kondisi fisik khusus?',
      answer:
        'Tingkatnya ringan sampai sedang. Anda berjalan singkat di tepi kawah dan di Penanjakan pada dini hari yang dingin; bawa jaket hangat.',
    },
    {
      question: 'Bagaimana jika cuaca buruk?',
      answer:
        'Bila matahari terbit tidak terlihat karena cuaca, pemandu tetap menjalankan rute dan menyesuaikan waktu. Ketentuan perubahan jadwal oleh operator: [ditentukan klien].',
    },
    {
      question: 'Apakah ada menu khusus?',
      answer:
        'Sampaikan kebutuhan makanan saat mengisi data peserta; tim kami mengonfirmasinya sebelum keberangkatan.',
    },
  ],
  // Jadwal Bromo menurut desain: 12 Des (sisa 9), 19 Des (sisa 4), 26 Des (penuh), 9 Jan (sisa 10, Rp 1.350.000).
  schedules: [
    { departure: '2026-12-12', taken: 7 },
    { departure: '2026-12-19', taken: 12 },
    { departure: '2026-12-26', taken: 16, full: true },
    { departure: '2027-01-09', taken: 6, priceOverride: 1_350_000 },
  ],
};

const db = getDb();

async function ensureMedia(keys: string[]) {
  const unique = [...new Set(keys)];
  await db
    .insert(media)
    .values(
      unique.map((storageKey) => ({ storageKey, mime: 'image/jpeg', size: 100_000, alt: null })),
    )
    .onConflictDoNothing({ target: media.storageKey });
  const rows = await db
    .select({ id: media.id, key: media.storageKey })
    .from(media)
    .where(inArray(media.storageKey, unique));
  return new Map(rows.map((r) => [r.key, r.id]));
}

try {
  // Pengaturan awal (PRD 6.6 dan 7): DP, durasi hold, maks peserta per booking.
  await db
    .insert(settings)
    .values([
      { key: 'dp_percent', value: 30 },
      { key: 'hold_minutes', value: 120 },
      { key: 'max_participants_per_booking', value: 8 },
    ])
    .onConflictDoNothing();

  const destIds = new Map<string, string>();
  for (const [slug, d] of Object.entries(DESTINATIONS)) {
    await db
      .insert(destinations)
      .values({ slug, name: d.name, region: d.region, status: 'published' })
      .onConflictDoNothing({ target: destinations.slug });
    const [row] = await db
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.slug, slug));
    destIds.set(slug, row!.id);
  }

  const allKeys = [
    ...TRIPS.map((t) => t.photo),
    BROMO.cover,
    ...BROMO.itinerary.flatMap((e) =>
      [e.photo, e.lodging?.photo].filter((k): k is string => Boolean(k)),
    ),
  ];
  const mediaIds = await ensureMedia(allKeys);

  let created = 0;
  for (const t of TRIPS) {
    const [exists] = await db.select({ id: trips.id }).from(trips).where(eq(trips.slug, t.slug));
    if (exists) continue;
    const isBromo = t.slug === 'bromo-sunrise-experience';

    const [trip] = await db
      .insert(trips)
      .values({
        slug: t.slug,
        type: 'open',
        title: t.title,
        tagline: isBromo ? BROMO.tagline : null,
        destinationId: destIds.get(t.dest)!,
        durationDays: t.days,
        nights: t.nights,
        basePrice: t.price,
        meetingPoint: isBromo ? BROMO.meetingPoint : '[diisi klien]',
        difficulty: isBromo ? 'ringan sampai sedang' : null,
        badge: t.badge ?? null,
        summary: isBromo
          ? BROMO.tagline
          : `${t.title}: perjalanan terorganisir dengan harga per orang yang jelas.`,
        description: isBromo ? BROMO.description : null,
        defaultCapacity: t.capacity,
        status: 'published',
      })
      .returning({ id: trips.id });
    const tripId = trip!.id;

    // Foto: Bromo punya foto sampul detail (posisi 0) dan foto kartu (hero); lainnya satu foto.
    const photos = isBromo
      ? [
          { key: BROMO.cover, isHero: false },
          { key: t.photo, isHero: true },
        ]
      : [{ key: t.photo, isHero: true }];
    await db.insert(tripMedia).values(
      photos.map((p, i) => ({
        tripId,
        mediaId: mediaIds.get(p.key)!,
        position: i,
        isHero: p.isHero,
      })),
    );

    const schedules = isBromo
      ? BROMO.schedules.map((s) => ({ ...s, capacity: t.capacity }))
      : [{ departure: t.departure, taken: t.taken, full: t.full, capacity: t.capacity }];
    await db.insert(tripSchedules).values(
      schedules.map((s) => ({
        tripId,
        departureDate: s.departure,
        returnDate: addDays(s.departure, t.days - 1),
        capacity: s.capacity,
        minParticipants: 1,
        seatsTaken: s.taken,
        priceOverride: 'priceOverride' in s ? (s.priceOverride as number) : null,
        status: s.full ? ('full' as const) : ('open' as const),
      })),
    );

    if (isBromo) {
      await db.insert(tripItineraryDays).values(
        BROMO.itinerary.map((e, i) => ({
          tripId,
          position: i + 1,
          dayNumber: e.day,
          timeLabel: e.time,
          place: e.place,
          title: e.title,
          body: e.body,
          mediaId: mediaIds.get(e.photo)!,
          lodging: e.lodging
            ? { name: e.lodging.name, mediaId: mediaIds.get(e.lodging.photo)! }
            : null,
        })),
      );
      await db.insert(tripInclusions).values([
        ...BROMO.includes.map((text, i) => ({
          tripId,
          kind: 'include' as const,
          position: i + 1,
          text,
        })),
        ...BROMO.excludes.map((text, i) => ({
          tripId,
          kind: 'exclude' as const,
          position: i + 1,
          text,
        })),
      ]);
      await db
        .insert(tripFaqs)
        .values(BROMO.faqs.map((f, i) => ({ tripId, position: i + 1, ...f })));
    }
    created++;
  }

  console.log(
    `Seed selesai: ${created} trip baru, ${TRIPS.length - created} sudah ada (dilewati).`,
  );
} finally {
  await closeDb();
}
