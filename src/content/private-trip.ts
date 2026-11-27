/**
 * Isi halaman landing Private Trip (/private-trip).
 *
 * SEMENTARA: berbentuk data statis (nanti diganti data dari server/CMS). Teks diambil dari rancangan Doop
 * (varian "Red Dot style"). Isian yang belum diketahui tetap berupa placeholder (`[estimasi dari klien]`,
 * `[dikonfirmasi klien]`, `[Nama keluarga]`, ...) dan JANGAN diganti karangan: nilai nyata datang dari klien.
 * `foto` adalah nama berkas di public/foto (tanpa .webp). Private Trip = Request a Quote: tidak ada
 * pembayaran langsung dan tidak ada harga otomatis di halaman ini.
 */

/** Halaman permintaan penawaran (dibuat terpisah). */
export const ptRequestHref = '/private-trip/request';

export interface PtLink {
  label: string;
  href: string;
}

export const ptHero = {
  hand: 'Private Trip',
  /** Judul: baris pertama, lalu "hanya" (miring) + sisa kalimat. */
  titleA: 'Perjalanan yang dirancang',
  titleI: 'hanya',
  titleB: 'untuk Anda.',
  textA:
    'Itinerary fleksibel untuk keluarga atau kelompok, dengan kendaraan privat dan akomodasi sesuai kebutuhan.',
  textB: 'Ceritakan rencana Anda, kami susun proposalnya.',
  cta: { label: 'Request a Quote', href: ptRequestHref } satisfies PtLink,
  note: 'Tanpa pembayaran sebelum proposal Anda setujui.',
  foto: 'honeymoon-dermaga',
  alt: 'Sepasang orang berdiri di dermaga kayu menghadap laut saat langit senja',
} as const;

export const ptIntro = {
  hand: 'Dirancang khusus untuk Anda',
  /** Frasa yang hanya tampil di desktop (frame tablet dan mobile memendekkan kalimat). */
  textA: 'Kami menyusun perjalanan privat yang sangat personal',
  textDesktopOnly: ' untuk pikiran yang ingin tahu',
  textB:
    '. Tanpa paket kaku, tanpa peserta asing: hanya keluarga atau kelompok Anda, pemandu yang tepat, dan waktu yang dihabiskan dengan baik.',
  /** Tombol hanya tampil di desktop; menuju bagian langkah. */
  cta: { label: 'Cara kerjanya', href: '#cara-kerja' } satisfies PtLink,
  fotoA: {
    foto: 'jogja-gerbang-bata',
    alt: 'Perempuan berjalan melewati lorong gerbang bata tua',
  },
  fotoB: {
    foto: 'cemara-lodge-kamar',
    alt: 'Kamar kayu yang hangat dengan jendela menghadap hutan berkabut',
  },
} as const;

export const ptSteps = {
  id: 'cara-kerja',
  eyebrow: 'Cara kerjanya',
  titleA: 'Empat langkah dari ide ke',
  titleI: 'keberangkatan',
  items: [
    {
      n: '01',
      title: 'Kirim kebutuhan',
      text: 'Isi dua langkah singkat, sekitar 4 menit: tujuan, tanggal, durasi, peserta, anggaran, lalu nama dan email Anda.',
    },
    {
      n: '02',
      title: 'Admin meninjau',
      text: 'Permintaan Anda berstatus Pending Review dan mendapat nomor permintaan. Admin bisa meminta klarifikasi.',
    },
    {
      n: '03',
      title: 'Terima proposal',
      text: 'Itinerary, fasilitas, dan harga final dikirim dalam [estimasi dari klien]. Setujui atau minta revisi.',
    },
    {
      n: '04',
      title: 'Setujui dan berangkat',
      text: 'Setelah proposal disetujui, booking dan pembayaran dilanjutkan sesuai ketentuan di proposal.',
    },
  ],
} as const;

export const ptFeatures = [
  {
    icon: 'calendar',
    title: 'Itinerary fleksibel',
    text: 'Tanggal, rute, dan ritme perjalanan mengikuti Anda, bukan jadwal tetap.',
  },
  {
    icon: 'users',
    title: 'Kendaraan privat',
    text: 'Satu kendaraan hanya untuk rombongan Anda. Berhenti kapan perlu, tanpa peserta lain.',
  },
  {
    icon: 'pin',
    title: 'Akomodasi sesuai keluarga',
    text: 'Homestay, hotel, atau vila dengan kamar yang pas untuk anak dan orang tua.',
  },
] as const;

