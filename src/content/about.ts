/**
 * Isi halaman Tentang Kami (/about) dan Kontak (/contact).
 *
 * SEMENTARA: berbentuk data statis; nanti diganti data dari server/CMS (profil perusahaan, tim, ulasan,
 * kanal kontak). Teks diambil apa adanya dari rancangan Doop. Isian yang belum diketahui tetap berupa
 * placeholder (`[diisi klien]`, `[Nama]`, ...) dan JANGAN diganti karangan: nilai nyata datang dari klien.
 * `foto` adalah nama berkas di public/foto (tanpa .webp).
 */

export interface AboutLink {
  label: string;
  href: string;
}

export interface AboutPoint {
  title: string;
  text: string;
}

export const aboutHero = {
  eyebrow: 'Tentang kami',
  /** Bagian miring (<i>) judul. */
  titleA: 'Perjalanan yang terasa seperti',
  titleI: 'milik Anda',
  foto: 'dieng-teras-kabut',
  alt: 'Lereng perbukitan Dieng berselimut kabut tipis',
} as const;

/** Tab anchor di bawah hero (hanya desktop). `id` = id bagian di halaman. */
export const aboutTabs: { label: string; id: string }[] = [
  { label: 'Cerita Kami', id: 'cerita' },
  { label: 'Filosofi', id: 'filosofi' },
  { label: 'Tim', id: 'tim' },
  { label: 'Pengalaman', id: 'pengalaman' },
  { label: 'Legalitas', id: 'legalitas' },
  { label: 'Dokumentasi', id: 'dokumentasi' },
  { label: 'Testimoni', id: 'testimoni' },
];

export const aboutIntro = {
  eyebrow: 'Mengapa memilih Arunika',
  lead: 'Perjalanan domestik yang personal, terorganisir, dan jujur sejak awal.',
  body: 'Arunika Journey menawarkan dua layanan: Open Trip dengan jadwal dan harga per orang yang sudah ditentukan, dan Private Trip yang dirancang sesuai kebutuhan Anda. Prinsipnya satu: Anda berhak tahu harga, jadwal, fasilitas, dan ketentuan sebelum mengambil keputusan. Tidak perlu menebak, tidak perlu bertanya berulang kali.',
  cta: { label: 'Lihat jadwal Open Trip', href: '/trips' },
} as const;

export const aboutStrip = {
  title: 'Jadi, siap mulai?',
  text: 'Tanyakan jadwal, harga, atau Private Trip langsung ke tim kami',
  /** Nomor WhatsApp belum ada, jadi tombol menuju kanal di halaman Kontak. */
  cta: { label: 'Tanya via WhatsApp', href: '/contact#jalur' },
} as const;

export const aboutStory = [
  {
    id: 'cerita',
    hand: 'Cerita kami',
    titleA: 'Dari cahaya',
    titleI: 'fajar',
    text: 'Arunika berarti cahaya matahari terbit. Kami memulainya dari keyakinan sederhana bahwa perjalanan domestik bisa terasa personal, terorganisir, dan tidak seperti tur massal. Sebagian besar pelanggan kami datang lewat Instagram, TikTok, dan rekomendasi teman, dan selama ini harga, jadwal, serta booking harus lewat chat admin. Website ini kami bangun supaya informasi yang dulu hanya bisa ditanyakan lewat chat kini bisa dilihat siapa saja.',
    cta: { label: 'Baca ceritanya', href: '/journal' },
    foto: 'hotel-heritage-teras',
    alt: 'Perempuan berdiri di teras hotel heritage yang hangat',
  },
  {
    id: 'filosofi',
    hand: 'Filosofi kami',
    titleA: 'Informasi sebelum',
    titleI: 'komitmen',
    text: 'Kami percaya pengalaman datang sebelum dekorasi, dan informasi datang sebelum komitmen. Karena itu setiap trip menampilkan harga per orang, rincian total dan DP, jadwal, kuota, fasilitas, serta kebijakan batal di muka. Dua layanan, dua alur: Open Trip untuk bergabung di jadwal yang pasti, dan Private Trip untuk rute yang disusun khusus untuk Anda.',
    cta: { label: 'Lihat panduan booking', href: '/help#panduan' },
    foto: 'kubis-embun',
    alt: 'Butir embun pagi di daun kubis dari dekat',
  },
] as const;

