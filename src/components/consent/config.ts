/**
 * Konfigurasi persetujuan cookie yang dipakai bersama oleh markup (ConsentBanner.astro) dan skrip
 * (src/scripts/consent.ts). Naikkan CONSENT_VERSION bila kategori berubah: pilihan lama dianggap tidak
 * berlaku dan banner muncul lagi.
 */
export const CONSENT_COOKIE = 'arj_consent';
export const CONSENT_VERSION = 1;
/** Masa berlaku cookie: 182 hari (sekitar 6 bulan), dalam detik. */
export const CONSENT_MAX_AGE = 182 * 24 * 60 * 60;

export interface ConsentCategory {
  id: 'necessary' | 'analytics' | 'booking';
  title: string;
  description: string;
  /** Kategori terkunci: selalu aktif, tidak bisa dimatikan. */
  locked?: boolean;
}

/** Teks dari frame desain "Preferensi Cookie". Nilai awal kategori opsional: mati (persetujuan harus eksplisit). */
export const CONSENT_CATEGORIES: ConsentCategory[] = [
  {
    id: 'necessary',
    title: 'Perlu',
    description:
      'Menjaga situs, sesi, dan alur booking tetap berjalan. Tanpa cookie ini situs tidak bisa dipakai, jadi selalu aktif.',
    locked: true,
  },
  {
    id: 'analytics',
    title: 'Analitik',
    description:
      'Membantu kami memahami halaman mana yang dipakai. Saat ini belum ada pelacak analitik yang dipasang; bila nanti dipasang, ia hanya aktif dengan izin Anda dan mati secara default.',
  },
  {
    id: 'booking',
    title: 'Pengukuran alur booking first-party',
    description:
      'Mencatat langkah booking yang selesai atau terhenti agar alurnya bisa kami perbaiki. Data tersimpan di sistem kami sendiri, tanpa pelacak pihak ketiga.',
  },
];
