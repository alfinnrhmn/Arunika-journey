/**
 * Dokumen legal (Syarat dan Ketentuan, Kebijakan Privasi, Pembatalan dan Refund, Legalitas).
 *
 * SEMENTARA: bentuk data ini meniru baris tabel `legal_documents` (slug, title, version, effectiveDate,
 * sections). Nanti diganti data dari server (CMS) tanpa mengubah komponen di `src/components/legal/**`.
 * Isi diambil apa adanya dari frame desain; bagian yang belum diputuskan klien tetap berupa
 * `[diisi klien]` / `[ditentukan klien]` dan angka contoh tetap berlabel contoh. JANGAN mengisi
 * placeholder, nomor izin, persentase refund, nama, alamat, atau tanggal dengan karangan sendiri.
 *
 * Penanda teks (diurai aman di komponen, tanpa HTML mentah):
 *   **tebal**   *miring*   [teks tautan](/jalur)
 */

export type BadgeTone = 'ok' | 'pending' | 'full' | 'default';

export type LegalBlock =
  /** Butir bernomor di dalam pasal, mis. 1.1. */
  | { type: 'clause'; no: string; text: string }
  /** Daftar status berlencana (badge + penjelasan). */
  | { type: 'statuses'; items: { badge: string; tone: BadgeTone; text: string }[] }
  /** Baris kunci-nilai (mis. rincian per kategori). */
  | { type: 'rows'; items: { k: string; v: string }[] }
  /** Tabel. `numeric`: indeks kolom yang memakai gaya angka serif. */
  | { type: 'table'; caption?: string; head: string[]; rows: string[][]; numeric?: number[] }
  /** Langkah berurutan bernomor. */
  | { type: 'steps'; items: { title: string; text: string }[] }
  /** Catatan kecil di ujung pasal. */
  | { type: 'note'; text: string }
  /** Paragraf pengantar besar (varian "rail"). */
  | { type: 'lede'; text: string }
  /** Anak judul dengan paragraf pendek. */
  | { type: 'subheading'; heading: string; text?: string }
  /** Tabel rincian label/nilai bergaris (mis. data badan usaha). */
  | { type: 'details'; title?: string; items: { k: string; v: string }[] }
  /** Daftar berkas resmi. Tanpa `href`, hanya lencana status (berkas belum ada). */
  | {
      type: 'files';
      items: {
        icon: 'file' | 'shield' | 'clock';
        title: string;
        meta: string;
        badge: string;
        tone: BadgeTone;
        href?: string;
      }[];
    }
  /** Butir berjudul dengan penjelasan (opsional satu tautan). */
  | {
      type: 'points';
      items: { title: string; text: string; link?: { label: string; href: string } }[];
    }
  /** Daftar centang ringkas. */
  | { type: 'checklist'; items: string[] }
  /** Tanya jawab (akordeon). */
  | { type: 'faq'; items: { q: string; a: string; open?: boolean }[] }
  /** Baris tautan ke halaman lain. */
  | { type: 'links'; items: { text: string; href: string }[] }
  /** Tombol pil bertanda panah ke halaman lain. */
  | { type: 'button'; label: string; href: string }
  /** Kotak sorot dengan satu kalimat. */
  | { type: 'callout'; text: string };

export interface LegalSection {
  /** Dipakai sebagai id jangkar (#id) dan di daftar isi. */
  id: string;
  /** Label atas judul ("Pasal 1"). Bila kosong, nomor dibuat dari urutan. */
  label?: string;
  /** Judul pasal; boleh memuat *miring*. */
  heading: string;
  /** Label di daftar isi bila berbeda dari judul (desain memakai label lebih pendek). */
  tocTitle?: string;
  /** Keterangan pendek di bawah judul (varian "rail"). */
  caption?: string;
  blocks: LegalBlock[];
}

export interface LegalSummary {
  eyebrow: string;
  heading: string;
  items: string[];
  note?: string;
}

export interface LegalDocument {
  slug: string;
  /** Judul untuk <title>, jejak navigasi, dan daftar dokumen terkait. */
  title: string;
  /** Judul h1 dengan penekanan miring. */
  heading: string;
  /** Teks pendek untuk meta description. */
  description: string;
  eyebrow: string;
  lead: string;
  /** Nomor versi. Kosong untuk dokumen tanpa tabel meta (Legalitas). */
  version?: string;
  /** Teks apa adanya dari desain; "[ditentukan klien]" sampai klien memutuskan. */
  effectiveDate?: string;
  /** Teks apa adanya dari desain; nanti dari kolom `updated_at`. */
  updatedAt?: string;
  summary?: LegalSummary;
  /** Paragraf pembuka sebelum pasal pertama. */
  intro?: string;
  sections: LegalSection[];
  /** Catatan penutup dokumen. */
  note?: string;
  /**
   * Tata letak: "pasal" (daftar isi di samping, pasal bernomor) atau "rail" (judul bagian di kolom kiri,
   * hero tengah, daftar isi mendatar; dipakai Legalitas).
   */
  variant?: 'pasal' | 'rail';
  /** Jejak navigasi (varian "rail"). */
  breadcrumb?: { label: string; href?: string }[];
  /** Blok ajakan di bawah dokumen (judul boleh memuat *miring*). Bawaan: tombol Hubungi kami ke /contact. */
  cta?: {
    eyebrow?: string;
    heading: string;
    text: string;
    button?: { label: string; href: string };
    aside?: { label: string; href?: string };
    /** Berkas foto di public/foto (tanpa ekstensi). Bila ada, blok tampil sebagai ajakan berlatar foto. */
    photo?: string;
    photoAlt?: string;
  };
  /** Slug dokumen lain untuk bagian "Dokumen terkait". */
  related: { slug: string; sub: string }[];
}