export const aboutValues = {
  eyebrow: 'Nilai yang kami pegang',
  titleA: 'Empat janji untuk',
  titleI: 'setiap',
  titleB: 'perjalanan',
  items: [
    {
      title: 'Transparan',
      text: 'Harga per orang, biaya tambahan, dan DP terlihat sebelum Anda membayar.',
    },
    {
      title: 'Terorganisir',
      text: 'Jadwal, kuota, itinerary, dan titik kumpul jelas, dan kuota divalidasi sebelum pembayaran.',
    },
    {
      title: 'Personal',
      text: 'Private Trip disusun dari kebutuhan Anda, bukan dari paket yang kaku.',
    },
    {
      title: 'Terbukti',
      text: 'Dokumentasi trip asli, ulasan terverifikasi, dan legalitas yang bisa Anda periksa.',
    },
  ] satisfies AboutPoint[],
} as const;

export const aboutTeam = {
  hand: 'Orang di balik Arunika',
  titleA: 'Kenali tim',
  titleI: 'Arunika',
  text: 'Profil tim membantu Anda tahu siapa yang menyusun dan mendampingi perjalanan Anda.',
  /** Foto, nama, dan jabatan diisi klien. `tone` memilih warna latar placeholder. */
  members: [
    { name: '[Nama]', role: '[Jabatan]', tone: 'a' },
    { name: '[Nama]', role: '[Jabatan]', tone: 'b' },
    { name: '[Nama]', role: '[Jabatan]', tone: 'c' },
    { name: '[Nama]', role: '[Jabatan]', tone: 'a' },
    { name: '[Nama]', role: '[Jabatan]', tone: 'b' },
    { name: '[Nama]', role: '[Jabatan]', tone: 'c' },
  ],
  note: 'Foto, nama, dan jabatan tim diisi oleh klien. Ilustrasi di atas adalah placeholder.',
  noteMobile:
    'Geser untuk melihat semua. Foto, nama, dan jabatan tim diisi oleh klien. Ilustrasi di atas adalah placeholder.',
} as const;

export const aboutExperiences = {
  titleA: 'Pengalaman di',
  titleI: 'perjalanan',
  titleB: 'kami',
  text: 'Contoh pengalaman di trip Arunika. Detail dan ketersediaan ada di halaman tiap trip.',
  items: [
    {
      title: 'Sunrise di Penanjakan',
      text: 'Berangkat dini hari dengan jip 4×4 dan tiba tepat saat langit berubah warna di atas lautan kabut.',
      foto: 'penanjakan-sunrise-grup',
      alt: 'Rombongan menyaksikan fajar di Penanjakan',
    },
    {
      title: 'Sarapan di homestay lereng gunung',
      text: 'Duduk bersama pemilik rumah, mencicipi masakan lokal dari bahan kebun sendiri sambil mendengar ceritanya.',
      foto: 'sarapan-teras',
      alt: 'Sarapan di teras homestay',
    },
    {
      title: 'Menelusuri situs bersejarah bersama pemandu',
      text: 'Pemandu lokal menjelaskan lapisan sejarah di balik candi dan bangunan tua yang kami kunjungi.',
      foto: 'prambanan-fajar',
      alt: 'Candi Prambanan saat fajar',
    },
    {
      title: 'Pulau tersembunyi dengan perahu',
      text: 'Sehari menyusuri pulau-pulau kecil dengan perahu, berenang, dan snorkeling di perairan yang jernih.',
      foto: 'pulau-udara-perahu',
      alt: 'Perahu di antara pulau-pulau kecil dilihat dari atas',
    },
  ],
  detail: { label: 'Selengkapnya', href: '/trips' },
  ask: { label: 'Tanya sekarang', href: '/contact' },
  banner: {
    text: 'Punya pertanyaan sebelum booking? Tanya tim kami via WhatsApp',
    cta: { label: 'Tanya via WhatsApp', href: '/contact#jalur' },
  },
} as const;

