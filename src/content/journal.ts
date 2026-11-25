/**
 * CERITA CONTOH untuk halaman Journal (/journal dan /journal/<slug>).
 *
 * Semua isi di sini adalah data sementara yang disalin dari rancangan (frame Doop "Journal" dan "Detail
 * Journal"); tanda kurung siku ([Nama penulis], [Tanggal terbit], [Isi cerita ...]) adalah placeholder yang
 * memang belum diisi klien. NANTI modul ini diganti data dari server (CMS): tabel `posts`, `topics`, `tags`,
 * `post_tags`, dan `media` di src/server/db/schema/content.ts. Bentuk data di bawah sengaja mengikuti tabel itu
 * supaya penggantiannya cukup di satu tempat (fungsi `listStories`, `getStory`, dan kawan-kawannya).
 *
 * Pemetaan ke skema:
 * - `Story.slug / title / excerpt`   -> posts.slug / title / excerpt
 * - `Story.cover.foto`               -> posts.cover_media_id (kunci media `foto/<nama>.webp`)
 * - `Story.topics[0]`                -> posts.topic_id (topik utama). Rancangan memakai beberapa label topik per
 *                                       cerita (mis. "Destinasi · Alam"); skema saat ini hanya satu topik per
 *                                       post, jadi label tambahan di sini nantinya menjadi `tags`/`post_tags`.
 * - `Story.destinasi`                -> tag destinasi (tags.slug), tidak ada kolom khusus di skema
 * - `Story.publishedAt`              -> posts.published_at (null = placeholder "[Tanggal terbit]")
 * - `Story.readMinutes`              -> tidak ada kolomnya; dihitung dari isi saat CMS siap
 * - `Story.author`                   -> posts.author_id -> users.name
 * - `Story.body`                     -> posts.body (Tiptap JSON) / body_html; di sini disederhanakan menjadi blok
 * - `Topic.*`                        -> topics.slug / name / position / show_in_filter
 *
 * Penyaringan, pengurutan, dan halaman dikerjakan DI SERVER (fungsi di bawah), bukan di peramban.
 */

export interface Topic {
  slug: string;
  name: string;
  position: number;
  showInFilter: boolean;
}

export interface Destinasi {
  slug: string;
  name: string;
}

/** Blok isi artikel. `lead` (paragraf pembuka miring), `gallery`, dan `table` dipakai rancangan di luar daftar dasar. */
export type Block =
  | { type: 'lead'; text: string }
  | {
      type: 'heading';
      text: string;
      /** Label pendek untuk "Di cerita ini". */ toc?: string;
      bestFor?: string;
    }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'image'; foto: string; alt: string; caption?: string }
  | { type: 'gallery'; images: { foto: string; alt: string }[] }
  | { type: 'table'; head: string[]; rows: string[][] };

export interface Story {
  slug: string;
  title: string;
  /** Kata di dalam judul yang dimiringkan (gaya rancangan), bila ada. */
  titleEm?: string;
  excerpt: string;
  cover: { foto: string; alt: string; caption?: string };
  /** Slug topik; yang pertama adalah topik utama. */
  topics: string[];
  /** Slug destinasi, atau 'umum'. */
  destinasi: string;
  /** YYYY-MM-DD; null = belum diisi (tampil sebagai placeholder). */
  publishedAt: string | null;
  readMinutes: number;
  /** Nama penulis; null = placeholder "[Nama penulis]". */
  author: string | null;
  /** Catatan di bawah artikel, mis. siapa yang memeriksa. */
  note?: string;
  /** Cerita pilihan: tampil di hero daftar, bukan di kisi. */
  featured?: boolean;
  /** Tanda cerita contoh (tampil sebagai label "Contoh"). Hilang saat data berasal dari CMS. */
  sample: boolean;
  /** Slug trip (tabel trips) yang terkait dengan cerita ini. */
  tripSlugs?: string[];
  /** Cerita "Berikutnya" dan "Baca juga" bila ingin ditentukan; bila kosong dipilih otomatis. */
  nextSlug?: string;
  relatedSlugs?: string[];
  /** Ajakan penutup khusus cerita ini; bila kosong dipakai `DEFAULT_CTA`. `{em}` diganti kata miring; \n adalah jeda baris yang hanya berlaku di desktop. */
  cta?: { title: string; em: string; body: string };
  body: Block[];
}

