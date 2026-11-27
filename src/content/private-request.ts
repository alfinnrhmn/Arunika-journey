/**
 * Isi alur Request a Quote Private Trip (/private-trip/request, dua langkah) dan pratinjau Konfirmasi.
 *
 * SEMENTARA: berbentuk data statis. Opsi isian diambil dari frame Doop "Request a Quote" (varian Red Dot style).
 * Isian yang belum diketahui tetap berupa placeholder (`[diisi klien]`, `[ditentukan klien]`, ...) dan JANGAN
 * diganti karangan: nilai nyata datang dari klien. Belum ada backend penerima permintaan, jadi tidak ada teks
 * di sini yang boleh menyiratkan permintaan sudah terkirim atau tersimpan.
 */

export interface Option {
  value: string;
  label: string;
}

/** Saran destinasi (kolom "Ke mana Anda ingin pergi?"). `region` hanya info tambahan. */
export const destinations: { name: string; region: string }[] = [
  { name: 'Bromo', region: 'Jawa Timur' },
  { name: 'Malang', region: 'Jawa Timur' },
  { name: 'Ijen', region: 'Jawa Timur' },
  { name: 'Dieng', region: 'Jawa Tengah' },
  { name: 'Borobudur', region: 'Jawa Tengah' },
  { name: 'Yogyakarta', region: 'DI Yogyakarta' },
  { name: 'Karimunjawa', region: 'Jawa Tengah' },
];

/** Urutan saran yang tampil sebagai chip (frame mobile: Yogyakarta, Bromo, Dieng, Karimunjawa, Ijen). */
export const suggestedDestinations = ['Yogyakarta', 'Bromo', 'Dieng', 'Karimunjawa', 'Ijen'];

/** Pilihan khusus: mengosongkan pilihan lain. */
export const unsureDestination = 'Belum tahu, bantu saya memilih';

export const durations: Option[] = [
  { value: '1', label: '1 hari' },
  { value: '2', label: '2 hari 1 malam' },
  { value: '3', label: '3 hari 2 malam' },
  { value: '4', label: '4 hari 3 malam' },
  { value: '5', label: '5 hari 4 malam' },
  { value: '6', label: '6 hari atau lebih' },
];

/** Kisaran anggaran: rentang rupiah dan dasar hitungnya masih ditentukan klien. */
export const budgets: Option[] = [
  { value: 'belum-tahu', label: 'Belum tahu' },
  { value: 'kisaran-1', label: 'Kisaran 1 [ditentukan klien]' },
  { value: 'kisaran-2', label: 'Kisaran 2 [ditentukan klien]' },
  { value: 'kisaran-3', label: 'Kisaran 3 [ditentukan klien]' },
];

export const sources: Option[] = [
  { value: 'pencarian', label: 'Pencarian di internet' },
  { value: 'sosial-media', label: 'Instagram atau media sosial' },
  { value: 'rekomendasi', label: 'Rekomendasi teman atau keluarga' },
  { value: 'journal', label: 'Artikel Journal' },
  { value: 'lainnya', label: 'Lainnya' },
];

/** Batas stepper peserta (hanya untuk tampilan; keputusan akhir kelak di server). */
export const partyLimits = { adultMin: 1, adultMax: 20, childMin: 0, childMax: 20 } as const;

export const storyMax = 1500;

/** Pesan galat validasi (teks siap tampil). */
export const errors = {
  tanggal: 'Pilih perkiraan tanggal berangkat.',
  tanggalLampau: 'Tanggal berangkat tidak boleh sudah lewat.',
  tanggalFormat:
    'Tanggal belum valid. Pilih dari kalender atau isi dengan format tahun-bulan-tanggal.',
  durasi: 'Pilih lama perjalanan.',
  dewasa: 'Minimal 1 peserta dewasa.',
  peserta: 'Jumlah peserta belum valid.',
  cerita: 'Cerita terlalu panjang. Ringkas hingga 1.500 karakter.',
  nama: 'Isi nama lengkap Anda.',
  namaPendek: 'Nama terlalu pendek. Isi nama lengkap.',
  email: 'Isi alamat email Anda.',
  emailFormat: 'Alamat email belum valid. Contoh: nama@email.com.',
  email2: 'Ketik ulang email Anda.',
  email2Beda: 'Email belum sama dengan yang di atas.',
  telepon: 'Nomor belum valid. Contoh: 812 3456 7890 (tanpa 0 di depan).',
} as const;

export const meta = {
  title: 'Request a Quote Private Trip | Arunika Journey',
  description:
    'Ceritakan perjalanan yang Anda bayangkan untuk Private Trip Arunika Journey: tujuan, waktu, jumlah peserta, dan anggaran. Dua langkah singkat, tanpa pembayaran.',
};

