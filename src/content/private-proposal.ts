/**
 * Data dan tipe tampilan untuk Proposal Review (`/private-trip/proposal/[kode]`) dan hasil permintaan Private
 * Trip di Cek Status. TAMPILAN SAJA: belum ada query, aksi persetujuan, atau pengiriman revisi.
 *
 * Bentuk data mengikuti baris database (`quote_requests` dan `proposals` di src/server/db/schema/quotes.ts):
 * nama kolom camelCase, rupiah bilangan bulat (`number`, kolom `idr`), tanggal kalender berupa string
 * YYYY-MM-DD, waktu berupa `Date`. Komponen hanya menampilkan apa yang diberikan; harga, DP, sisa pelunasan,
 * dan status diputuskan server, bukan dihitung di sini.
 *
 * Titik sambung backend (semuanya masih kosong atau sampel):
 *  - `findProposalView(kode)`: baca proposal lewat token akses (kolom `proposals.access_token_hash`), jangan
 *    percaya nilai dari klien. Sekarang selalu `null`, jadi rute nyata menampilkan halaman tidak ditemukan.
 *  - `findRequestForLookup(kode, email)`: pencarian Cek Status (cocokkan kode dan email, pesan galat sama untuk
 *    kode salah maupun email salah). Sekarang selalu `null`.
 *  - Setujui dan Minta revisi: butuh endpoint POST yang mencatat `approved_at` + `approved_ip` atau
 *    `revision_note`; tombolnya sengaja belum ditampilkan di halaman.
 *  - Skema belum punya kolom untuk rincian harga per baris, akomodasi terpilih, dan jumlah dewasa/anak; tipe
 *    `ProposalContent` di bawah mengusulkan bentuk JSON-nya (kolom `itinerary` dan `inclusions` bertipe
 *    `unknown[]` di skema).
 *
 * Semua data di berkas ini berlabel contoh dan hanya dirender lewat rute pratinjau khusus dev.
 */

/** Sama dengan enum `request_status` di skema. */
export type RequestStatus =
  | 'pending_review'
  | 'in_progress'
  | 'proposal_sent'
  | 'approved'
  | 'revision_requested'
  | 'declined'
  | 'converted'
  | 'expired';

/** Sama dengan enum `proposal_status` di skema. */
export type ProposalStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'superseded';

/** Baris `quote_requests` yang aman ditampilkan ke pemiliknya (tanpa nama, email, dan telepon). */
export interface QuoteRequestRow {
  /** RQ-YYMM-NNNN, dibuat hanya lewat `nextCode`. */
  code: string;
  status: RequestStatus;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  participants: number;
  durationDays: number | null;
  createdAt: Date;
}

export interface ProposalTimeRow {
  time: string;
  title: string;
  detail: string;
}

/** Satu hari pada `proposals.itinerary` (bentuk JSON yang diusulkan). */
export interface ProposalDay {
  dayNo: number;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  items: ProposalTimeRow[];
}

export interface ProposalStay {
  kicker: string;
  name: string;
  description: string;
  facts: string;
}

export interface ProposalPriceLine {
  label: string;
  amount: number;
}

/** Isi proposal selain kolom polos: bentuk JSON yang diusulkan untuk `itinerary` dan `inclusions`. */
export interface ProposalContent {
  /** Kalimat judul; `titleEm` dicetak miring, misalnya "Proposal perjalanan Yogyakarta untuk" + "keluarga Anda". */
  title: string;
  titleEm: string;
  destinationNote: string;
  paceNote: string;
  itinerary: ProposalDay[];
  included: string[];
  excluded: string[];
  stays: ProposalStay[];
  priceLines: ProposalPriceLine[];
  /** "per orang" atau "per rombongan"; null sampai klien memastikan. */
  priceBasis: string | null;
}

/** Baris `proposals` (kolom yang dipakai tampilan). */
export interface ProposalRow {
  version: number;
  status: ProposalStatus;
  /** Harga final, sudah termasuk PPN, tidak pernah dihitung otomatis. */
  priceTotal: number;
  validUntil: Date;
  sentAt: Date | null;
  approvedAt: Date | null;
  revisionNote: string | null;
}

/** Yang dikirim server ke halaman proposal. DP dan sisa dihitung server dari pengaturan `dp_percent`. */
export interface ProposalView {
  request: QuoteRequestRow;
  proposal: ProposalRow;
  content: ProposalContent;
  dp: { amount: number; balance: number };
  /** true hanya untuk data contoh di bawah; halaman menampilkan penanda pratinjau. */
  sample: boolean;
}

/** Yang dikirim server ke hasil Cek Status: permintaan, dengan proposal bila sudah ada. */
export interface RequestLookupView {
  request: QuoteRequestRow;
  proposal: Pick<ProposalRow, 'version' | 'validUntil' | 'sentAt' | 'approvedAt'> | null;
  /** Ringkasan satu baris untuk judul hasil, misalnya "Yogyakarta untuk keluarga Anda". */
  headline: { lead: string; em: string };
  sample: boolean;
}