export const aboutLegal = {
  eyebrow: 'Legalitas dan perlindungan',
  titleA: 'Yang menjaga',
  titleI: 'perjalanan',
  titleB: 'Anda',
  items: [
    {
      icon: 'shield',
      title: 'Legalitas usaha',
      text: 'Nomor izin usaha dan profil perusahaan dapat diperiksa. Izin: [diisi klien].',
    },
    {
      icon: 'file',
      title: 'Kebijakan batal dan refund',
      text: 'Tertulis jelas sebelum DP dibayar. Persentase refund: [diisi klien].',
    },
    {
      icon: 'pin',
      title: 'Informasi keselamatan',
      text: 'Titik kumpul dan informasi keselamatan tercantum di halaman setiap trip.',
    },
    {
      icon: 'check',
      title: 'Status booking yang jelas',
      text: 'Pending Payment dan Confirmed dibedakan, dan konfirmasi memuat detail trip.',
    },
  ],
  cta: { label: 'Lihat semua kebijakan', href: '/legal/syarat-ketentuan' },
} as const;

export const aboutDocs = {
  id: 'dokumentasi',
  hand: 'Bukti nyata',
  titleA: 'Dokumentasi trip',
  titleI: 'asli',
  note: 'Contoh tata letak. Foto asli dari tim dan peserta: [diisi klien].',
  caption: '[Trip] · [Bulan tahun]',
  items: [
    { foto: 'jembatan-kayu-mangrove', alt: 'Dokumentasi 1: jembatan kayu di hutan mangrove' },
    { foto: 'jogja-gerbang-bata', alt: 'Dokumentasi 2: gerbang bata tua di Yogyakarta' },
    { foto: 'potret-perempuan-tenun', alt: 'Dokumentasi 3: potret perempuan penenun' },
    { foto: 'dermaga-senja-tiga-orang', alt: 'Dokumentasi 4: tiga orang di dermaga saat senja' },
  ],
} as const;

export const aboutFaq = {
  eyebrow: 'FAQ',
  titleA: 'Semua yang perlu Anda tahu tentang',
  titleI: 'bepergian',
  titleB: 'bersama Arunika',
  items: [
    {
      q: 'Apa bedanya Open Trip dan Private Trip?',
      a: 'Open Trip: jadwal dan destinasi ditentukan Arunika, biaya per orang, Anda bergabung dengan peserta lain dan bisa Direct Booking di website. Private Trip: jadwal fleksibel dan itinerary dapat disesuaikan; kirim kebutuhan lewat Request a Quote, lalu terima proposal dengan harga final.',
    },
    {
      q: 'Bagaimana cara booking Open Trip?',
      a: 'Pilih jadwal dan peserta, isi data pemesan dan peserta, cek ringkasan dan rincian harga, lalu bayar DP. Status Pending Payment menjadi Confirmed setelah pembayaran terverifikasi. Anda bisa memantau lewat Cek Status Booking.',
    },
    {
      q: 'Apakah harga sudah termasuk semuanya?',
      a: 'Harga dihitung per orang. Fasilitas dan eksklusi tertulis di halaman trip; total, DP, dan biaya tambahan (bila ada: [diisi klien]) terlihat sebelum Anda membayar.',
    },
    {
      q: 'Bagaimana jika trip dibatalkan atau saya perlu mengubah jadwal?',
      a: 'Kebijakan batal dan refund tertulis di halaman trip sebelum Anda membayar DP. Ketentuan dan persentase: [diisi klien].',
    },
    {
      q: 'Siapa yang akan mendampingi saya selama perjalanan?',
      a: 'Profil tim dan pendamping perjalanan: [diisi klien]. Titik kumpul dan informasi keselamatan ada di halaman setiap trip.',
    },
    {
      q: 'Apakah pembayaran dan data saya aman?',
      a: 'Metode pembayaran: [dikonfirmasi klien]. Pengelolaan data pribadi dijelaskan di Kebijakan Privasi.',
    },
  ],
} as const;