export const TOPICS: Topic[] = [
  { slug: 'open-trip', name: 'Open Trip', position: 1, showInFilter: true },
  { slug: 'private-trip', name: 'Private Trip', position: 2, showInFilter: true },
  { slug: 'destinasi', name: 'Destinasi', position: 3, showInFilter: true },
  { slug: 'panduan', name: 'Panduan', position: 4, showInFilter: true },
  { slug: 'budaya', name: 'Budaya', position: 5, showInFilter: true },
  { slug: 'kuliner', name: 'Kuliner', position: 6, showInFilter: true },
  { slug: 'alam', name: 'Alam', position: 7, showInFilter: true },
  { slug: 'keluarga', name: 'Keluarga', position: 8, showInFilter: true },
  { slug: 'tips', name: 'Tips Perjalanan', position: 9, showInFilter: true },
  { slug: 'tamu', name: 'Cerita Tamu', position: 10, showInFilter: true },
];

export const DESTINASI: Destinasi[] = [
  { slug: 'bromo', name: 'Bromo' },
  { slug: 'dieng', name: 'Dieng' },
  { slug: 'yogyakarta', name: 'Yogyakarta' },
  { slug: 'karimunjawa', name: 'Karimunjawa' },
];

/** Isi cerita yang belum ditulis (rancangan hanya memuat judul dan ringkasan). */
const BELUM_DITULIS: Block = {
  type: 'paragraph',
  text: '[Isi cerita: diisi tim Arunika.]',
};