export const ptExamples = {
  hand: 'Contoh itinerary',
  titleA: 'Titik awal, bukan',
  titleI: 'batasan',
  text: 'Ini hanya contoh untuk menunjukkan apa yang mungkin. Setiap Private Trip disusun dari nol, sesuai kebutuhan dan anggaran Anda.',
  scrollLabel: 'Contoh itinerary Private Trip',
  chip: 'Dapat disesuaikan',
  label: 'Contoh itinerary',
  items: [
    {
      where: 'Yogyakarta',
      title: 'Yogyakarta untuk Keluarga',
      badge: 'Keluarga',
      meta: '4 hari 3 malam. Harga lewat proposal',
      foto: 'prambanan-senja',
      alt: 'Kompleks candi Prambanan saat senja',
      /** Hanya tampil di tablet (frame tablet memakai empat kartu). */
      tabletOnly: false,
    },
    {
      where: 'Jawa Timur',
      title: 'Bromo dan Malang',
      badge: '',
      meta: '3 hari 2 malam. Harga lewat proposal',
      foto: 'bromo-sunrise-grup',
      alt: 'Empat pendaki memandang kaldera Bromo di atas lautan kabut saat fajar',
      tabletOnly: false,
    },
    {
      where: 'Jawa Tengah',
      title: 'Karimunjawa',
      badge: 'Kelompok',
      meta: '4 hari 3 malam. Harga lewat proposal',
      foto: 'karimunjawa-pantai-perahu',
      alt: 'Perahu kayu di pantai berpasir putih Karimunjawa',
      tabletOnly: false,
    },
    {
      where: 'Rute sesuai permintaan',
      title: 'Custom Family Escape',
      badge: 'Keluarga',
      meta: '3 hari 2 malam. Harga lewat proposal',
      foto: 'wonosobo-keluarga-teh',
      alt: 'Satu keluarga berjalan di antara kebun teh berkabut',
      tabletOnly: true,
    },
  ],
} as const;

export const ptPricing = {
  hand: 'Soal harga',
  titleA: 'Tidak ada harga otomatis, hanya proposal yang',
  titleI: 'jelas',
  text: 'Karena setiap Private Trip berbeda, harga final tidak dihitung otomatis. Tim kami menyusun itinerary, fasilitas, durasi, dan harga final, lalu mengirimkannya sebagai proposal yang bisa Anda tinjau dan setujui sebelum membayar apa pun.',
  basis: 'Basis hitung (per orang atau per rombongan): [dikonfirmasi klien].',
  note: 'Anda tidak membayar apa pun sebelum menyetujui proposal. Pembayaran sesuai ketentuan di proposal.',
  listLabel: 'Hal yang memengaruhi harga proposal',
  rows: [
    { k: 'Jumlah peserta', v: 'Mempengaruhi kendaraan dan akomodasi', desktopOnly: false },
    { k: 'Durasi dan rute', v: 'Mempengaruhi jarak dan waktu pemandu', desktopOnly: false },
    { k: 'Kategori akomodasi', v: 'Homestay, hotel, atau vila', desktopOnly: false },
    { k: 'Aktivitas khusus', v: 'Sesuai permintaan Anda', desktopOnly: true },
    { k: 'Musim keberangkatan', v: 'Akhir pekan atau libur panjang', desktopOnly: false },
  ],
} as const;

export const ptStay = {
  hand: 'Menginap',
  titleA: 'Pilih kategori',
  titleI: 'akomodasi',
  text: 'Ceritakan preferensi menginap di formulir, atau serahkan ke tim. Nama akomodasi terpilih tercantum di proposal.',
  scrollLabel: 'Kategori akomodasi',
  items: [
    {
      k: 'Kategori A',
      title: 'Homestay',
      text: 'Hangat, sederhana, dan dekat dengan warga.',
      fit: 'Cocok untuk perjalanan yang santai.',
      foto: 'ubud-pendopo-sawah',
      alt: 'Pendopo kayu berkabut di tepi sawah berundak',
    },
    {
      k: 'Kategori B',
      title: 'Hotel bintang 3 sampai 4',
      text: 'Fasilitas lengkap dan nyaman, pilihan seimbang untuk keluarga.',
      fit: 'Cocok untuk keluarga dengan anak.',
      foto: 'hotel-heritage-teras',
      alt: 'Teras hotel bergaya heritage dengan kursi rotan dan tanaman hijau',
    },
    {
      k: 'Kategori C',
      title: 'Vila atau resort',
      text: 'Privasi lebih besar dan suasana istimewa untuk momen spesial.',
      fit: 'Cocok untuk perayaan keluarga.',
      foto: 'cemara-lodge-eksterior',
      alt: 'Vila kayu berlampu hangat di tengah hutan pegunungan saat senja',
    },
  ],
} as const;