export const aboutTestimonials = {
  id: 'testimoni',
  eyebrow: 'Testimoni terverifikasi (contoh)',
  items: [
    {
      text: 'Semua jelas dari awal: harga, jadwal, dan apa yang termasuk. Tidak ada kejutan di hari keberangkatan.',
      by: '[Nama peserta], [Trip] · [Bulan tahun]',
    },
    {
      text: 'Saya bisa cek sisa kursi dan bayar DP sendiri tanpa chat admin. Sesederhana itu.',
      by: '[Nama peserta], [Trip] · [Bulan tahun]',
    },
    {
      text: 'Pemandunya sabar dan tahu banyak cerita. Foto di website sama persis dengan yang kami alami.',
      by: '[Nama peserta], [Trip] · [Bulan tahun]',
    },
    {
      text: 'Tim Arunika menyusun semuanya dengan sabar sehingga kami bisa menikmati perjalanan tanpa rasa was-was.',
      by: '[Nama keluarga], Private Trip · [Bulan tahun]',
    },
  ],
  rating: 'Ulasan terverifikasi (contoh) · Rating rata-rata: [diisi klien]',
  note: 'Contoh teks. Ulasan asli hanya dari peserta yang tercatat berangkat.',
} as const;

export const aboutInspiration = {
  titleA: 'Butuh',
  titleI: 'inspirasi',
  titleB: '?',
  /** Artikel Journal (halaman Journal dikerjakan terpisah); tautan ke indeks /journal. */
  items: [
    {
      tag: 'Panduan | Jawa',
      title: 'Liburan keluarga yang ramah anak di Jawa',
      text: 'Tips memilih trip, penginapan, dan ritme perjalanan agar si kecil tetap nyaman dan seluruh keluarga menikmati…',
      foto: 'anak-muda-jogja',
      alt: 'Perempuan muda duduk di tepi sumur berundak',
    },
    {
      tag: 'Panduan | Karimunjawa',
      title: 'Kapan waktu terbaik ke Karimunjawa',
      text: 'Cuaca, ombak, dan musim terbaik untuk snorkeling serta pengamatan satwa liar di sekitar pulau…',
      foto: 'baluran-rusa',
      alt: 'Rusa di padang savana',
    },
    {
      tag: 'Panduan | Yogyakarta',
      title: 'Lima situs kuno terbaik di Jawa',
      text: 'Dari candi megah hingga reruntuhan yang sepi, berikut situs yang layak masuk daftar perjalanan Anda…',
      foto: 'borobudur-sunrise',
      alt: 'Candi Borobudur saat matahari terbit',
    },
  ],
  href: '/journal',
} as const;

export const aboutCta = {
  titleA: 'Pilih',
  titleI: 'perjalanan Anda',
  text: 'Lihat jadwal dan kuota Open Trip, atau kirim Request a Quote untuk Private Trip.',
  primary: { label: 'Lihat jadwal Open Trip', href: '/trips' },
  secondary: { label: 'Atau Request a Quote untuk Private Trip', href: '/private-trip' },
  foto: 'jip-4x4-bromo',
  alt: 'Jip 4×4 di punggung bukit Bromo saat fajar',
} as const;

/* ---------------------------------------------------------------- Kontak */

export const contactHero = {
  hand: 'Hubungi kami',
  titleA: 'Ada yang ingin Anda',
  titleI: 'tanyakan?',
  text: 'Tim kami membalas langsung, bukan bot. Ceritakan rencana Anda atau kendala yang sedang dihadapi, dan kami bantu dari sana.',
} as const;