export const STORIES: Story[] = [
  {
    slug: 'fajar-yang-layak-ditunggu-di-bromo',
    title: 'Fajar yang layak ditunggu di Bromo',
    titleEm: 'Bromo',
    excerpt:
      'Jam berapa berangkat, di mana berdiri, dan kapan lautan pasir paling sepi. Catatan tim dari puluhan fajar di kaldera.',
    cover: {
      foto: 'bromo-lautan-kabut',
      alt: 'Gunung berapi dengan padang savana di bawah awan',
      caption:
        'Kaldera sebelum matahari menyentuh punggung bukit. Foto contoh dari situs referensi, akan diganti foto tim Arunika.',
    },
    topics: ['destinasi', 'alam', 'panduan'],
    destinasi: 'bromo',
    publishedAt: '2026-11-20',
    readMinutes: 8,
    author: 'Tim Lapangan Arunika',
    note: 'Diperiksa pemandu Bromo, diperbarui 20 November 2026',
    featured: true,
    sample: true,
    tripSlugs: ['bromo-sunrise-experience', 'dieng-golden-sunrise'],
    cta: {
      title: 'Siap berdiri \ndi {em} itu?',
      em: 'kaldera',
      body: 'Pilih tanggal di Open Trip Bromo yang sudah terjadwal, atau ceritakan rencana rombongan Anda dan tim kami menyusun proposalnya.',
    },
    nextSlug: 'dieng-dalam-tiga-hari-embun-candi-dan-mi-ongklok',
    relatedSlugs: [
      'karimunjawa-di-luar-musim-ramai',
      'private-trip-untuk-tiga-generasi-cara-merancangnya',
      'membaca-relief-borobudur-dari-sisi-yang-jarang-dilihat',
    ],
    body: [
      {
        type: 'lead',
        text: 'Matahari terbit di Bromo bukan soal datang paling awal. Ini tentang tahu di mana berdiri, kapan berangkat, dan kapan lautan pasir paling sepi.',
      },
      {
        type: 'heading',
        text: 'Kenapa pukul tiga pagi bukan pilihan terburuk',
        toc: 'Kenapa pukul tiga pagi',
        bestFor: 'pemula, keluarga',
      },
      {
        type: 'paragraph',
        text: 'Hampir semua orang tiba di titik pandang utama dalam gelombang yang sama. Jip berbaris, lampu ponsel menyala, dan kabut turun tepat saat semua orang mengangkat kamera.',
      },
      {
        type: 'paragraph',
        text: 'Kami berangkat lebih awal bukan untuk mengejar matahari, tetapi untuk mengejar jeda. Dua puluh menit sebelum rombongan lain datang, kaldera masih milik Anda, dan suara terdengar paling jelas: angin, langkah, lalu hening yang tidak bisa dijelaskan lewat foto.',
      },
      {
        type: 'heading',
        text: 'Lima titik pandang selain Penanjakan',
        toc: 'Lima titik pandang',
        bestFor: 'fotografi, pejalan yang suka sepi',
      },
      {
        type: 'paragraph',
        text: 'Bromo punya lebih dari satu panggung. Beberapa bukit di sisi selatan memberi sudut yang lebih rendah, dengan siluet kerucut Batok yang terbaca jelas. Dari sisi utara, kabut sering menggantung di bawah, sementara puncak Semeru muncul pelan-pelan di kejauhan.',
      },
      {
        type: 'image',
        foto: 'penanjakan-menunggu-fajar',
        alt: 'Deretan siluet orang berdiri di pagar kayu menatap langit fajar',
        caption: 'Titik pandang pagi hari, sebelum rombongan pertama tiba.',
      },
      {
        type: 'paragraph',
        text: 'Pemandu kami menentukan titik di hari-H, bukan di brosur. Arah angin, tebal kabut, dan jumlah jip di jalur menjadi alasan untuk berpindah lima menit lebih awal atau lebih lambat.',
      },
      {
        type: 'heading',
        text: 'Dari kaldera ke lautan pasir',
        toc: 'Dari kaldera ke lautan pasir',
        bestFor: 'pejalan kaki, penggemar lanskap',
      },
      {
        type: 'paragraph',
        text: 'Setelah matahari naik, jalan menurun ke lautan pasir terasa seperti masuk ke halaman lain dari buku yang sama. Warna berubah dari jingga ke abu hangat, dan kabut tipis masih bertahan di lereng.',
      },
      {
        type: 'quote',
        text: 'Yang paling Anda ingat nanti bukan puncaknya, melainkan menit-menit hening sebelum semua orang datang.',
      },
      {
        type: 'paragraph',
        text: 'Di sinilah ritme perjalanan menentukan. Jika rombongan tidak diburu jadwal, lima belas menit tambahan di lereng sering menjadi bagian yang paling diceritakan ulang.',
      },
      {
        type: 'heading',
        text: 'Yang perlu dibawa',
        toc: 'Yang perlu dibawa',
        bestFor: 'semua peserta',
      },
      {
        type: 'paragraph',
        text: 'Pagi di ketinggian lebih dingin dari perkiraan. Jaket tebal, kupluk, dan sarung tangan tipis jauh lebih berguna daripada lensa tambahan. Bawa masker atau buff karena debu pasir mudah beterbangan saat jip melaju.',
      },
      {
        type: 'gallery',
        images: [
          { foto: 'senja-pulau-palem', alt: 'Langit senja di atas pulau berpalem' },
          {
            foto: 'pendaki-bukit-hijau',
            alt: 'Dua pejalan menyusuri punggungan bukit hijau berkabut',
          },
        ],
      },
      {
        type: 'heading',
        text: 'Kapan waktu terbaik',
        toc: 'Kapan waktu terbaik',
        bestFor: 'yang bisa memilih tanggal',
      },
      {
        type: 'paragraph',
        text: 'Musim kemarau, kira-kira Mei sampai Oktober, memberi langit paling bersih. Bulan-bulan basah punya kabut dramatis, tetapi peluang melihat matahari penuh lebih kecil. Hari kerja biasanya jauh lebih sepi daripada akhir pekan dan libur panjang.',
      },
      {
        type: 'paragraph',
        text: 'Daripada bertanya titik mana yang harus dikunjungi, lebih tepat bertanya suasana apa yang Anda cari. Dari situ, itinerary biasanya menjadi jelas.',
      },
      { type: 'heading', text: 'Rencanakan perjalanan Anda', toc: 'Rencanakan perjalanan' },
      {
        type: 'table',
        head: ['Pengalaman', 'Di mana', 'Format di Arunika'],
        rows: [
          ['Sunrise tanpa keramaian', 'Titik pandang selatan dan utara', 'Open Trip Bromo Sunrise'],
          ['Jalan pagi di lautan pasir', 'Kaldera Bromo', 'Open Trip Bromo Sunrise'],
          [
            'Rombongan keluarga atau komunitas',
            'Bromo dan sekitarnya',
            'Private Trip (Request a Quote)',
          ],
          ['Digabung dengan dataran tinggi', 'Bromo ke Dieng', 'Private Trip (proposal)'],
        ],
      },
    ],
  },
  {
    slug: 'sunrise-tanpa-keramaian-lima-titik-pandang-selain-penanjakan',
    title: 'Sunrise tanpa keramaian: lima titik pandang selain Penanjakan',
    excerpt:
      'Bromo punya lebih dari satu panggung. Ini titik-titik yang kami pakai saat rombongan ingin sepi.',
    cover: {
      foto: 'penanjakan-menunggu-fajar',
      alt: 'Deretan siluet orang berdiri di pagar kayu menatap langit fajar',
    },
    topics: ['destinasi', 'alam'],
    destinasi: 'bromo',
    publishedAt: null,
    readMinutes: 7,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'private-trip-untuk-tiga-generasi-cara-merancangnya',
    title: 'Private Trip untuk tiga generasi: cara merancangnya',
    excerpt:
      'Dari kecepatan langkah sampai jam istirahat, hal kecil yang membuat semua usia ikut menikmati.',
    cover: {
      foto: 'sandbar-perahu',
      alt: 'Perahu kecil di laut tenang dekat hamparan pasir putih',
    },
    topics: ['private-trip', 'keluarga', 'panduan'],
    destinasi: 'yogyakarta',
    publishedAt: null,
    readMinutes: 8,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'dieng-dalam-tiga-hari-embun-candi-dan-mi-ongklok',
    title: 'Dieng dalam tiga hari: embun, candi, dan mi ongklok',
    excerpt:
      'Ritme tiga hari yang tidak memaksa, dari kabut Sikunir sampai makan malam di warung pinggir telaga.',
    cover: {
      foto: 'pendaki-bukit-hijau',
      alt: 'Dua pejalan menyusuri punggungan bukit hijau berkabut',
    },
    topics: ['destinasi', 'kuliner'],
    destinasi: 'dieng',
    publishedAt: null,
    readMinutes: 9,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'membaca-relief-borobudur-dari-sisi-yang-jarang-dilihat',
    title: 'Membaca relief Borobudur dari sisi yang jarang dilihat',
    excerpt: 'Urutan relief, cahaya terbaik, dan waktu yang jarang disebut.',
    cover: {
      foto: 'potret-perempuan-tenun',
      alt: 'Potret perempuan berselendang tenun menoleh ke arah jendela',
    },
    topics: ['budaya', 'panduan'],
    destinasi: 'yogyakarta',
    publishedAt: null,
    readMinutes: 10,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'karimunjawa-di-luar-musim-ramai',
    title: 'Karimunjawa di luar musim ramai',
    excerpt:
      'Laut lebih tenang, kapal lebih lega, dan pulau-pulau kecil terasa seperti milik sendiri.',
    cover: {
      foto: 'pulau-udara-atas',
      alt: 'Pulau kecil berhutan dari udara dikelilingi air laut toska',
    },
    topics: ['alam', 'tips', 'destinasi'],
    destinasi: 'karimunjawa',
    publishedAt: null,
    readMinutes: 6,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'beyond-the-itinerary-rina-dan-keluarganya-di-dieng',
    title: 'Beyond the itinerary: Rina dan keluarganya di Dieng',
    excerpt:
      'Refleksi hangat dari tamu kami tentang pagi berembun, teh jahe, dan hal-hal yang tidak ada di jadwal.',
    cover: {
      foto: 'traveler-haluan-perahu',
      alt: 'Seorang tamu duduk di haluan perahu menatap tepi pulau',
    },
    topics: ['tamu', 'keluarga'],
    destinasi: 'dieng',
    publishedAt: null,
    readMinutes: 4,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'open-trip-atau-private-trip-cara-memilih-yang-tepat',
    title: 'Open Trip atau Private Trip? Cara memilih yang tepat',
    excerpt: 'Tiga pertanyaan sederhana yang menentukan format perjalanan paling cocok untuk Anda.',
    cover: {
      foto: 'senja-pulau-palem',
      alt: 'Matahari terbenam di balik pulau berpalem',
    },
    topics: ['panduan', 'open-trip', 'private-trip'],
    destinasi: 'umum',
    publishedAt: null,
    readMinutes: 5,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
  {
    slug: 'apa-yang-terjadi-setelah-anda-menekan-request-a-quote',
    title: 'Apa yang terjadi setelah Anda menekan Request a Quote',
    excerpt:
      'Dari status Pending Review sampai proposal di email Anda: alurnya, waktunya, dan siapa yang membalas.',
    cover: {
      foto: 'senja-perahu-tenang',
      alt: 'Perahu kecil di laut tenang saat matahari jingga tenggelam',
    },
    topics: ['private-trip', 'panduan'],
    destinasi: 'umum',
    publishedAt: null,
    readMinutes: 5,
    author: null,
    sample: true,
    body: [BELUM_DITULIS],
  },
];

// Cerita yang isinya belum ditulis: ringkasan dari rancangan menjadi paragraf pembuka, sisanya placeholder.
for (const s of STORIES) {
  if (s.body.length === 1 && s.body[0] === BELUM_DITULIS) {
    s.body = [{ type: 'lead', text: s.excerpt }, BELUM_DITULIS];
  }
}

/** Ajakan penutup bawaan (daftar dan cerita tanpa ajakan sendiri). */
export const DEFAULT_CTA = {
  title: 'Siap menulis \ncerita {em} sendiri?',
  em: 'Anda',
  body: 'Pilih tanggal di Open Trip yang sudah terjadwal, atau ceritakan perjalanan impian Anda dan tim kami menyusun proposalnya.',
};

/** Jumlah cerita per halaman daftar (rancangan desktop: 8). */
export const PAGE_SIZE = 8;

const bySlug = <T extends { slug: string }>(list: T[], slug: string) =>
  list.find((x) => x.slug === slug);

export const getTopic = (slug: string | null | undefined) =>
  slug ? TOPICS.find((t) => t.slug === slug && t.showInFilter) : undefined;
export const getDestinasi = (slug: string | null | undefined) =>
  slug ? bySlug(DESTINASI, slug) : undefined;

/** Terbaru lebih dulu; tanpa tanggal mengikuti urutan data (urutan rancangan). */
function sorted(list: Story[]): Story[] {
  return list
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const da = a.s.publishedAt ?? '';
      const db = b.s.publishedAt ?? '';
      if (da !== db) return da < db ? 1 : -1;
      return a.i - b.i;
    })
    .map((x) => x.s);
}