export const ptCompare = {
  eyebrow: 'Bingung memilih?',
  titleA: 'Open Trip atau',
  titleI: 'Private Trip',
  caption: 'Perbandingan Open Trip dan Private Trip',
  head: ['', 'Open Trip', 'Private Trip'],
  rows: [
    { k: 'Jadwal', a: 'Terjadwal', b: 'Fleksibel' },
    { k: 'Peserta', a: 'Gabungan', b: 'Individu atau kelompok' },
    { k: 'Itinerary', a: 'Tetap', b: 'Dapat disesuaikan' },
    { k: 'Harga', a: 'Per orang, terlihat di halaman', b: 'Lewat proposal' },
    { k: 'Booking', a: 'Direct Booking', b: 'Request a Quote' },
  ],
  cta: { label: 'Lihat jadwal Open Trip', href: '/trips' } satisfies PtLink,
} as const;

/**
 * Testimoni CONTOH (bukan ulasan asli). Nama dan trip tetap placeholder; ulasan asli hanya dari peserta yang
 * tercatat berangkat (sama seperti bagian testimoni di Tentang Kami).
 */
export const ptTestimonial = {
  titleA: 'Kata',
  titleI: 'keluarga',
  titleB: 'yang berangkat',
  quote:
    'Kami datang membawa keinginan yang berantakan. Tim Arunika menatanya menjadi perjalanan yang pas untuk anak-anak dan orang tua kami.',
  by: '[Nama keluarga], [Trip] · [Bulan tahun]',
  note: 'Ulasan terverifikasi (contoh). Contoh teks. Ulasan asli hanya dari peserta yang tercatat berangkat.',
  foto: 'wonosobo-keluarga-teh',
  alt: 'Satu keluarga berjalan di antara kebun teh berkabut',
} as const;

export const ptFaq = {
  eyebrow: 'FAQ',
  titleA: 'Sebelum Anda',
  titleI: 'mengirim',
  titleB: 'permintaan',
  items: [
    {
      q: 'Informasi apa yang perlu saya siapkan?',
      a: 'Perkiraan tujuan (boleh kosong), tanggal dan durasi, jumlah peserta (dewasa dan anak), kisaran anggaran, dan cerita perjalanan yang Anda bayangkan. Anggaran dan cerita bersifat opsional. Lalu nama dan email Anda untuk proposal. Sisanya kami bantu lengkapi.',
    },
    {
      q: 'Berapa lama proposal dikirim?',
      a: 'Estimasi: [estimasi dari klien]. Anda diberi tahu lewat email atau WhatsApp [dikonfirmasi klien] dan dapat mengecek status dengan nomor permintaan.',
    },
    {
      q: 'Apakah mengirim permintaan berarti saya harus membayar?',
      a: 'Tidak. Permintaan berstatus Pending Review. Booking dan pembayaran baru dilanjutkan setelah Anda menyetujui proposal.',
    },
    {
      q: 'Bagaimana kalau saya ingin mengubah isi proposal?',
      a: 'Minta revisi dari halaman proposal sebelum menyetujui. Tim menyesuaikan itinerary, akomodasi, dan harga.',
    },
  ],
} as const;

export const ptCta = {
  titleA: 'Ceritakan',
  titleI: 'perjalananmu',
  text: 'Kirim kebutuhan Anda hari ini. Permintaan Anda mendapat nomor permintaan, dan proposal dikirim dalam [estimasi dari klien].',
  primary: { label: 'Request a Quote', href: ptRequestHref } satisfies PtLink,
  /** Nomor WhatsApp belum ada, jadi tautan menuju kanal di halaman Kontak (sama seperti Tentang Kami). */
  secondary: { label: 'Atau tanya via WhatsApp', href: '/contact#jalur' } satisfies PtLink,
  foto: 'senja-perahu-tenang',
  alt: 'Perahu kecil di laut tenang saat senja',
} as const;

/** Bilah aksi lekat di bawah layar (mobile saja). */
export const ptSticky = {
  primary: { label: 'Kirim permintaan penawaran', href: ptRequestHref } satisfies PtLink,
  secondary: { label: 'Tanya via WhatsApp', href: '/contact#jalur' } satisfies PtLink,
} as const;

export const ptMeta = {
  title: 'Private Trip | Arunika Journey',
  description:
    'Private Trip Arunika Journey: perjalanan privat untuk keluarga atau kelompok dengan itinerary fleksibel. Kirim permintaan penawaran, tanpa pembayaran sebelum proposal Anda setujui.',
} as const;