/** Kanal kontak. Nilai `[…: diisi klien]` adalah placeholder; email dari footer situs. */
export const contactChannels = {
  eyebrow: 'Jalur langsung',
  titleA: 'Pilih cara yang',
  titleI: 'paling nyaman',
  items: [
    {
      icon: 'chat',
      key: 'WhatsApp',
      value: '[nomor: diisi klien]',
      text: 'Jalur tercepat untuk pertanyaan jadwal, kuota, dan kendala pembayaran.',
    },
    {
      icon: 'file',
      key: 'Email',
      value: 'halo@arunikajourney.id',
      text: 'Cocok untuk permintaan yang butuh lampiran atau dokumen.',
    },
    {
      icon: 'clock',
      key: 'Jam layanan',
      value: '[hari dan jam: diisi klien]',
      text: 'Pesan di luar jam layanan dibalas pada hari kerja berikutnya.',
    },
    {
      icon: 'pin',
      key: 'Kantor',
      value: '[alamat: diisi klien]',
      text: 'Kunjungan ke kantor dengan janji temu lebih dulu.',
    },
  ],
} as const;

/** Tampil di tempat formulir sampai penanganan server siap. */
export const contactFormSoon = {
  eyebrow: 'Kirim pesan',
  titleA: 'Tulis',
  titleI: 'kepada kami',
  note: 'Formulir segera tersedia, hubungi kami lewat kanal di samping.',
  noteMobile: 'Formulir segera tersedia, hubungi kami lewat kanal di atas.',
} as const;

export const contactForm = {
  topicLabel: 'Soal apa?',
  topics: ['Open Trip', 'Private Trip', 'Pembayaran', 'Booking saya', 'Lainnya'],
  name: { label: 'Nama', placeholder: 'Nama lengkap' },
  email: { label: 'Email', placeholder: 'nama@email.com' },
  whatsapp: { label: 'WhatsApp', hint: '(opsional)', placeholder: '+62 ...' },
  code: { label: 'Kode booking', hint: '(opsional)', placeholder: 'ARJ-2611-0187' },
  message: {
    label: 'Pesan Anda',
    placeholder: 'Ceritakan pertanyaan atau rencana perjalanan Anda',
  },
  note: 'Kami membalas dalam [waktu respons: diisi klien]. Data Anda hanya dipakai untuk menjawab pesan ini.',
  submit: 'Kirim pesan',
} as const;

export const contactRoutes = {
  eyebrow: 'Atau langsung ke tujuan',
  titleA: 'Mungkin ini yang',
  titleI: 'Anda cari',
  items: [
    {
      eyebrow: 'Open Trip',
      title: 'Pesan kursi di jadwal yang sudah ada',
      text: 'Pilih tanggal, cek kuota, dan bayar DP langsung tanpa menunggu balasan.',
      cta: { label: 'Lihat jadwal', href: '/trips' },
    },
    {
      eyebrow: 'Private Trip',
      title: 'Rancang perjalanan khusus untuk Anda',
      text: 'Kirim Request a Quote, tim kami menyiapkan proposal sesuai tanggal dan anggaran Anda.',
      cta: { label: 'Request a Quote', href: '/private-trip' },
    },
    {
      eyebrow: 'Sudah memesan',
      title: 'Cek status booking atau permintaan',
      text: 'Masukkan kode booking atau nomor permintaan beserta email, tanpa perlu masuk akun.',
      cta: { label: 'Cek status', href: '/cek-status' },
    },
  ],
} as const;

export const contactHelp = {
  eyebrow: 'Bantuan cepat',
  titleA: 'Pertanyaan yang',
  titleI: 'sering datang',
  text: 'Jawabannya mungkin sudah ada di Pusat Bantuan, lengkap dengan panduan booking, pembayaran, dan kebijakan refund.',
  cta: { label: 'Buka Pusat Bantuan', href: '/help' },
  /** Di rancangan hanya pertanyaan (tanpa jawaban); tiap baris menaut ke Pusat Bantuan. */
  questions: [
    'Apakah booking Open Trip langsung terkonfirmasi?',
    'Berapa DP yang harus dibayar?',
    'Bagaimana jika saya perlu mengubah jadwal?',
    'Apa bedanya Open Trip dan Private Trip?',
  ],
} as const;
