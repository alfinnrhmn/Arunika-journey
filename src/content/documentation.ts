/**
 * Isi halaman Destinasi dan Dokumentasi (/dokumentasi): empat destinasi dengan galeri dokumentasi trip.
 *
 * SEMENTARA: data statis; nanti diganti data dari server/CMS (Pustaka Media: foto/video dokumentasi dengan nama
 * trip dan bulan keberangkatan, jenis trip, format). Teks diambil apa adanya dari rancangan Doop. Foto di
 * rancangan adalah contoh tata letak; di sini dipetakan ke foto situs di public/foto (tanpa .webp). Keterangan
 * "[Trip] · [Bulan tahun]" tetap placeholder sampai dokumentasi asli diisi klien.
 */

export type DocKind = 'open' | 'private';
export type DocFormat = 'foto' | 'video';

export interface DocItem {
  kind: DocKind;
  format: DocFormat;
  /** Keterangan singkat gambar (contoh tata letak). */
  title: string;
  foto: string;
  alt: string;
}

export interface Destination {
  id: string;
  /** Kunci filter lokasi di /trips?destinasi=... */
  slug: string;
  name: string;
  lead: string;
  body: string;
  pano: { foto: string; alt: string };
  /** `a`: kolom tinggi-rendah mulai dari kiri; `b`: kebalikannya (mengikuti rancangan). */
  pattern: 'a' | 'b';
  items: DocItem[];
}

export const docsHero = {
  hand: 'Destinasi dan dokumentasi',
  titleA: 'Dokumentasi',
  titleB: 'trip',
  titleI: 'asli',
  text: 'Foto dan video dari perjalanan yang benar-benar berangkat, lengkap dengan nama trip dan bulan keberangkatan. Jelajahi empat destinasi kami, atau saring berdasarkan jenis trip dan format. Foto di sini adalah contoh tata letak; dokumentasi asli [diisi klien].',
  main: { foto: 'potret-perempuan-tenun', alt: 'Potret perempuan penenun tersenyum' },
  second: { foto: 'haluan-perahu-laut', alt: 'Haluan perahu menembus laut tenang' },
} as const;

export const docsCaption = '[Trip] · [Bulan tahun]';

export const docsFilters = {
  type: [
    { value: 'open', label: 'Open Trip' },
    { value: 'private', label: 'Private Trip' },
  ],
  format: [
    { value: 'foto', label: 'Foto' },
    { value: 'video', label: 'Video' },
  ],
  total: '[diisi klien]',
  empty: 'Belum ada dokumentasi untuk filter ini.',
} as const;