export const featuredStory = (): Story | undefined => sorted(STORIES).find((s) => s.featured);

export function getStory(slug: string | undefined): Story | undefined {
  return slug ? bySlug(STORIES, slug) : undefined;
}

export interface ListQuery {
  topik?: string | null;
  destinasi?: string | null;
  halaman?: number;
}

export interface ListResult {
  items: Story[];
  /** Jumlah hasil setelah disaring (seluruh halaman). */
  total: number;
  page: number;
  totalPages: number;
  /** Jumlah cerita per destinasi, menghormati penyaring topik; kunci 'semua' = seluruhnya. */
  destinasiCounts: Record<string, number>;
  topic?: Topic;
  destinasi?: Destinasi;
}

/** Kisi daftar: semua cerita selain cerita pilihan (yang tampil di hero), disaring dan dipecah per halaman. */
export function listStories(q: ListQuery = {}): ListResult {
  const topic = getTopic(q.topik);
  const dest = getDestinasi(q.destinasi);
  const base = sorted(STORIES).filter((s) => !s.featured);
  const byTopic = topic ? base.filter((s) => s.topics.includes(topic.slug)) : base;
  const destinasiCounts: Record<string, number> = { semua: byTopic.length };
  for (const d of DESTINASI)
    destinasiCounts[d.slug] = byTopic.filter((s) => s.destinasi === d.slug).length;
  const filtered = dest ? byTopic.filter((s) => s.destinasi === dest.slug) : byTopic;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.trunc(q.halaman ?? 1) || 1), totalPages);
  return {
    items: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: filtered.length,
    page,
    totalPages,
    destinasiCounts,
    topic,
    destinasi: dest,
  };
}

