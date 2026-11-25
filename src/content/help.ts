/**
 * Isi Pusat Bantuan (/help): FAQ, panduan booking, informasi pembayaran, ringkasan refund, ringkasan S&K.
 *
 * SEMENTARA: data statis dari frame desain. Nanti diganti data dari server (CMS: tabel FAQ dan halaman
 * bantuan) tanpa mengubah komponen di `src/components/help/**`. Teks diambil apa adanya; angka contoh
 * tetap berlabel contoh dan nilai yang belum diputuskan klien tetap `[ditentukan klien]` / `[diisi klien]`.
 * JANGAN mengisi placeholder dengan karangan sendiri.
 *
 * Penanda teks dalam string (diurai aman, tanpa HTML mentah): **tebal**  *miring*  [teks](/jalur)
 */

export type FaqCategory = 'umum' | 'open' | 'private' | 'bayar';

export const faqCategories: { id: 'all' | FaqCategory; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'umum', label: 'Umum' },
  { id: 'open', label: 'Open Trip' },
  { id: 'private', label: 'Private Trip' },
  { id: 'bayar', label: 'Pembayaran' },
];

export interface FaqItem {
  category: FaqCategory;
  q: string;
  a: string;
  open?: boolean;
}

export const faqs: FaqItem[] = [
  {
    category: 'open',
    q: 'Apakah booking Open Trip langsung terkonfirmasi?',
    a: 'Belum. Setelah Anda memilih jadwal dan mengisi data, kursi dikunci sementara dan status booking menjadi Pending Payment. Booking berubah menjadi Confirmed setelah DP Anda diverifikasi oleh tim kami. Anda menerima email konfirmasi begitu verifikasi selesai.',
    open: true,
  },
  {
    category: 'bayar',
    q: 'Berapa DP yang harus dibayar?',
    a: 'Besaran DP ditampilkan di ringkasan pesanan sebelum Anda membayar, contohnya 30% dari total. Sisa pembayaran dilunasi sesuai jadwal pelunasan yang tertera pada booking Anda. Besaran dan jadwal final: [ditentukan klien].',
  },
  {
    category: 'private',
    q: 'Apa bedanya Open Trip dan Private Trip?',
    a: 'Open Trip berangkat pada jadwal tetap dan Anda bergabung dengan peserta lain, harga per orang sudah jelas dan bisa dipesan langsung. Private Trip dirancang khusus untuk rombongan Anda: tanggal, rute, dan anggaran dibicarakan lewat Request a Quote, lalu tim mengirim proposal.',
  },
  {
    category: 'private',
    q: 'Berapa lama proposal Private Trip dikirim?',
    a: 'Tim kami meninjau permintaan Anda dan mengirim proposal dalam [estimasi waktu: diisi klien]. Anda bisa memantau statusnya di halaman [Cek Status](/cek-status) dengan nomor permintaan dan email.',
  },
  {
    category: 'open',
    q: 'Bagaimana jika kuota jadwal yang saya pilih tidak cukup?',
    a: 'Kuota dicek sebelum pembayaran. Bila sisa kursi kurang dari jumlah peserta, sistem menawarkan kurangi peserta, pilih tanggal lain, atau ajukan Private Trip.',
  },
  {
    category: 'bayar',
    q: 'Metode pembayaran apa saja yang tersedia?',
    a: 'Transfer bank dan metode lain yang berlaku: [diisi klien]. Setelah membayar, unggah bukti transfer pada halaman booking agar tim dapat memverifikasi lebih cepat.',
  },
  {
    category: 'umum',
    q: 'Apakah saya perlu membuat akun untuk memesan?',
    a: 'Tidak perlu. Anda cukup mengisi data pemesan, lalu menyimpan kode booking. Status booking dapat dicek kapan saja dengan kode dan email yang sama.',
  },
  {
    category: 'umum',
    q: 'Apakah perjalanan sudah termasuk asuransi?',
    a: 'Cakupan asuransi pada setiap trip tercantum di bagian Termasuk dan Tidak termasuk pada halaman detail trip. Detail polis dan mitra asuransi: [diisi klien].',
  },
];

/** Kartu topik di bagian atas dan daftar isi halaman. `id` = jangkar bagian. */
export const helpTopics = [
  { id: 'faq', title: 'FAQ', desc: 'Jawaban cepat untuk pertanyaan umum' },
  {
    id: 'panduan',
    title: 'Panduan booking',
    desc: 'Open Trip dan Private Trip, langkah demi langkah',
  },
  { id: 'pembayaran', title: 'Informasi pembayaran', desc: 'DP, pelunasan, dan verifikasi' },
  {
    id: 'refund',
    title: 'Pembatalan dan refund',
    desc: 'Aturan ubah jadwal dan pengembalian dana',
  },
  { id: 'syarat', title: 'Syarat dan ketentuan', desc: 'Ringkasan aturan layanan' },
] as const;

export interface GuideColumn {
  badge: string;
  tone: 'ok' | 'pending';
  steps: { title: string; text: string }[];
  cta: { label: string; href: string };
}