export const step1 = {
  eyebrow: 'Request a Quote untuk Private Trip',
  /** Judul hero (desktop) dan judul mobile sama pada langkah ini. */
  titleA: 'Rencanakan',
  titleI: 'perjalanan',
  titleB: 'Anda',
  hand: 'Private Trip',
  tab: '1. Perjalanan Anda',
  progress: 'Langkah 1 dari 2 · Perjalanan Anda',
  heading: { a: 'Perjalanan', i: 'Anda' },
  lead: 'Isi sebisa Anda. Bagian yang masih kosong kami bantu lengkapi.',
  fillTime: 'Perkiraan waktu mengisi: 4 menit. Belum ada pembayaran.',
  destination: {
    q: 'Ke mana Anda ingin pergi?',
    placeholder: 'Cari destinasi, kota, atau tempat',
    add: 'Tambahkan',
    hint: 'Boleh dikosongkan, dan boleh memilih lebih dari satu. Jika belum yakin, tulis atau pilih "Belum tahu" dan ceritakan ide Anda di kolom paling bawah.',
    popular: 'Populer:',
  },
  date: {
    q: 'Kapan Anda ingin berangkat?',
    sub: 'Tanggal berangkat',
    hint: 'Perkiraan tanggal, bisa diubah nanti.',
    flexible: 'Tanggal saya fleksibel',
  },
  duration: { q: 'Berapa lama Anda ingin pergi?', placeholder: 'Silakan pilih' },
  party: {
    q: 'Berapa orang yang berangkat?',
    adult: { label: 'Dewasa', sub: 'Peserta dewasa' },
    child: { label: 'Anak', sub: 'Batas usia: [ditentukan klien]' },
    hint: 'Jumlah peserta mempengaruhi kendaraan dan akomodasi.',
  },
  budget: {
    q: 'Berapa kisaran anggaran Anda?',
    placeholder: 'Silakan pilih',
    hint: 'Dalam rupiah (IDR), sebagai panduan untuk tim, bukan harga. Harga final datang lewat proposal. Basis hitung (per orang atau per rombongan): [dikonfirmasi klien].',
  },
  story: {
    q: 'Ceritakan perjalanan yang Anda bayangkan',
    placeholder:
      'Misalnya: suasana yang dicari, aktivitas yang ingin dicoba, preferensi menginap, atau hal yang perlu kami perhatikan.',
    hint: 'Semakin lengkap, semakin tepat proposal kami.',
  },
  note: 'Belum ada pembayaran pada tahap ini.',
  next: 'Lanjut ke Data Anda',
  nextShort: 'Lanjut',
  priceInfo: {
    title: 'Harga lewat proposal.',
    text: 'Harga final dikirim dalam proposal, dalam [estimasi dari klien]. Anda tidak membayar apa pun sebelum menyetujuinya.',
  },
  help: {
    title: 'Cerita hidup Anda tidak menulis dirinya sendiri, jadi biarkan kami',
    titleI: 'membantu',
    text: 'Lebih nyaman bertanya dulu? Hubungi kami lewat WhatsApp sebelum mengisi form.',
    wa: 'WhatsApp [nomor: diisi klien]',
    waLabel: 'WhatsApp',
    contact: 'Atau lewat halaman Kontak',
  },
  prepare: {
    title: 'Yang perlu disiapkan',
    items: [
      'Perkiraan tujuan (boleh kosong)',
      'Perkiraan tanggal dan durasi',
      'Jumlah peserta (dewasa dan anak)',
      'Kisaran anggaran dan ide perjalanan (opsional)',
      'Nama dan email untuk proposal',
    ],
    time: 'Perkiraan waktu mengisi: 4 menit',
  },
  trust: ['Rating peserta: [diisi klien]', 'Legalitas usaha: [diisi klien]'],
};

export const step2 = {
  eyebrow: 'Langkah 2 dari 2',
  titleA: 'Data',
  titleI: 'Anda',
  hand: 'Hampir selesai',
  tab: '2. Data Anda',
  progress: 'Langkah 2 dari 2 · Data Anda',
  heading: { a: 'Siapa yang kami', i: 'hubungi' },
  lead: 'Kami memakai data ini hanya untuk membalas permintaan Anda dan mengirim proposal.',
  name: { q: 'Nama lengkap', placeholder: 'Nama sesuai identitas' },
  email: { q: 'Email', placeholder: 'nama@email.com' },
  email2: {
    q: 'Konfirmasi email',
    placeholder: 'Ketik ulang email Anda',
    hint: 'Pastikan sama dengan email di atas agar proposal sampai ke Anda.',
    ok: 'Email sudah sama.',
  },
  phone: {
    q: 'Nomor telepon atau WhatsApp',
    prefix: '+62',
    placeholder: '812 3456 7890',
    hint: 'Untuk menghubungi Anda bila ada yang perlu diklarifikasi. Kanal balasan: [dikonfirmasi klien].',
  },
  source: { q: 'Dari mana Anda mengenal Arunika?', placeholder: 'Silakan pilih' },
  back: 'Kembali ke Perjalanan Anda',
  note: 'Tidak ada pembayaran pada tahap ini.',
  privacyLead: 'Data Anda diperlakukan sesuai',
  privacyLink: 'Kebijakan Privasi',
  privacyHref: '/legal/kebijakan-privasi',
  summary: {
    title: 'Ringkasan perjalanan',
    sub: 'Dari isian langkah 1',
    edit: 'Ubah isian',
    editShort: 'Ubah',
    empty: 'Isian langkah 1 belum terbaca. Aktifkan JavaScript atau kembali ke langkah 1.',
    rows: { tujuan: 'Tujuan', waktu: 'Waktu', durasi: 'Durasi', peserta: 'Peserta' },
    blank: 'Belum diisi',
  },
  after: {
    title: 'Setelah permintaan',
    titleI: 'terkirim',
    text: 'Setelah terkirim, permintaan mendapat nomor permintaan dan berstatus Pending Review. Proposal dikirim dalam [estimasi dari klien]. Anda tidak membayar apa pun sebelum menyetujuinya.',
  },
};