/** Cerita "Berikutnya": yang ditentukan, atau cerita sesudahnya dalam urutan terbaru. */
export function nextStory(s: Story): Story | undefined {
  const explicit = s.nextSlug ? getStory(s.nextSlug) : undefined;
  if (explicit) return explicit;
  const all = sorted(STORIES);
  const i = all.findIndex((x) => x.slug === s.slug);
  return all.length > 1 ? all[(i + 1) % all.length] : undefined;
}

/** "Baca juga": yang ditentukan, atau yang topiknya paling banyak sama, maksimal 3. */
export function relatedStories(s: Story, n = 3): Story[] {
  const picked = (s.relatedSlugs ?? [])
    .map((slug) => getStory(slug))
    .filter((x): x is Story => !!x && x.slug !== s.slug);
  if (picked.length >= n) return picked.slice(0, n);
  const rest = sorted(STORIES)
    .filter((x) => x.slug !== s.slug && !picked.includes(x))
    .map((x) => ({ x, score: x.topics.filter((t) => s.topics.includes(t)).length }))
    .sort((a, b) => b.score - a.score)
    .map((r) => r.x);
  return [...picked, ...rest].slice(0, n);
}

export const topicName = (slug: string) => bySlug(TOPICS, slug)?.name ?? slug;

/** Label kartu: dua topik pertama, mis. "Destinasi · Alam". */
export const cardLabel = (s: Story) => s.topics.slice(0, 2).map(topicName).join(' · ');