export const destinations: Destination[] = [
  {
    id: 'bromo',
    slug: 'bromo',
    name: 'Bromo',
    lead: 'Matahari terbit di atas lautan kabut, dan kawah yang masih mengepulkan asap.',
    body: 'Jip 4×4 melintasi lautan pasir, kabut tipis bertahan di lereng, dan hening pagi hari terasa seperti hadiah. Berikut momen dari Open Trip dan Private Trip ke Bromo yang benar-benar berangkat.',
    pano: { foto: 'bromo-lautan-kabut', alt: 'Lautan kabut dan puncak gunung di kawasan Bromo' },
    pattern: 'a',
    items: [
      {
        kind: 'open',
        format: 'video',
        title: 'Jip melintasi lautan pasir saat pagi',
        foto: 'roda-jip-pasir',
        alt: 'Roda jip melintasi lautan pasir Bromo',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Hamparan hijau sepanjang jalan turun',
        foto: 'kubis-embun',
        alt: 'Kebun kubis berembun di lereng',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Menunggu cahaya pertama di titik pandang',
        foto: 'penanjakan-menunggu-fajar',
        alt: 'Peserta menunggu fajar di Penanjakan',
      },
      {
        kind: 'private',
        format: 'foto',
        title: 'Rombongan keluarga berbincang dengan warga lokal',
        foto: 'warga-tengger-bromo',
        alt: 'Warga Tengger berbincang dengan pengunjung',
      },
    ],
  },
  {
    id: 'dieng',
    slug: 'dieng',
    name: 'Dieng',
    lead: 'Kabut pagi, candi tua, dan telaga berwarna berbagi satu pemandangan.',
    body: 'Perjalanan di dataran tinggi bergerak dengan ritme pelan: teh jahe di warung pinggir telaga, kebun teh yang dipetik tangan, dan candi yang paling tenang sebelum siang.',
    pano: { foto: 'dieng-teras-kabut', alt: 'Dataran tinggi Dieng berkabut' },
    pattern: 'b',
    items: [
      {
        kind: 'open',
        format: 'foto',
        title: 'Teh jahe di warung pinggir telaga',
        foto: 'pedagang-warung-kabut',
        alt: 'Pedagang warung di tengah kabut Dieng',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Telaga berwarna sebelum siang',
        foto: 'dieng-sunrise-emas',
        alt: 'Matahari terbit keemasan di dataran tinggi Dieng',
      },
      {
        kind: 'private',
        format: 'video',
        title: 'Bukit di antara lautan awan',
        foto: 'sikunir-lautan-awan',
        alt: 'Lautan awan dilihat dari puncak bukit Sikunir',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Menyusuri kebun teh bersama petani',
        foto: 'wonosobo-keluarga-teh',
        alt: 'Keluarga petani di kebun teh Wonosobo',
      },
    ],
  },
  {
    id: 'yogyakarta',
    slug: 'yogyakarta',
    name: 'Yogyakarta',
    lead: 'Kota yang paling enak dijelajahi dengan langkah pelan, dari pasar pagi sampai rumah joglo.',
    body: 'Candi, keraton, sumur berundak yang jarang dikunjungi, dan perajin kain yang mau bercerita. Dokumentasi dari perjalanan yang memberi ruang untuk berhenti.',
    pano: { foto: 'prambanan-fajar', alt: 'Candi Prambanan menjulang saat fajar' },
    pattern: 'a',
    items: [
      {
        kind: 'open',
        format: 'foto',
        title: 'Sumur berundak yang jarang dikunjungi',
        foto: 'anak-muda-jogja',
        alt: 'Peserta duduk di tepi sumur berundak',
      },
      {
        kind: 'open',
        format: 'video',
        title: 'Bertemu perajin kain tradisional',
        foto: 'batik-tulis',
        alt: 'Perajin membatik tulis',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Malam di angkringan bersama pemandu lokal',
        foto: 'angkringan-malam',
        alt: 'Suasana angkringan pada malam hari',
      },
      {
        kind: 'private',
        format: 'foto',
        title: 'Gerbang bata tua di tengah kota',
        foto: 'jogja-gerbang-bata',
        alt: 'Gerbang bata tua di Yogyakarta',
      },
    ],
  },
  {
    id: 'karimunjawa',
    slug: 'karimunjawa',
    name: 'Karimunjawa',
    lead: 'Gugusan pulau kecil dengan laut tenang dan senja yang jatuh di dermaga kayu.',
    body: 'Snorkeling di terumbu dangkal, perahu yang menyusuri kanal hijau, dan pantai pasir putih sebelum ramai. Dokumentasi dari perjalanan di atas air.',
    pano: { foto: 'pulau-udara-perahu', alt: 'Pulau-pulau kecil dan perahu dilihat dari atas' },
    pattern: 'b',
    items: [
      {
        kind: 'private',
        format: 'foto',
        title: 'Senja di vila tepi pantai',
        foto: 'cemara-lodge-eksterior',
        alt: 'Penginapan tepi pantai saat senja',
      },
      {
        kind: 'private',
        format: 'foto',
        title: 'Jembatan kayu menyusuri hutan bakau',
        foto: 'jembatan-kayu-mangrove',
        alt: 'Jembatan kayu di hutan mangrove',
      },
      {
        kind: 'open',
        format: 'foto',
        title: 'Berlabuh di pantai pasir putih',
        foto: 'karimunjawa-pantai-perahu',
        alt: 'Perahu berlabuh di pantai Karimunjawa',
      },
      {
        kind: 'open',
        format: 'video',
        title: 'Snorkeling di terumbu dangkal',
        foto: 'bintang-laut',
        alt: 'Bintang laut di perairan dangkal',
      },
    ],
  },
];