/**
 * Pengganti tombol "Kirim permintaan". Belum ada backend penerima permintaan (dibangun di tahap BE), jadi tidak
 * ada tombol yang tampak mengirim. Sambungan nanti: ganti blok ini dengan tombol submit yang memanggil endpoint
 * permintaan (lihat komentar di RequestStep2.astro dan request.client.ts).
 */
export const finalNote = {
  title: 'Pengiriman permintaan online segera dibuka.',
  text: 'Sementara itu hubungi kami lewat halaman Kontak.',
  cta: 'Buka halaman Kontak',
  href: '/contact',
};

export const appBar = {
  title: 'Request a Quote',
  back: 'Kembali',
  wa: 'WhatsApp',
  contact: 'Kontak',
};

/** Konfirmasi (hanya pratinjau pengembangan). Seluruh nilai di bawah adalah DATA CONTOH dari frame. */
export const confirm = {
  devBanner:
    'Pratinjau pengembangan: halaman ini tidak tampil di produksi, dan data di bawah hanyalah contoh dari desain, bukan permintaan yang terkirim.',
  hand: 'Terima kasih',
  titleA: 'Permintaan Anda',
  titleI: 'sudah kami terima',
  lead: 'Tim kami meninjau kebutuhan Anda, lalu mengirim proposal lewat email Anda. Anda belum membayar apa pun pada tahap ini.',
  code: { label: 'Nomor permintaan (contoh)', value: 'RQ-2611-0042', badge: 'Pending Review' },
  sent: 'Dikirim Sen, 23 Nov 2026. Salinan ringkasan dikirim ke email Anda.',
  eta: {
    eyebrow: 'Perkiraan respons',
    title: 'Proposal dikirim dalam [ditentukan klien]',
    text: 'Kami menghubungi Anda lewat email atau WhatsApp bila perlu klarifikasi.',
  },
  next: {
    eyebrow: 'Langkah berikutnya',
    titleA: 'Apa yang',
    titleI: 'terjadi',
    titleB: 'sekarang',
  },
  /** Linimasa lengkap (tablet/mobile). Desktop memakai tiga langkah terakhir bernomor 01 sampai 03. */
  timeline: [
    {
      state: 'done',
      tag: 'Selesai, 23 Nov 2026',
      title: 'Permintaan diterima',
      text: 'Nomor permintaan Anda sudah terbit dan tersimpan.',
    },
    {
      state: 'now',
      tag: 'Sedang berlangsung',
      title: 'Admin meninjau',
      text: 'Status Pending Review. Admin bisa menghubungi Anda untuk klarifikasi.',
    },
    {
      state: 'next',
      tag: 'Estimasi: [ditentukan klien]',
      title: 'Proposal dikirim',
      text: 'Itinerary, fasilitas, dan harga final disusun khusus untuk Anda.',
    },
    {
      state: 'next',
      tag: 'Setelah proposal diterima',
      title: 'Anda memutuskan',
      text: 'Setujui proposal atau minta revisi. Pembayaran baru dilanjutkan setelah Anda menyetujui.',
    },
  ] as { state: 'done' | 'now' | 'next'; tag: string; title: string; text: string }[],
  summary: {
    eyebrow: 'Yang Anda kirim',
    titleA: 'Ringkasan',
    titleI: 'isian',
    sub: 'Data contoh. Isian ini yang akan dibaca admin.',
    rows: [
      ['Tujuan', 'Yogyakarta'],
      ['Waktu', 'Januari 2027 (fleksibel)'],
      ['Durasi', '4 hari 3 malam'],
      ['Peserta', '2 dewasa, 2 anak'],
      ['Anggaran', 'Dikosongkan'],
      ['Nama', '[Nama peserta]'],
      ['Email', '[email peserta]'],
    ] as [string, string][],
  },
  actions: {
    status: 'Cek status permintaan',
    statusHref: '/cek-status',
    contact: 'Hubungi kami',
    home: 'Kembali ke beranda',
    keep: 'Simpan nomor permintaan Anda.',
  },
};