export const legalDocuments: LegalDocument[] = [
  {
    slug: 'syarat-ketentuan',
    title: 'Syarat dan Ketentuan',
    heading: 'Syarat dan *ketentuan*',
    description:
      'Aturan yang berlaku saat Anda memesan Open Trip atau Private Trip di Arunika Journey, dari kuota dan pembayaran sampai tanggung jawab kedua pihak.',
    eyebrow: 'Dokumen legal',
    lead: 'Aturan yang berlaku saat Anda memesan Open Trip atau Private Trip di Arunika Journey, dari kuota dan pembayaran sampai tanggung jawab kedua pihak.',
    version: '1.0',
    effectiveDate: '[ditentukan klien]',
    updatedAt: '23 Nov 2026',
    summary: {
      eyebrow: 'Ringkasan singkat',
      heading: 'Lima hal yang *perlu Anda tahu*',
      items: [
        'Booking Open Trip berstatus **Pending Payment** sampai DP terverifikasi. Hanya setelah itu statusnya **Confirmed**.',
        'Kuota dicek sebelum Anda membayar. Harga, DP, dan biaya tambahan tampil sebelum pembayaran.',
        'Private Trip tidak punya harga otomatis. Harga mengikuti proposal yang Anda setujui.',
        'Jika kami mengubah jadwal atau membatalkan trip, Anda berhak atas jadwal pengganti atau refund.',
        'Aturan pembatalan oleh peserta ada di dokumen Pembatalan dan Refund, data pribadi di Kebijakan Privasi.',
      ],
      note: 'Ringkasan ini hanya alat bantu baca. Yang mengikat adalah teks lengkap pasal di bawah.',
    },
    sections: [
      {
        id: 'definisi',
        heading: 'Definisi',
        blocks: [
          {
            type: 'clause',
            no: '1.1',
            text: '**Arunika Journey** atau **Kami** adalah penyelenggara perjalanan wisata domestik yang mengoperasikan situs ini. Nama badan usaha dan nomor izin usaha: [diisi klien].',
          },
          {
            type: 'clause',
            no: '1.2',
            text: '**Pemesan** adalah orang yang membuat booking atau mengajukan permintaan Private Trip, dan bertanggung jawab atas data serta pembayaran. **Peserta** adalah setiap orang yang akan berangkat, termasuk Pemesan bila ikut serta.',
          },
          {
            type: 'clause',
            no: '1.3',
            text: '**Open Trip** adalah perjalanan berjadwal tetap dengan harga per orang, di mana Peserta bergabung dengan Peserta lain. **Private Trip** adalah perjalanan yang dirancang khusus untuk satu rombongan berdasarkan proposal.',
          },
          {
            type: 'clause',
            no: '1.4',
            text: '**Kuota** adalah jumlah kursi yang tersedia pada satu jadwal. **DP** adalah uang muka yang dibayar untuk mengunci kursi.',
          },
          {
            type: 'clause',
            no: '1.5',
            text: '**Kode booking** adalah nomor unik tiap booking, misalnya ARJ-2611-0187. **Nomor permintaan** adalah nomor tiap permintaan Private Trip, misalnya RQ-2611-0042.',
          },
        ],
      },
      {
        id: 'lingkup-layanan',
        heading: 'Lingkup *layanan*',
        blocks: [
          {
            type: 'clause',
            no: '2.1',
            text: '**Open Trip.** Jadwal, kuota, harga per orang, serta fasilitas yang termasuk dan tidak termasuk tertera di halaman detail setiap trip, misalnya Bromo Sunrise Experience (2 hari 1 malam). Satu booking dapat memuat paling banyak 8 Peserta, dewasa dan anak.',
          },
          {
            type: 'clause',
            no: '2.2',
            text: '**Private Trip.** Pemesan mengisi Request a Quote berisi tujuan, tanggal, jumlah orang, dan anggaran. Kami mengirim proposal berisi itinerary dan harga. Perjalanan terkonfirmasi setelah proposal disetujui dan DP dibayar.',
          },
          {
            type: 'clause',
            no: '2.3',
            text: 'Layanan kami terbatas pada perjalanan wisata domestik di Indonesia. Penginapan, transportasi, pemandu, dan tiket masuk disediakan oleh mitra yang kami pilih, dan kami bertanggung jawab mengoordinasikannya.',
          },
          {
            type: 'clause',
            no: '2.4',
            text: 'Kami berupaya menjaga informasi di situs tetap akurat. Bila ada kesalahan harga yang nyata, kami memberi tahu Pemesan sebelum pembayaran dilakukan.',
          },
        ],
      },
      {
        id: 'proses-pemesanan',
        tocTitle: 'Proses pemesanan',
        heading: 'Proses pemesanan dan *status booking*',
        blocks: [
          {
            type: 'clause',
            no: '3.1',
            text: 'Pemesan memilih jadwal dan jumlah Peserta, lalu sistem memvalidasi Kuota **sebelum** Pemesan diarahkan ke pembayaran. Bila sisa kursi kurang dari jumlah Peserta, Pemesan dapat mengurangi Peserta, memilih tanggal lain, atau mengajukan Private Trip.',
          },
          {
            type: 'clause',
            no: '3.2',
            text: 'Setelah data diisi dan DP dimulai, kursi dikunci sementara. Batas waktu pembayaran DP: [ditentukan klien]. Bila terlewati, booking menjadi Expired dan Kuota dilepas kembali.',
          },
          {
            type: 'clause',
            no: '3.3',
            text: 'Reservasi hanya sah setelah pembayaran terverifikasi oleh tim kami. Mengunggah bukti transfer belum berarti booking terkonfirmasi.',
          },
          {
            type: 'statuses',
            items: [
              {
                badge: 'Pending Payment',
                tone: 'pending',
                text: 'Kursi dikunci sementara, DP belum terverifikasi. Booking belum menjadi reservasi.',
              },
              {
                badge: 'Confirmed',
                tone: 'ok',
                text: 'Pembayaran terverifikasi. Reservasi sah dan konfirmasi dikirim lewat email.',
              },
            ],
          },
          {
            type: 'clause',
            no: '3.4',
            text: 'Status booking dapat dicek kapan saja di halaman [Cek Status](/cek-status) dengan kode booking dan email Pemesan. Pemesan tidak perlu membuat akun.',
          },
        ],
      },
      {
        id: 'harga-dp',
        heading: 'Harga, DP, dan *biaya tambahan*',
        blocks: [
          {
            type: 'clause',
            no: '4.1',
            text: 'Harga Open Trip dinyatakan dalam rupiah per orang dan tertera pada setiap jadwal. Harga dapat berbeda antar tanggal keberangkatan. Harga yang tampil sudah termasuk PPN. Harga yang berlaku adalah harga yang tampil pada jadwal saat booking dibuat.',
          },
          {
            type: 'clause',
            no: '4.2',
            text: 'DP dibayar untuk mengunci kursi. Contoh: pada total Rp 2.500.000 untuk 2 dewasa, DP 30% adalah Rp 750.000. Besaran DP final: [ditentukan klien]. Sisa dilunasi sebelum keberangkatan, dengan batas pelunasan [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '4.3',
            text: 'Biaya tambahan, misalnya tarif Peserta anak, kamar single, atau penjemputan di luar titik kumpul, ditampilkan dalam ringkasan pesanan **sebelum** Pemesan membayar. Tidak ada biaya yang baru muncul setelah pembayaran. Tarif Peserta anak: [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '4.4',
            text: 'Private Trip tidak memiliki harga otomatis. Harga final tercantum dalam proposal tertulis dan hanya mengikat setelah Pemesan menyetujuinya.',
          },
          {
            type: 'clause',
            no: '4.5',
            text: 'Pembayaran dilakukan hanya ke rekening atau metode yang tertera di halaman booking resmi Arunika Journey: [diisi klien].',
          },
        ],
      },
      {
        id: 'kewajiban-peserta',
        heading: 'Kewajiban *peserta*',
        blocks: [
          {
            type: 'clause',
            no: '5.1',
            text: 'Peserta memberikan data yang benar dan lengkap sesuai identitas. Kesalahan data yang berakibat pada layanan menjadi tanggung jawab Pemesan.',
          },
          {
            type: 'clause',
            no: '5.2',
            text: 'Peserta hadir di titik kumpul pada jam yang tertera di konfirmasi. Keterlambatan tanpa kabar dapat dianggap tidak hadir, sebagaimana diatur dalam Pembatalan dan Refund.',
          },
          {
            type: 'clause',
            no: '5.3',
            text: 'Peserta menyampaikan kondisi kesehatan yang relevan sebelum berangkat. Trip gunung seperti Bromo, Dieng, dan Ijen dimulai dini hari dengan suhu dingin dan medan menanjak. Kami dapat menyarankan Peserta tidak ikut bila kondisinya membahayakan dirinya atau rombongan.',
          },
          {
            type: 'clause',
            no: '5.4',
            text: 'Peserta mengikuti arahan pemandu, aturan kawasan wisata dan konservasi, serta tidak meninggalkan sampah. Peserta di bawah umur wajib didampingi orang tua atau wali.',
          },
          {
            type: 'clause',
            no: '5.5',
            text: 'Peserta menjaga barang pribadi dan membawa dokumen identitas yang diperlukan.',
          },
        ],
      },
      {
        id: 'perubahan-jadwal',
        heading: 'Perubahan jadwal *oleh kami*',
        blocks: [
          {
            type: 'clause',
            no: '6.1',
            text: 'Kami dapat menyesuaikan urutan kegiatan, jam, titik kumpul, atau penyedia layanan karena cuaca, kondisi jalan, penutupan kawasan, atau alasan keselamatan, dengan standar layanan yang setara.',
          },
          {
            type: 'clause',
            no: '6.2',
            text: 'Kami memberi tahu Pemesan lewat email dan WhatsApp secepat mungkin setelah perubahan diketahui.',
          },
          {
            type: 'clause',
            no: '6.3',
            text: 'Bila perubahan bersifat material, misalnya tanggal berangkat bergeser atau destinasi utama diganti, Pemesan berhak menerima perubahan, memilih jadwal lain, atau mengajukan refund sesuai Pembatalan dan Refund.',
          },
        ],
      },
      {
        id: 'pembatalan-oleh-kami',
        heading: 'Pembatalan *oleh kami*',
        blocks: [
          {
            type: 'clause',
            no: '7.1',
            text: 'Kami dapat membatalkan suatu jadwal bila kuota minimum tidak terpenuhi, terjadi cuaca ekstrem atau bencana, kawasan ditutup, atau keselamatan Peserta tidak dapat dijamin. Batas kuota minimum dan batas waktu pemberitahuan: [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '7.2',
            text: 'Bila jadwal dibatalkan, Pemesan memilih antara pindah ke jadwal lain atau menerima refund penuh atas pembayaran yang sudah kami terima.',
          },
          {
            type: 'clause',
            no: '7.3',
            text: 'Biaya yang Pemesan keluarkan sendiri di luar paket, misalnya tiket transportasi menuju titik kumpul, tidak kami ganti kecuali disepakati tertulis.',
          },
        ],
      },
      {
        id: 'tanggung-jawab',
        heading: 'Tanggung jawab dan *keadaan kahar*',
        blocks: [
          {
            type: 'clause',
            no: '8.1',
            text: 'Kami bertanggung jawab merencanakan dan menyelenggarakan perjalanan sesuai deskripsi trip yang dipesan, dalam batas yang diatur peraturan perundang-undangan.',
          },
          {
            type: 'clause',
            no: '8.2',
            text: 'Kami tidak bertanggung jawab atas kerugian akibat Peserta yang mengabaikan arahan pemandu, kehilangan barang pribadi, atau gangguan layanan pihak ketiga di luar kendali yang wajar.',
          },
          {
            type: 'clause',
            no: '8.3',
            text: 'Cakupan asuransi tiap trip tercantum pada bagian Termasuk dan Tidak termasuk di halaman detail. Detail polis dan mitra asuransi: [diisi klien].',
          },
          {
            type: 'clause',
            no: '8.4',
            text: '**Keadaan kahar** mencakup bencana alam seperti erupsi, banjir, longsor, dan gempa, kerusuhan, wabah, kebijakan pemerintah, serta penutupan kawasan wisata. Kami tidak bertanggung jawab atas kegagalan layanan yang disebabkan keadaan kahar. Penanganan dana mengikuti dokumen Pembatalan dan Refund.',
          },
        ],
      },
      {
        id: 'data-pribadi',
        heading: 'Data *pribadi*',
        blocks: [
          {
            type: 'clause',
            no: '9.1',
            text: 'Data Pemesan dan Peserta dikumpulkan dan diproses sesuai [Kebijakan Privasi](/legal/kebijakan-privasi), termasuk hak Anda untuk mengakses, memperbaiki, dan menghapus data.',
          },
          {
            type: 'clause',
            no: '9.2',
            text: 'Pemesan yang memasukkan data Peserta lain menyatakan telah memperoleh izin dari Peserta tersebut, atau dari orang tua atau wali bagi Peserta anak.',
          },
          {
            type: 'clause',
            no: '9.3',
            text: 'Kami meminta izin sebelum memuat foto atau video yang menampilkan wajah Peserta di situs atau media sosial. Peserta berhak menolak tanpa memengaruhi layanan.',
          },
        ],
      },
      {
        id: 'penyelesaian-sengketa',
        heading: 'Penyelesaian *sengketa*',
        blocks: [
          {
            type: 'clause',
            no: '10.1',
            text: 'Keluhan disampaikan lewat [kanal pengaduan: diisi klien] dengan menyertakan kode booking. Kami menanggapi dalam [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '10.2',
            text: 'Perselisihan diselesaikan lebih dulu secara musyawarah. Bila tidak tercapai kesepakatan, penyelesaian ditempuh melalui [forum penyelesaian sengketa: diisi klien].',
          },
          {
            type: 'clause',
            no: '10.3',
            text: 'Syarat dan Ketentuan ini tunduk pada hukum Republik Indonesia. Domisili hukum: [diisi klien].',
          },
          {
            type: 'clause',
            no: '10.4',
            text: 'Kami dapat memperbarui dokumen ini. Versi terbaru tampil di halaman ini dan berlaku untuk booking baru. Booking yang sudah Confirmed mengikuti versi yang berlaku saat booking dibuat.',
          },
        ],
      },
    ],
    note: 'Draf untuk ditinjau klien dan penasihat hukum sebelum diterbitkan. Bagian dalam tanda kurung siku akan dilengkapi klien.',
    cta: {
      heading: 'Kami senang *menjelaskan* isinya',
      text: 'Ada pasal yang kurang jelas atau situasi yang belum tercakup? Sebutkan kode booking Anda dan kami jawab langsung.',
    },
    related: [
      { slug: 'kebijakan-privasi', sub: 'Privacy Policy' },
      { slug: 'pembatalan-refund', sub: 'Cancellation & Refund' },
    ],
  },
  {
    slug: 'kebijakan-privasi',
    title: 'Kebijakan Privasi',
    heading: 'Kebijakan *privasi*',
    description:
      'Data apa yang Arunika Journey kumpulkan saat Anda memesan perjalanan, untuk apa dipakai, siapa yang menerimanya, dan apa hak Anda atas data tersebut.',
    eyebrow: 'Dokumen legal',
    lead: 'Data apa yang kami kumpulkan saat Anda memesan perjalanan, untuk apa kami memakainya, siapa yang menerimanya, dan apa hak Anda atas data tersebut.',
    version: '1.0',
    effectiveDate: '[ditentukan klien]',
    updatedAt: '23 Nov 2026',
    summary: {
      eyebrow: 'Ringkasan singkat',
      heading: 'Lima hal yang *perlu Anda tahu*',
      items: [
        'Kami hanya mengumpulkan data yang dibutuhkan untuk memproses booking dan menyelenggarakan perjalanan.',
        'Data Anda tidak dijual. Data dibagikan seperlunya kepada penyedia pembayaran, penyedia email, dan mitra perjalanan.',
        'Data sensitif seperti kondisi kesehatan hanya diminta dengan persetujuan Anda.',
        'Anda berhak mengakses, memperbaiki, menghapus data, dan menarik persetujuan, sesuai UU No. 27 Tahun 2022.',
        'Cookie analitik hanya aktif jika Anda menyetujuinya.',
      ],
      note: 'Ringkasan ini hanya alat bantu baca. Yang mengikat adalah teks lengkap pasal di bawah.',
    },
    intro:
      'Kebijakan ini menjelaskan bagaimana Arunika Journey ("Kami") memproses data pribadi Pemesan dan Peserta sebagai pengendali data pribadi, sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi. Nama badan usaha: [diisi klien].',
    sections: [
      {
        id: 'data-dikumpulkan',
        heading: 'Data yang *kami kumpulkan*',
        blocks: [
          {
            type: 'clause',
            no: '1.1',
            text: '**Data pemesan.** Nama lengkap, alamat email, dan nomor telepon atau WhatsApp.',
          },
          {
            type: 'clause',
            no: '1.2',
            text: '**Data peserta.** Nama sesuai identitas dan jenis peserta (dewasa atau anak). Untuk trip tertentu kami juga dapat meminta nomor identitas, tanggal lahir, kontak darurat, serta kondisi kesehatan atau alergi yang Anda sampaikan secara sukarela.',
          },
          {
            type: 'clause',
            no: '1.3',
            text: '**Data pembayaran.** Nominal dan tanggal pembayaran, nama bank pengirim, dan bukti transfer yang Anda unggah. Kami tidak menyimpan nomor kartu. Bila ada penyedia pembayaran digital: [diisi klien].',
          },
          {
            type: 'clause',
            no: '1.4',
            text: '**Data permintaan Private Trip.** Tujuan, tanggal, jumlah orang, kisaran anggaran, dan catatan yang Anda tulis.',
          },
          {
            type: 'clause',
            no: '1.5',
            text: '**Data teknis.** Alamat IP, jenis perangkat dan peramban, halaman yang dibuka, dan waktu akses, yang terekam lewat cookie dan log server.',
          },
        ],
      },
      {
        id: 'tujuan-penggunaan',
        heading: 'Tujuan *penggunaan data*',
        blocks: [
          {
            type: 'clause',
            no: '2.1',
            text: '**Memproses booking.** Memvalidasi kuota, membuat kode booking, memverifikasi pembayaran, dan mengirim konfirmasi.',
          },
          {
            type: 'clause',
            no: '2.2',
            text: '**Menyelenggarakan perjalanan.** Berkoordinasi dengan pemandu, penyedia transportasi, dan penginapan, serta menjaga keselamatan Peserta selama trip.',
          },
          {
            type: 'clause',
            no: '2.3',
            text: '**Berkomunikasi.** Mengirim status booking, perubahan jadwal, pengingat sebelum berangkat, dan membalas pesan Anda lewat email atau WhatsApp.',
          },
          {
            type: 'clause',
            no: '2.4',
            text: '**Memenuhi kewajiban hukum.** Pembukuan, perpajakan, dan permintaan resmi dari otoritas.',
          },
          {
            type: 'clause',
            no: '2.5',
            text: '**Memperbaiki layanan.** Memahami halaman dan langkah booking yang sering membingungkan, memakai data analitik yang telah diringkas. Kami tidak menjual data pribadi Anda kepada siapa pun.',
          },
        ],
      },
      {
        id: 'dasar-pemrosesan',
        heading: 'Dasar pemrosesan dan *persetujuan*',
        blocks: [
          {
            type: 'clause',
            no: '3.1',
            text: 'Kami memproses data berdasarkan pelaksanaan perjanjian (booking atau proposal yang Anda setujui), kewajiban hukum, kepentingan yang sah seperti keamanan dan pencegahan penipuan, serta persetujuan Anda.',
          },
          {
            type: 'clause',
            no: '3.2',
            text: 'Kami meminta persetujuan eksplisit untuk data kesehatan, buletin dan promosi, penayangan wajah Peserta pada dokumentasi, dan cookie non-esensial. Setiap persetujuan diminta lewat kotak centang terpisah dan tidak digabung dengan persetujuan Syarat dan Ketentuan.',
          },
          {
            type: 'clause',
            no: '3.3',
            text: 'Anda dapat menarik persetujuan kapan saja. Penarikan tidak memengaruhi pemrosesan yang telah sah sebelumnya.',
          },
          {
            type: 'clause',
            no: '3.4',
            text: 'Pemesan yang memasukkan data Peserta lain menyatakan telah mendapat izin dari Peserta tersebut atau dari orang tua atau walinya.',
          },
        ],
      },
      {
        id: 'pihak-ketiga',
        tocTitle: 'Pihak ketiga',
        heading: 'Pihak ketiga yang *menerima data*',
        blocks: [
          {
            type: 'clause',
            no: '4.1',
            text: '**Penyedia pembayaran** untuk memproses dan memverifikasi pembayaran: [nama penyedia: diisi klien].',
          },
          {
            type: 'clause',
            no: '4.2',
            text: '**Penyedia layanan email** untuk mengirim konfirmasi, pengingat, dan notifikasi status: [nama penyedia: diisi klien].',
          },
          {
            type: 'clause',
            no: '4.3',
            text: '**Mitra perjalanan** seperti pemandu, penyedia transportasi, penginapan, dan pengelola kawasan menerima data seperlunya, misalnya nama Peserta dan jumlah rombongan, agar trip dapat berjalan.',
          },
          {
            type: 'clause',
            no: '4.4',
            text: '**Penyedia hosting dan analitik** yang menjalankan situs. Bila server berada di luar Indonesia, kami memastikan tingkat pelindungan yang setara sesuai UU Pelindungan Data Pribadi. Lokasi server: [diisi klien].',
          },
          {
            type: 'clause',
            no: '4.5',
            text: '**Otoritas** bila diwajibkan oleh hukum. Seluruh pihak di atas terikat kewajiban menjaga kerahasiaan. Kami tidak menjual atau menyewakan data pribadi.',
          },
        ],
      },
      {
        id: 'penyimpanan-keamanan',
        tocTitle: 'Penyimpanan, keamanan, retensi',
        heading: 'Penyimpanan, keamanan, *dan retensi*',
        blocks: [
          {
            type: 'clause',
            no: '5.1',
            text: '**Penyimpanan.** Data disimpan dalam basis data dengan akses terbatas pada anggota tim yang memerlukannya untuk melayani booking Anda.',
          },
          {
            type: 'clause',
            no: '5.2',
            text: '**Keamanan.** Koneksi ke situs dienkripsi (HTTPS), akses dibatasi berdasarkan peran, dan data dicadangkan secara berkala. Bila terjadi kegagalan pelindungan data pribadi, kami memberi tahu Anda dan otoritas sesuai batas waktu yang diatur peraturan.',
          },
          {
            type: 'clause',
            no: '5.3',
            text: '**Masa retensi.** Kami menyimpan data selama diperlukan untuk tujuan di Pasal 2 dan kewajiban hukum. Masa simpan tiap jenis data:',
          },
          {
            type: 'table',
            head: ['Jenis data', 'Masa simpan'],
            rows: [
              ['Data pemesan dan peserta\nnama, kontak, kode booking', '[ditentukan klien]'],
              ['Bukti pembayaran\nuntuk pembukuan dan perpajakan', '[ditentukan klien]'],
              ['Permintaan Private Trip yang tidak berlanjut', '[ditentukan klien]'],
              ['Data kesehatan dan kontak darurat', '[ditentukan klien]'],
              ['Log teknis dan data analitik', '[ditentukan klien]'],
            ],
          },
          {
            type: 'clause',
            no: '5.4',
            text: 'Setelah masa simpan berakhir, data dihapus atau dianonimkan, kecuali masih diwajibkan disimpan oleh hukum.',
          },
        ],
      },
      {
        id: 'hak-pemilik-data',
        heading: 'Hak *pemilik data*',
        blocks: [
          {
            type: 'clause',
            no: '6.1',
            text: 'Sesuai UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda memiliki hak berikut atas data Anda:',
          },
          {
            type: 'rows',
            items: [
              {
                k: 'Akses',
                v: 'Meminta salinan dan penjelasan data pribadi yang kami simpan tentang Anda.',
              },
              {
                k: 'Koreksi',
                v: 'Memperbaiki data yang keliru atau tidak lengkap, misalnya salah ejaan nama peserta.',
              },
              {
                k: 'Hapus',
                v: 'Meminta data dihapus atau dianonimkan bila tidak lagi diperlukan.',
              },
              {
                k: 'Tarik persetujuan',
                v: 'Mencabut persetujuan yang pernah diberikan, misalnya buletin atau cookie analitik.',
              },
            ],
          },
          {
            type: 'clause',
            no: '6.2',
            text: '**Cara mengajukan.** Kirim permintaan ke [kontak pelindungan data: diisi klien] dengan menyebut kode booking dan email Pemesan. Kami memverifikasi identitas Anda lebih dulu, lalu menanggapi dalam [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '6.3',
            text: 'Penghapusan dapat ditunda atau ditolak bila data masih diperlukan untuk perjalanan yang sedang berjalan atau untuk memenuhi kewajiban hukum. Kami akan menjelaskan alasannya.',
          },
        ],
      },
      {
        id: 'cookie-analitik',
        heading: 'Cookie dan *analitik*',
        blocks: [
          {
            type: 'clause',
            no: '7.1',
            text: '**Cookie esensial.** Menjaga sesi booking, kursi yang dikunci sementara, dan keamanan formulir. Cookie ini tidak dapat dimatikan karena situs tidak berfungsi tanpanya.',
          },
          {
            type: 'clause',
            no: '7.2',
            text: '**Cookie fungsional.** Mengingat pilihan Anda, misalnya tanggal dan jumlah peserta yang terakhir dipilih.',
          },
          {
            type: 'clause',
            no: '7.3',
            text: '**Cookie analitik.** Mengukur halaman yang dilihat, asal kunjungan, dan langkah booking tempat pengunjung berhenti. Hanya aktif setelah Anda menyetujui lewat spanduk cookie. Alat analitik yang dipakai: [diisi klien].',
          },
          {
            type: 'clause',
            no: '7.4',
            text: 'Anda dapat menghapus atau memblokir cookie lewat pengaturan peramban. Sebagian fitur situs mungkin tidak berjalan baik tanpa cookie esensial. Pilihan di spanduk cookie dapat diubah kapan saja lewat [Preferensi cookie](#preferensi-cookie).',
          },
        ],
      },
      {
        id: 'anak-di-bawah-umur',
        heading: 'Anak di *bawah umur*',
        blocks: [
          {
            type: 'clause',
            no: '8.1',
            text: 'Situs ini ditujukan bagi orang dewasa yang cakap hukum. Booking untuk Peserta anak dibuat oleh orang tua atau wali.',
          },
          {
            type: 'clause',
            no: '8.2',
            text: 'Data anak hanya kami pakai untuk menyelenggarakan perjalanan dan menjaga keselamatannya, dengan persetujuan orang tua atau wali. Data anak tidak dipakai untuk promosi.',
          },
          {
            type: 'clause',
            no: '8.3',
            text: 'Orang tua atau wali dapat mengajukan akses, koreksi, atau penghapusan data anak dengan cara yang sama seperti di Pasal 6.',
          },
        ],
      },
      {
        id: 'perubahan-kebijakan',
        heading: 'Perubahan *kebijakan*',
        blocks: [
          {
            type: 'clause',
            no: '9.1',
            text: 'Kami dapat memperbarui kebijakan ini bila layanan atau peraturan berubah. Nomor versi dan tanggal pembaruan selalu tampil di bagian atas halaman.',
          },
          {
            type: 'clause',
            no: '9.2',
            text: 'Untuk perubahan yang berdampak pada hak Anda, kami memberi tahu Pemesan lewat email atau spanduk di situs sebelum perubahan berlaku.',
          },
        ],
      },
      {
        id: 'kontak',
        tocTitle: 'Kontak',
        heading: 'Kontak *pelindungan data*',
        blocks: [
          {
            type: 'clause',
            no: '10.1',
            text: 'Pertanyaan, permintaan, dan pengaduan tentang data pribadi dapat disampaikan ke:',
          },
          {
            type: 'rows',
            items: [
              { k: 'Penanggung jawab', v: '[diisi klien]' },
              { k: 'Email', v: '[diisi klien]' },
              { k: 'WhatsApp', v: '[diisi klien]' },
              { k: 'Alamat', v: '[diisi klien]' },
            ],
          },
          {
            type: 'clause',
            no: '10.2',
            text: 'Bila tanggapan kami belum memuaskan, Anda berhak mengadukan masalah ke otoritas pelindungan data pribadi sesuai peraturan yang berlaku.',
          },
        ],
      },
    ],
    note: 'Draf untuk ditinjau klien dan penasihat hukum sebelum diterbitkan. Bagian dalam tanda kurung siku akan dilengkapi klien.',
    cta: {
      heading: 'Tanya soal *data Anda*',
      text: 'Ingin melihat, memperbaiki, atau menghapus data Anda? Sebutkan kode booking dan email pemesan, kami bantu prosesnya.',
    },
    related: [
      { slug: 'syarat-ketentuan', sub: 'Terms & Conditions' },
      { slug: 'pembatalan-refund', sub: 'Cancellation & Refund' },
    ],
  },
  {
    slug: 'pembatalan-refund',
    title: 'Pembatalan dan Refund',
    heading: 'Pembatalan dan *refund*',
    description:
      'Apa yang terjadi pada pembayaran Anda bila rencana berubah, baik karena Anda membatalkan, memindahkan jadwal, maupun karena Arunika Journey yang membatalkan trip.',
    eyebrow: 'Dokumen legal',
    lead: 'Apa yang terjadi pada pembayaran Anda bila rencana berubah, baik karena Anda membatalkan, memindahkan jadwal, maupun karena kami yang membatalkan trip.',
    version: '1.0',
    effectiveDate: '[ditentukan klien]',
    updatedAt: '23 Nov 2026',
    summary: {
      eyebrow: 'Ringkasan singkat',
      heading: 'Lima hal yang *perlu Anda tahu*',
      items: [
        'Aturan batal dan refund terlihat sebelum Anda membayar, dan dihitung dari tanggal pengajuan diterima.',
        'Bila Anda yang membatalkan, dana kembali mengikuti tabel tingkatan H-… sebelum berangkat. Persentasenya [ditentukan klien].',
        'Bila kami yang membatalkan jadwal, Anda memilih pindah jadwal atau refund penuh.',
        'Pindah jadwal dimungkinkan selama kuota tersedia dan sebelum batas waktu yang berlaku.',
        'Private Trip mengikuti kesepakatan yang tertulis di proposal yang Anda setujui.',
      ],
      note: 'Ringkasan ini hanya alat bantu baca. Yang mengikat adalah teks lengkap pasal di bawah.',
    },
    sections: [
      {
        id: 'prinsip',
        tocTitle: 'Prinsip',
        heading: '*Prinsip* kami',
        blocks: [
          {
            type: 'clause',
            no: '1.1',
            text: '**Terlihat sebelum bayar.** Ringkasan kebijakan ini tampil di langkah pembayaran, bersama harga, DP, dan kuota. Anda tidak perlu mencari aturannya setelah membayar.',
          },
          {
            type: 'clause',
            no: '1.2',
            text: '**Dasar perhitungan.** Refund dihitung dari jumlah yang sudah Anda bayarkan, misalnya DP atau DP ditambah pelunasan, dan dari tanggal pengajuan tertulis kami terima, bukan tanggal Anda berniat membatalkan.',
          },
          {
            type: 'clause',
            no: '1.3',
            text: '**Hitungan hari.** Hari dihitung kalender sebelum tanggal berangkat. H-7 berarti tujuh hari sebelum tanggal berangkat yang tertera di booking.',
          },
          {
            type: 'clause',
            no: '1.4',
            text: '**Cakupan.** Pasal 2 sampai 6 berlaku untuk Open Trip. Private Trip mengikuti Pasal 7. Persentase dan batas waktu pada dokumen ini: [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '1.5',
            text: '**Biaya pihak ketiga.** Biaya yang sudah kami bayarkan dan tidak dapat ditarik kembali, misalnya tiket masuk kawasan, penginapan non-refundable, atau tiket kapal untuk trip Karimunjawa, dapat dipotong. Rinciannya kami tunjukkan sebelum refund diproses.',
          },
        ],
      },
      {
        id: 'pembatalan-peserta',
        heading: 'Pembatalan *oleh peserta*',
        blocks: [
          {
            type: 'clause',
            no: '2.1',
            text: 'Bila Pemesan membatalkan Open Trip, dana yang dikembalikan mengikuti tabel berikut. Persentase pada setiap baris: **[ditentukan klien]**.',
          },
          {
            type: 'table',
            head: ['Waktu pembatalan', 'Dana kembali', 'Keterangan'],
            numeric: [1],
            rows: [
              [
                'H-[x] atau lebih awal\nsebelum tanggal berangkat',
                '[ditentukan klien]',
                'Biaya administrasi dan potongan biaya pihak ketiga, bila ada: [ditentukan klien].',
              ],
              [
                'H-[x] sampai H-[x]',
                '[ditentukan klien]',
                'Kredit untuk jadwal lain pada trip yang sama dapat ditawarkan: [ditentukan klien].',
              ],
              [
                'Kurang dari H-[x]',
                '[ditentukan klien]',
                'Peserta dapat diganti dengan nama lain sesuai ayat 2.2.',
              ],
              [
                'Hari keberangkatan atau setelahnya',
                '[ditentukan klien]',
                'Termasuk peserta yang tidak hadir, lihat Pasal 5.',
              ],
            ],
          },
          {
            type: 'clause',
            no: '2.2',
            text: '**Ganti nama peserta.** Peserta dapat digantikan orang lain tanpa dianggap pembatalan, paling lambat [ditentukan klien] sebelum berangkat. Data peserta pengganti wajib kami terima lengkap.',
          },
          {
            type: 'clause',
            no: '2.3',
            text: '**Pembatalan sebagian.** Bila hanya sebagian Peserta dalam satu booking yang batal, tabel di atas dihitung per Peserta yang dibatalkan. Peserta lainnya tetap berangkat.',
          },
        ],
      },
      {
        id: 'pembatalan-kami',
        heading: 'Pembatalan *oleh kami*',
        blocks: [
          {
            type: 'clause',
            no: '3.1',
            text: 'Bila kami membatalkan jadwal karena kuota minimum tidak terpenuhi, cuaca ekstrem, penutupan kawasan, atau alasan keselamatan, Pemesan memilih salah satu:',
          },
          {
            type: 'rows',
            items: [
              {
                k: 'Refund penuh',
                v: 'Seluruh pembayaran yang sudah kami terima dikembalikan tanpa potongan.',
              },
              {
                k: 'Pindah jadwal',
                v: 'Pindah ke jadwal lain pada trip yang sama atau trip lain tanpa biaya perubahan. Selisih harga, bila ada, diperhitungkan.',
              },
            ],
          },
          {
            type: 'clause',
            no: '3.2',
            text: 'Kami memberi tahu Pemesan lewat email dan WhatsApp secepatnya. Batas waktu memilih: [ditentukan klien]. Bila belum ada pilihan, kami menghubungi Pemesan kembali sebelum mengambil tindakan apa pun atas pembayaran.',
          },
        ],
      },
      {
        id: 'pindah-jadwal',
        heading: 'Pindah *jadwal*',
        blocks: [
          {
            type: 'clause',
            no: '4.1',
            text: 'Pemesan dapat meminta pindah ke tanggal lain pada trip yang sama selama kuota jadwal tujuan tersedia dan pengajuan diterima sebelum H-[x].',
          },
          {
            type: 'clause',
            no: '4.2',
            text: 'Kuota jadwal tujuan dicek lebih dulu. Booking lama baru dilepas setelah booking di jadwal baru berstatus Confirmed, sehingga Anda tidak kehilangan kursi di antaranya.',
          },
          {
            type: 'clause',
            no: '4.3',
            text: 'Bila harga jadwal baru lebih tinggi, Pemesan membayar selisihnya. Bila lebih rendah, perlakuan selisihnya: [ditentukan klien]. Biaya pindah jadwal dan batas jumlah pindah: [ditentukan klien].',
          },
        ],
      },
      {
        id: 'peserta-tidak-hadir',
        heading: 'Peserta *tidak hadir*',
        blocks: [
          {
            type: 'clause',
            no: '5.1',
            text: 'Peserta dianggap tidak hadir bila tidak berada di titik kumpul pada jam yang ditentukan dan tidak dapat dihubungi dalam [ditentukan klien] menit.',
          },
          {
            type: 'clause',
            no: '5.2',
            text: 'Peserta yang tidak hadir tidak mendapat pengembalian dana, mengikuti baris terakhir tabel di Pasal 2, dan tidak mendapat penggantian atas layanan yang terlewat.',
          },
          {
            type: 'clause',
            no: '5.3',
            text: 'Peserta yang meninggalkan trip lebih awal atas kemauan sendiri tidak mendapat refund atas layanan yang tidak terpakai.',
          },
        ],
      },
      {
        id: 'force-majeure',
        heading: 'Force *majeure*',
        blocks: [
          {
            type: 'clause',
            no: '6.1',
            text: 'Keadaan kahar mengikuti definisi pada [Syarat dan Ketentuan](/legal/syarat-ketentuan) Pasal 8, antara lain erupsi, banjir, longsor, gempa, wabah, kebijakan pemerintah, dan penutupan kawasan.',
          },
          {
            type: 'clause',
            no: '6.2',
            text: 'Bila kami membatalkan karena keadaan kahar, Pemesan memilih pindah jadwal atau menerima pengembalian sebesar pembayaran dikurangi biaya pihak ketiga yang tidak dapat ditarik kembali. Kami menunjukkan rincian biayanya secara tertulis. Ketentuan rinci: [ditentukan klien].',
          },
          {
            type: 'clause',
            no: '6.3',
            text: 'Pembatalan karena sakit atau urusan pribadi bukan keadaan kahar dan mengikuti Pasal 2. Pengecualian dengan surat dokter: [ditentukan klien].',
          },
        ],
      },
      {
        id: 'private-trip',
        heading: 'Private *Trip*',
        blocks: [
          {
            type: 'clause',
            no: '7.1',
            text: 'Pembatalan dan refund Private Trip mengikuti kesepakatan dalam proposal yang disetujui Pemesan, termasuk jadwal DP, batas waktu pembatalan, dan persentase pengembalian.',
          },
          {
            type: 'clause',
            no: '7.2',
            text: 'Sebelum proposal disetujui, Pemesan tidak dikenai biaya. Permintaan dapat ditutup kapan saja, dan meminta revisi proposal bukan pembatalan.',
          },
          {
            type: 'clause',
            no: '7.3',
            text: 'Biaya yang sudah dipesankan khusus untuk rombongan, seperti penginapan dan transportasi, dapat tidak dikembalikan sesuai yang tertulis di proposal.',
          },
        ],
      },
      {
        id: 'cara-mengajukan',
        heading: 'Cara *mengajukan*',
        blocks: [
          {
            type: 'clause',
            no: '8.1',
            text: 'Pengajuan pembatalan, pindah jadwal, atau refund dilakukan secara tertulis dengan langkah berikut.',
          },
          {
            type: 'steps',
            items: [
              {
                title: 'Siapkan kode booking',
                text: 'Contoh ARJ-2611-0187, dan email yang dipakai saat memesan. Untuk Private Trip, siapkan nomor permintaan seperti RQ-2611-0042.',
              },
              {
                title: 'Kirim pengajuan',
                text: 'Lewat halaman [Kontak](/contact) atau [kanal pengajuan: diisi klien]. Sertakan nama peserta, pilihan Anda (batal atau pindah jadwal), dan alasan singkat.',
              },
              {
                title: 'Terima perhitungan tertulis',
                text: 'Kami mengonfirmasi penerimaan dan mengirim rincian dana kembali lewat email.',
              },
              {
                title: 'Setujui dan tunggu pengembalian',
                text: 'Setelah Anda menyetujui rincian, refund diproses sesuai Pasal 9.',
              },
            ],
          },
        ],
      },
      {
        id: 'waktu-proses',
        heading: 'Waktu proses dan *metode*',
        blocks: [
          { type: 'clause', no: '9.1', text: 'Refund diproses dengan ketentuan berikut.' },
          {
            type: 'rows',
            items: [
              {
                k: 'Waktu proses',
                v: '[ditentukan klien] hari kerja sejak rincian disetujui Pemesan.',
              },
              {
                k: 'Metode',
                v: 'Transfer ke rekening atas nama Pemesan. Metode lain: [diisi klien].',
              },
              { k: 'Biaya transfer', v: '[ditentukan klien]' },
              { k: 'Mata uang', v: 'Rupiah, sebesar jumlah pada rincian tertulis.' },
              {
                k: 'Bukti',
                v: 'Bukti transfer dikirim lewat email dan status booking diperbarui di halaman [Cek Status](/cek-status).',
              },
            ],
          },
        ],
      },
    ],
    note: 'Draf untuk ditinjau klien dan penasihat hukum sebelum diterbitkan. Bagian dalam tanda kurung siku akan dilengkapi klien.',
    cta: {
      heading: 'Bingung soal *refund*?',
      text: 'Ceritakan situasi Anda dan sebutkan kode booking. Kami jelaskan pilihan yang tersedia sebelum Anda memutuskan.',
    },
    related: [
      { slug: 'syarat-ketentuan', sub: 'Terms & Conditions' },
      { slug: 'kebijakan-privasi', sub: 'Privacy Policy' },
    ],
  },
  {
    slug: 'legalitas',
    title: 'Legalitas',
    heading: 'Legalitas dan *perlindungan*',
    description:
      'Siapa Arunika Journey secara hukum, dan bagaimana pembayaran serta perjalanan Anda dijaga. Semuanya bisa diperiksa sebelum Anda membayar DP.',
    eyebrow: 'Legalitas',
    lead: 'Siapa Arunika Journey secara hukum, dan bagaimana pembayaran serta perjalanan Anda dijaga. Semuanya bisa diperiksa sebelum Anda membayar DP.',
    variant: 'rail',
    breadcrumb: [
      { label: 'Beranda', href: '/' },
      { label: 'Tentang Kami', href: '/about' },
      { label: 'Legalitas' },
    ],
    sections: [
      {
        id: 'identitas',
        heading: 'Identitas usaha',
        caption:
          'Data badan usaha dan salinan dokumen resmi, dapat dicocokkan sendiri sebelum Anda membayar DP.',
        blocks: [
          {
            type: 'lede',
            text: 'Nama badan usaha, nomor izin, dan alamat terdaftar dicantumkan apa adanya, supaya Anda bisa mencocokkannya sendiri sebelum membayar. Isian bertanda [diisi klien] menunggu dokumen resmi dari pemilik usaha.',
          },
          {
            type: 'details',
            title: 'Data badan usaha',
            items: [
              { k: 'Nama badan usaha', v: '[diisi klien]' },
              { k: 'Bentuk usaha', v: '[diisi klien]' },
              { k: 'Nomor Induk Berusaha (NIB)', v: '[diisi klien]' },
              { k: 'Izin usaha pariwisata', v: '[diisi klien]' },
              { k: 'Alamat terdaftar', v: '[diisi klien]' },
              { k: 'Penanggung jawab', v: '[diisi klien]' },
              { k: 'Keanggotaan asosiasi', v: '[diisi klien]' },
              { k: 'Dokumen diperiksa terakhir', v: '[diisi klien]' },
            ],
          },
          {
            type: 'subheading',
            heading: 'Dokumen resmi',
            text: 'Salinan dokumen akan ditampilkan di sini setelah diterima dari pemilik usaha.',
          },
          {
            type: 'files',
            items: [
              {
                icon: 'file',
                title: 'Salinan izin usaha',
                meta: 'PDF · [diisi klien]',
                badge: 'Menunggu dokumen',
                tone: 'pending',
              },
              {
                icon: 'file',
                title: 'Salinan NIB',
                meta: 'PDF · [diisi klien]',
                badge: 'Menunggu dokumen',
                tone: 'pending',
              },
              {
                icon: 'shield',
                title: 'Asuransi perjalanan',
                meta: 'PDF · [diisi klien]',
                badge: 'Menunggu dokumen',
                tone: 'pending',
              },
              {
                icon: 'file',
                title: 'Profil perusahaan',
                meta: 'PDF · [diisi klien]',
                badge: 'Menunggu dokumen',
                tone: 'pending',
              },
            ],
          },
        ],
      },
      {
        id: 'perlindungan',
        tocTitle: 'Perlindungan',
        heading: 'Perlindungan untuk Anda',
        caption: 'Enam hal yang kami jaga sebelum dan sesudah booking.',
        blocks: [
          {
            type: 'points',
            items: [
              {
                title: 'Harga di muka',
                text: 'Harga per orang, biaya tambahan, total, dan DP terlihat sebelum Anda membayar. Tidak ada kejutan di langkah terakhir.',
              },
              {
                title: 'Kuota divalidasi',
                text: 'Kuota dicek sebelum pembayaran, dan sisa kursi tampil di setiap jadwal keberangkatan.',
              },
              {
                title: 'Status yang jelas',
                text: 'Pending Payment berubah menjadi Confirmed hanya setelah pembayaran terverifikasi. Konfirmasi memuat detail trip Anda.',
              },
              {
                title: 'Kebijakan batal di muka',
                text: 'Ketentuan pembatalan dan refund tertulis sebelum DP dibayar. Persentase refund: [diisi klien].',
              },
              {
                title: 'Informasi keselamatan',
                text: 'Titik kumpul dan informasi keselamatan tercantum di halaman setiap trip. Kontak darurat selama perjalanan: [diisi klien].',
              },
              {
                title: 'Data pribadi terjaga',
                text: 'Data pemesan dan peserta dipakai untuk reservasi perjalanan. Pengelolaannya dijelaskan di Kebijakan Privasi.',
                link: { label: 'Baca Kebijakan Privasi', href: '/legal/kebijakan-privasi' },
              },
            ],
          },
        ],
      },
      {
        id: 'pembatalan',
        tocTitle: 'Batal dan refund',
        heading: 'Kebijakan batal dan refund',
        caption: 'Ketentuan tertulis di setiap trip dan di langkah pembayaran, sebelum DP.',
        blocks: [
          {
            type: 'subheading',
            heading: 'Jika Anda membatalkan',
            text: 'Ketentuan pembatalan tertulis di halaman setiap trip dan di langkah pembayaran, sebelum Anda membayar DP. Besaran refund bergantung pada waktu pembatalan.',
          },
          {
            type: 'details',
            items: [
              {
                k: 'Lebih dari [batas waktu dari klien] sebelum berangkat',
                v: 'Refund [diisi klien]',
              },
              {
                k: 'Antara [batas waktu dari klien] dan [batas waktu dari klien]',
                v: 'Refund [diisi klien]',
              },
              { k: 'Kurang dari [batas waktu dari klien]', v: 'Refund [diisi klien]' },
            ],
          },
          {
            type: 'subheading',
            heading: 'Jika Arunika membatalkan atau mengubah jadwal',
            text: 'Pilihan yang tersedia untuk Anda (misalnya pindah jadwal atau refund) beserta tenggatnya: [diisi klien]. Kami memberi tahu lewat email atau WhatsApp [dikonfirmasi klien].',
          },
          {
            type: 'callout',
            text: 'Sebelum membayar DP, Anda sudah melihat total, DP, sisa pembayaran, dan kebijakan batal dalam satu ringkasan.',
          },
          {
            type: 'files',
            items: [
              {
                icon: 'clock',
                title: 'Kebijakan pembatalan dan refund',
                meta: 'Dokumen lengkap di situs ini',
                badge: 'Tersedia',
                tone: 'ok',
                href: '/legal/pembatalan-refund',
              },
            ],
          },
        ],
      },
      {
        id: 'keselamatan',
        tocTitle: 'Keselamatan',
        heading: 'Keselamatan perjalanan',
        caption:
          'Informasi ditempatkan di halaman setiap trip, bukan disimpan untuk hari keberangkatan.',
        blocks: [
          {
            type: 'lede',
            text: 'Tahu apa yang dijaga selama di jalan. Informasi keselamatan ditempatkan di halaman setiap trip, tidak disimpan untuk hari keberangkatan.',
          },
          {
            type: 'checklist',
            items: [
              'Titik kumpul dan jam berkumpul tercantum di setiap trip',
              'Kontak darurat selama perjalanan: [diisi klien]',
              'Briefing keselamatan sebelum berangkat: [dikonfirmasi klien]',
              'Asuransi perjalanan (termasuk atau tidak, dan cakupannya): [diisi klien]',
            ],
          },
          {
            type: 'button',
            label: 'Lihat kebijakan batal dan keselamatan',
            href: '/legal/pembatalan-refund',
          },
        ],
      },
      {
        id: 'pembaruan',
        heading: 'Pembaruan dan kontak',
        caption: 'Cara meminta salinan dokumen dan kapan terakhir diperiksa.',
        blocks: [
          {
            type: 'lede',
            text: 'Dokumen di halaman ini diperiksa dan diperbarui oleh tim Arunika. Tanggal pemeriksaan terakhir tercantum di bagian Identitas usaha: [diisi klien].',
          },
          {
            type: 'lede',
            text: 'Jika Anda ragu dengan dokumen yang ditampilkan, hubungi kami untuk meminta salinan. Kanal dan jam layanan: [dikonfirmasi klien].',
          },
          {
            type: 'details',
            items: [{ k: 'Kontak resmi', v: 'Email atau WhatsApp [dikonfirmasi klien]' }],
          },
          { type: 'button', label: 'Minta salinan lewat halaman Kontak', href: '/contact' },
        ],
      },
      {
        id: 'dokumen',
        tocTitle: 'Dokumen lainnya',
        heading: 'Dokumen dan kebijakan lainnya',
        caption: 'Ketentuan lengkap yang berlaku untuk setiap pemesanan.',
        blocks: [
          {
            type: 'links',
            items: [
              { text: 'Syarat dan ketentuan', href: '/legal/syarat-ketentuan' },
              { text: 'Pembatalan dan refund', href: '/legal/pembatalan-refund' },
              { text: 'Informasi pembayaran', href: '/help#pembayaran' },
              { text: 'Panduan booking', href: '/help#panduan' },
              { text: 'Kebijakan privasi', href: '/legal/kebijakan-privasi' },
            ],
          },
        ],
      },
      {
        id: 'faq',
        heading: 'Pertanyaan umum',
        caption: 'Seputar legalitas dan perlindungan.',
        blocks: [
          {
            type: 'faq',
            items: [
              {
                q: 'Apakah Arunika Journey berizin?',
                a: 'Nomor izin usaha dan dokumen pendukung ditampilkan di bagian Identitas usaha pada halaman ini. Nomor izin: [diisi klien].',
                open: true,
              },
              {
                q: 'Bagaimana DP saya dilindungi?',
                a: 'DP dibayar lewat website. Reservasi berstatus Pending Payment sampai pembayaran terverifikasi, lalu menjadi Confirmed. Metode pembayaran dan mekanisme verifikasi: [dikonfirmasi klien].',
              },
              {
                q: 'Apakah ada asuransi perjalanan?',
                a: 'Informasi asuransi (termasuk atau tidak, penyedia, dan cakupan): [diisi klien].',
              },
              {
                q: 'Bagaimana jika saya ragu dengan dokumen yang ditampilkan?',
                a: 'Hubungi kami lewat WhatsApp untuk meminta salinan dokumen. Kanal dan jam layanan: [dikonfirmasi klien].',
              },
              {
                q: 'Di mana saya bisa melihat dokumentasi trip dan ulasan peserta?',
                a: 'Halaman Dokumentasi memuat foto dan video dari trip yang tercatat berangkat, dan ulasan dari peserta terverifikasi.',
              },
            ],
          },
        ],
      },
    ],
    cta: {
      heading: 'Sudah *yakin*?',
      text: 'Lihat jadwal dan kuota Open Trip, atau kirim Request a Quote untuk Private Trip.',
      button: { label: 'Lihat jadwal Open Trip', href: '/trips' },
      aside: { label: 'Tanya soal legalitas', href: '/contact' },
      photo: 'jip-4x4-bromo',
      photoAlt: 'Jip 4x4 di bukit saat senja',
    },
    related: [],
  },
  // DOKUMEN LAIN DITAMBAHKAN DI BAWAH INI
];

export const getLegalDocument = (slug: string) => legalDocuments.find((d) => d.slug === slug);