/** Bentuk kode permintaan; kode valid bentuknya belum tentu ada datanya. */
export const REQUEST_CODE = /^RQ-\d{4}-\d{4}$/;
export const isRequestCode = (value: string): boolean => REQUEST_CODE.test(value);

/** TITIK SAMBUNG BE: belum ada tabel yang dibaca, jadi tidak ada kode yang ditemukan. */
export async function findProposalView(kode: string): Promise<ProposalView | null> {
  void kode;
  return null;
}

/**
 * Pencarian permintaan di Cek Status belum terhubung ke backend. Selama `false`, tab "Permintaan Private
 * Trip" menampilkan keterangan jujur (bukan formulir yang pasti gagal). Ubah ke `true` bersamaan dengan
 * menyambungkan `findRequestForLookup` ke tabel permintaan di tahap BE.
 */
export const REQUEST_LOOKUP_LIVE = false;

/** TITIK SAMBUNG BE: pencarian Cek Status (kode + email). Belum ada data, jadi selalu null. */
export async function findRequestForLookup(
  kode: string,
  email: string,
): Promise<RequestLookupView | null> {
  void kode;
  void email;
  return null;
}

/* ------------------------------------------------------------------------------------------------
 * Data contoh (hanya untuk pratinjau dev). Angka dan nama hanya ilustrasi, bukan harga atau paket nyata.
 * -------------------------------------------------------------------------------------------------- */

export const PREVIEW_STATES = ['menunggu', 'revisi', 'disetujui', 'kedaluwarsa'] as const;
export type PreviewState = (typeof PREVIEW_STATES)[number];
export const isPreviewState = (value: string): value is PreviewState =>
  (PREVIEW_STATES as readonly string[]).includes(value);

/** Keadaan hasil Cek Status yang bisa dipratinjau (dev). */
export const LOOKUP_PREVIEW_STATES = [
  'diterima',
  'siap',
  'revisi',
  'disetujui',
  'kedaluwarsa',
] as const;
export type LookupPreviewState = (typeof LOOKUP_PREVIEW_STATES)[number];
export const isLookupPreviewState = (value: string): value is LookupPreviewState =>
  (LOOKUP_PREVIEW_STATES as readonly string[]).includes(value);

export const SAMPLE_REQUEST_CODE = 'RQ-2611-0042';

const priceLines: ProposalPriceLine[] = [
  { label: 'Akomodasi · hotel 2 malam, 2 kamar', amount: 7_800_000 },
  { label: 'Kendaraan privat · 3 hari', amount: 4_500_000 },
  { label: 'Tiket dan aktivitas · 4 orang', amount: 2_100_000 },
  { label: 'Pemandu lokal · 2 hari', amount: 1_200_000 },
  { label: 'Makan sesuai itinerary', amount: 2_400_000 },
];

const content: ProposalContent = {
  title: 'Proposal perjalanan Yogyakarta untuk',
  titleEm: 'keluarga Anda',
  destinationNote: 'Kota, Borobudur, pantai selatan',
  paceNote: 'Tidak padat, kendaraan privat',
  itinerary: [
    {
      dayNo: 1,
      date: '2026-12-19',
      title: 'Kedatangan dan Yogyakarta kota',
      items: [
        {
          time: '08.00',
          title: 'Penjemputan di bandara YIA',
          detail: 'Kendaraan privat menunggu di pintu kedatangan.',
        },
        {
          time: '11.00',
          title: 'Check-in hotel dan istirahat',
          detail: 'Waktu untuk anak-anak istirahat sebelum berkeliling.',
        },
        {
          time: '15.30',
          title: 'Keraton Yogyakarta dan Taman Sari',
          detail: 'Jalan santai dengan pemandu lokal, ada jeda jajan.',
        },
        {
          time: '19.00',
          title: 'Makan malam di Malioboro',
          detail: 'Menu keluarga, kembali ke hotel sebelum larut.',
        },
      ],
    },
    {
      dayNo: 2,
      date: '2026-12-20',
      title: 'Borobudur dan desa wisata',
      items: [
        {
          time: '06.30',
          title: 'Sarapan di hotel',
          detail: 'Berangkat pagi agar Borobudur belum terlalu ramai.',
        },
        {
          time: '08.30',
          title: 'Candi Borobudur',
          detail: 'Tiket dan pemandu termasuk, durasi sekitar 2,5 jam.',
        },
        {
          time: '12.30',
          title: 'Makan siang di Magelang',
          detail: 'Restoran keluarga dengan area bermain anak.',
        },
        {
          time: '15.00',
          title: 'Desa wisata dan membatik',
          detail: 'Aktivitas ringan, boleh dilewati bila anak lelah.',
        },
      ],
    },
    {
      dayNo: 3,
      date: '2026-12-21',
      title: 'Pantai selatan dan oleh-oleh',
      items: [
        {
          time: '08.00',
          title: 'Check-out dan menuju pantai',
          detail: 'Pantai landai yang aman untuk anak.',
        },
        {
          time: '12.30',
          title: 'Makan siang seafood',
          detail: 'Sesuai preferensi makan keluarga.',
        },
        {
          time: '15.00',
          title: 'Belanja oleh-oleh',
          detail: 'Bakpia dan batik, tanpa terburu-buru.',
        },
        {
          time: '17.30',
          title: 'Antar ke bandara atau stasiun',
          detail: 'Jam disesuaikan dengan jadwal pulang Anda.',
        },
      ],
    },
  ],
  included: [
    'Kendaraan privat, pengemudi, dan BBM',
    'Hotel 2 malam, 2 kamar keluarga, sarapan',
    'Tiket Keraton, Taman Sari, dan Borobudur',
    'Pemandu lokal 2 hari',
    'Makan sesuai itinerary dan air mineral',
  ],
  excluded: [
    'Tiket pesawat atau kereta menuju Yogyakarta',
    'Makan dan jajan di luar itinerary',
    'Pengeluaran pribadi dan belanja',
    'Tip pengemudi dan pemandu (opsional)',
  ],
  stays: [
    {
      kicker: 'Malam 1 dan 2 · Hotel bintang 3',
      name: '[Nama akomodasi]',
      description: 'Dekat pusat kota, kolam renang kecil, sarapan buffet.',
      facts: '2 kamar keluarga, 2 malam, sarapan termasuk',
    },
    {
      kicker: 'Alternatif · Homestay',
      name: '[Nama akomodasi alternatif]',
      description: 'Rumah joglo dengan halaman, bila Anda ingin suasana kampung.',
      facts: 'Bisa diganti tanpa mengubah itinerary',
    },
  ],
  priceLines,
  priceBasis: null,
};