/** Label di atas judul detail: dua topik pertama + destinasi (bila ada), mis. "Destinasi · Alam · Bromo". */
export function eyebrowLabel(s: Story): string {
  const dest = getDestinasi(s.destinasi);
  return [...s.topics.slice(0, 2).map(topicName), ...(dest ? [dest.name] : [])].join(' · ');
}

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** "2026-11-20" -> "20 November 2026"; null -> placeholder "[Tanggal terbit]". */
export function dateLabel(iso: string | null): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!m) return '[Tanggal terbit]';
  return `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}`;
}

/** Judul dipecah di sekitar kata miring: [sebelum, miring, sesudah]. */
export function titleParts(s: Story): [string, string, string] {
  const em = s.titleEm;
  const at = em ? s.title.indexOf(em) : -1;
  if (!em || at < 0) return [s.title, '', ''];
  return [s.title.slice(0, at), em, s.title.slice(at + em.length)];
}

export const authorLabel = (s: Story) => s.author ?? '[Nama penulis]';
export const readLabel = (s: Story) => `${s.readMinutes} mnt baca`;

/** Subjudul artikel berurutan (untuk "Di cerita ini"); id mengikuti urutan: s1, s2, ... */
export function outline(s: Story): { id: string; text: string; n: string }[] {
  return s.body
    .filter((b): b is Extract<Block, { type: 'heading' }> => b.type === 'heading')
    .map((b, i) => ({ id: `s${i + 1}`, text: b.toc ?? b.text, n: String(i + 1).padStart(2, '0') }));
}

/**
 * Pola rasio gambar kartu kisi menurut urutan: desktop (dua kolom berselang-seling) dan tablet/mobile.
 * Mengikuti rancangan; urutan diulang bila cerita lebih dari delapan.
 */
export const RATIO_DESKTOP = [
  'portrait',
  'tall',
  'tall',
  'portrait',
  'portrait',
  'tall',
  'tall',
  'portrait',
] as const;
export const RATIO_SMALL = [
  'portrait',
  'tall',
  'square',
  'portrait',
  'square',
  'tall',
  'portrait',
  'square',
] as const;