export const guides: GuideColumn[] = [
  {
    badge: 'Open Trip · Direct Booking',
    tone: 'ok',
    steps: [
      {
        title: 'Pilih jadwal dan peserta',
        text: 'Cek tanggal, sisa kursi, dan harga per orang sebelum mengisi apa pun.',
      },
      {
        title: 'Isi data pemesan',
        text: 'Nama, kontak, dan data peserta. Tidak perlu membuat akun.',
      },
      { title: 'Bayar DP', text: 'Kuota dikunci saat pembayaran dimulai. Unggah bukti transfer.' },
      {
        title: 'Terima konfirmasi',
        text: 'Tim memverifikasi pembayaran, lalu booking berstatus Confirmed.',
      },
    ],
    cta: { label: 'Lihat jadwal', href: '/trips' },
  },
  {
    badge: 'Private Trip · Request a Quote',
    tone: 'pending',
    steps: [
      {
        title: 'Ceritakan perjalanan Anda',
        text: 'Tujuan, tanggal, jumlah orang, dan kisaran anggaran. Semua boleh dikosongkan.',
      },
      {
        title: 'Kirim data kontak',
        text: 'Anda mendapat nomor permintaan, misalnya RQ-2611-0042.',
      },
      {
        title: 'Tinjau proposal',
        text: 'Tim mengirim itinerary dan harga. Anda boleh meminta revisi.',
      },
      { title: 'Setujui dan bayar DP', text: 'Setelah disetujui, perjalanan Anda dikonfirmasi.' },
    ],
    // Halaman Request a Quote belum ada di aplikasi; tautan memakai rute yang dijadwalkan header publik.
    cta: { label: 'Request a Quote', href: '/private-trip' },
  },
];

export const paymentRows: { k: string; v: string; note: string }[] = [
  {
    k: 'Uang muka (DP)',
    v: 'Contoh 30% dari total',
    note: 'Contoh: total Rp 2.500.000, DP Rp 750.000. Besaran final per trip: [ditentukan klien].',
  },
  {
    k: 'Pelunasan',
    v: 'Sebelum keberangkatan',
    note: 'Batas pelunasan tercantum di halaman booking: [ditentukan klien].',
  },
  {
    k: 'Batas waktu DP',
    v: '[ditentukan klien] sejak booking dibuat',
    note: 'Lewat dari batas ini, kuota dilepas dan booking menjadi Expired.',
  },
  { k: 'Metode', v: 'Transfer bank', note: 'Rekening tujuan dan metode lain: [diisi klien].' },
  {
    k: 'Verifikasi',
    v: 'Manual oleh tim',
    note: 'Unggah bukti transfer. Verifikasi selesai dalam [estimasi: diisi klien] pada jam layanan.',
  },
  {
    k: 'Bukti pembayaran',
    v: 'Email dan halaman Cek Status',
    note: 'Status bergerak dari Pending Payment, Verifikasi, lalu Confirmed.',
  },
];

export const refundTable = {
  head: ['Waktu pembatalan', 'Dana kembali', 'Keterangan'],
  rows: [
    {
      when: 'H-[x] atau lebih awal',
      sub: 'sebelum tanggal berangkat',
      pct: '[x]%',
      note: 'Dikembalikan setelah dikurangi biaya admin [diisi klien].',
    },
    {
      when: 'H-[x] sampai H-[x]',
      sub: '',
      pct: '[x]%',
      note: 'DP tidak dikembalikan, kredit untuk jadwal lain berlaku [ditentukan klien].',
    },
    // Desain menulis "0%" dan "tidak ada pengembalian"; angka itu belum diputuskan klien, jadi dijadikan placeholder.
    {
      when: 'Kurang dari H-[x]',
      sub: '',
      pct: '[x]%',
      note: 'Peserta dapat diganti dengan nama lain. Ketentuan pengembalian: [ditentukan klien].',
    },
  ],
};

export const refundCards = [
  {
    title: 'Ubah jadwal',
    text: 'Pindah ke tanggal lain pada trip yang sama dimungkinkan selama kuota tersedia dan sebelum batas waktu [ditentukan klien].',
  },
  {
    title: 'Dibatalkan oleh kami',
    text: 'Bila trip batal karena cuaca, kuota minimum, atau alasan keselamatan, Anda memilih jadwal pengganti atau menerima refund penuh.',
  },
];

export const refundNote =
  'Cara mengajukan: hubungi kami dengan kode booking dan email pemesan. Proses refund memakan waktu [estimasi: diisi klien] hari kerja.';

export const terms: { title: string; text: string }[] = [
  {
    title: 'Peran Arunika Journey',
    text: 'Arunika Journey merancang dan menyelenggarakan perjalanan wisata. Legalitas dan nomor izin usaha: [diisi klien].',
  },
  {
    title: 'Booking dan konfirmasi',
    text: 'Booking dianggap sah setelah DP diverifikasi dan status berubah menjadi Confirmed.',
  },
  {
    title: 'Harga dan perubahan',
    text: 'Harga mengikuti yang tertera saat booking, dan harga yang tampil sudah termasuk PPN. Perubahan di luar kendali kami diberitahukan lebih dulu.',
  },
  {
    title: 'Tanggung jawab peserta',
    text: 'Peserta memberikan data yang benar dan mengikuti arahan pemandu demi keselamatan bersama.',
  },
  {
    title: 'Data pribadi',
    text: 'Data Anda dipakai untuk memproses booking dan tidak dijual kepada pihak lain.',
  },
];

/** Keterangan di bawah daftar bagian S&K; teks desain menyebut "akan tersedia", sekarang halamannya sudah ada. */
export const termsLead =
  'Ini ringkasan poin utama. Dokumen lengkap yang berlaku secara hukum ada di halaman Syarat dan Ketentuan serta Kebijakan Privasi.';