export const docsFacts = {
  titleA: 'Cara kami menjaga',
  titleI: 'keaslian',
  text: 'Ulasan terverifikasi berarti ditulis oleh peserta yang tercatat berangkat di sistem reservasi. Mekanisme pengiriman dan moderasi: [dikonfirmasi klien].',
  items: [
    {
      title: 'Tercatat berangkat',
      text: 'Hanya peserta dengan reservasi Confirmed yang tercatat berangkat yang bisa menulis ulasan atau tampil di dokumentasi.',
    },
    {
      title: 'Ulasan lewat tautan khusus',
      text: 'Tautan ulasan dikirim setelah trip selesai, khusus untuk peserta yang berangkat. Kanal pengiriman: [dikonfirmasi klien].',
    },
    {
      title: 'Dokumentasi bernama dan bertanggal',
      text: 'Setiap foto dan video mencantumkan nama trip dan bulan keberangkatan, jadi Anda tahu persis dari perjalanan mana gambar itu berasal.',
    },
    {
      title: 'Ditampilkan apa adanya',
      text: 'Ulasan tampil sebagaimana ditulis. Kebijakan moderasi dan tanggapan: [dikonfirmasi klien].',
    },
  ],
} as const;

export const docsTrips = {
  hand: 'Dari dokumentasi ke perjalanan Anda',
  titleA: 'Trip yang',
  titleI: 'sudah',
  titleB: 'kami dokumentasikan',
  text: 'Harga mulai dari per orang dan sisa kuota terlihat di setiap jadwal, jadi Anda bisa langsung memutuskan.',
  cta: { label: 'Lihat semua jadwal Open Trip', href: '/trips' },
} as const;

export const docsTestimonials = {
  titleA: 'Dalam',
  titleI: 'kata',
  titleB: 'mereka',
  rating: 'Rating: [diisi klien] / 5',
  hint: 'Geser untuk membaca ulasan berikutnya',
  slides: [
    {
      text: 'Saya bisa cek sisa kursi dan bayar DP sendiri tanpa chat admin. Fotonya juga sama persis dengan yang kami alami di lapangan.',
      foto: 'perempuan-geladak-perahu',
      alt: 'Perempuan di geladak perahu menatap laut',
    },
    {
      text: 'Setiap foto mencantumkan nama trip dan bulannya. Itu yang membuat kami percaya sebelum memesan.',
      foto: 'pendaki-bukit-hijau',
      alt: 'Pendaki di lereng bukit hijau',
    },
    {
      text: 'Rombongan kecil, ritme pelan, dan pemandu yang sabar. Persis seperti yang terlihat di dokumentasinya.',
      foto: 'pulau-udara-atas',
      alt: 'Pulau kecil berhutan dilihat dari udara',
    },
  ],
  by: '— [Nama peserta], [Trip] · [Bulan tahun]',
  note: 'Ulasan terverifikasi (contoh). Ulasan asli hanya dari peserta yang berangkat.',
} as const;

export const docsCta = {
  titleA: 'Ikut',
  titleI: 'cerita',
  titleB: 'berikutnya',
  text: 'Lihat jadwal dan kuota Open Trip, atau kirim Request a Quote untuk Private Trip.',
  primary: { label: 'Lihat jadwal Open Trip', href: '/trips' },
  secondary: { label: 'Atau Request a Quote untuk Private Trip', href: '/private-trip' },
  foto: 'jip-4x4-bromo',
  alt: 'Jip 4×4 di punggung bukit Bromo saat fajar',
} as const;