const total = priceLines.reduce((sum, line) => sum + line.amount, 0);
/** DP contoh 30%; angka resmi dari pengaturan `dp_percent` di server. */
const dp = { amount: Math.round(total * 0.3), balance: total - Math.round(total * 0.3) };

const request = (status: RequestStatus, createdAt: string): QuoteRequestRow => ({
  code: SAMPLE_REQUEST_CODE,
  status,
  destination: 'Yogyakarta',
  startDate: '2026-12-19',
  endDate: '2026-12-21',
  participants: 4,
  durationDays: 3,
  createdAt: new Date(createdAt),
});

/** Data contoh per keadaan; semua tanggal tetap agar tampilan pratinjau stabil. */
export function sampleProposalView(state: PreviewState): ProposalView {
  const base = { content, dp, sample: true };
  switch (state) {
    case 'menunggu':
      return {
        ...base,
        request: request('proposal_sent', '2026-11-16T03:00:00Z'),
        proposal: {
          version: 1,
          status: 'sent',
          priceTotal: total,
          validUntil: new Date('2026-12-04T16:59:00Z'),
          sentAt: new Date('2026-11-23T03:00:00Z'),
          approvedAt: null,
          revisionNote: null,
        },
      };
    case 'revisi':
      return {
        ...base,
        request: request('revision_requested', '2026-11-16T03:00:00Z'),
        proposal: {
          version: 1,
          status: 'sent',
          priceTotal: total,
          validUntil: new Date('2026-12-04T16:59:00Z'),
          sentAt: new Date('2026-11-23T03:00:00Z'),
          approvedAt: null,
          revisionNote:
            'Kami ingin hari kedua tidak terlalu padat karena anak bungsu mudah lelah. Mohon cek juga apakah anggaran bisa sedikit lebih rendah dengan hotel yang lebih sederhana.',
        },
      };
    case 'disetujui':
      return {
        ...base,
        request: request('approved', '2026-11-16T03:00:00Z'),
        proposal: {
          version: 1,
          status: 'approved',
          priceTotal: total,
          validUntil: new Date('2026-12-04T16:59:00Z'),
          sentAt: new Date('2026-11-23T03:00:00Z'),
          approvedAt: new Date('2026-11-23T07:20:00Z'),
          revisionNote: null,
        },
      };
    case 'kedaluwarsa':
      return {
        ...base,
        request: request('expired', '2026-11-02T03:00:00Z'),
        proposal: {
          version: 1,
          status: 'sent',
          priceTotal: total,
          validUntil: new Date('2026-11-20T16:59:00Z'),
          sentAt: new Date('2026-11-09T03:00:00Z'),
          approvedAt: null,
          revisionNote: null,
        },
      };
  }
}

/** Data contoh hasil Cek Status. `diterima` belum punya proposal. */
export function sampleLookupView(state: LookupPreviewState): RequestLookupView {
  const headline = { lead: 'Yogyakarta untuk', em: 'keluarga Anda' };
  if (state === 'diterima') {
    return {
      request: request('pending_review', '2026-11-26T03:00:00Z'),
      proposal: null,
      headline,
      sample: true,
    };
  }
  const map = {
    siap: sampleProposalView('menunggu'),
    revisi: sampleProposalView('revisi'),
    disetujui: sampleProposalView('disetujui'),
    kedaluwarsa: sampleProposalView('kedaluwarsa'),
  } as const;
  const v = map[state];
  return {
    request: v.request,
    proposal: {
      version: v.proposal.version,
      validUntil: v.proposal.validUntil,
      sentAt: v.proposal.sentAt,
      approvedAt: v.proposal.approvedAt,
    },
    headline,
    sample: true,
  };
}
