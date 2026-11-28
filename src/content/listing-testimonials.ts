/**
 * Testimoni CONTOH untuk karusel di halaman Open Trip. Berbentuk baris tabel `testimonials`; nama, trip, dan bulan
 * masih placeholder. Ulasan asli hanya dari peserta yang tercatat berangkat (status `verified`), jadi data ini
 * diganti hasil query saat BE testimoni ada.
 */
export interface ListingTestimonial {
  quote: string;
  /** Nama peserta, trip, dan bulan; placeholder sampai ada data sungguhan. */
  who: string;
  note: string;
  /** Nama berkas di public/foto (tanpa ekstensi). */
  photo: string;
  alt: string;
}

const WHO = '[Nama peserta], [Trip] · [Bulan tahun]';
const NOTE = 'Contoh teks. Ulasan asli hanya dari peserta yang berangkat.';

export const LISTING_TESTIMONIALS: ListingTestimonial[] = [
  {
    quote:
      'Tim Arunika menyusun semuanya dengan sabar. Hotel, jadwal, dan harga jelas dari awal, sehingga kami bisa menikmati perjalanan tanpa rasa was-was.',
    who: WHO,
    note: NOTE,
    photo: 'traveler-selimut-bromo',
    alt: 'Peserta berselimut menatap kabut Bromo',
  },
  {
    quote:
      'Semua jelas dari awal: harga, jadwal, dan apa yang termasuk. Tidak ada kejutan di hari keberangkatan. Saya bahkan bisa cek sisa kursi dan membayar DP sendiri.',
    who: WHO,
    note: NOTE,
    photo: 'senja-perahu-tenang',
    alt: 'Perahu kayu di laut tenang saat senja',
  },
  {
    quote:
      'Pemandunya sabar dengan ritme orang tua kami. Kami berhenti di tempat yang tepat, tanpa merasa diburu jadwal.',
    who: WHO,
    note: NOTE,
    photo: 'perempuan-geladak-perahu',
    alt: 'Peserta duduk di geladak perahu menatap laut',
  },
  {
    quote:
      'Private Trip kami disusun dari cerita yang kami kirim lewat form. Proposalnya rinci dan terasa dibuat khusus untuk keluarga kami.',
    who: WHO,
    note: NOTE,
    photo: 'jembatan-kayu-mangrove',
    alt: 'Jembatan kayu tua menuju laut saat senja',
  },
  {
    quote:
      'Fajar di kaldera itu sepadan dengan bangun jam tiga pagi. Rombongan kecil, tidak ada rebutan tempat berdiri.',
    who: WHO,
    note: NOTE,
    photo: 'wonosobo-keluarga-teh',
    alt: 'Keluarga berjalan di kebun teh',
  },
  {
    quote:
      'Pembayaran DP lewat website mudah dan status booking bisa dicek kapan saja. Rasanya aman sejak awal.',
    who: WHO,
    note: NOTE,
    photo: 'bintang-laut',
    alt: 'Bintang laut di perairan dangkal berpasir putih',
  },
];
