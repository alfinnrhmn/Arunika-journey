/**
 * Matriks izin per peran (PRD 6.7). Hanya dua peran internal: `owner` dan `admin_ops`.
 * Izin SELALU diperiksa di server (halaman dan endpoint aksi), bukan hanya dengan menyembunyikan menu.
 *
 * Aturan bawaan: kemampuan yang belum diputuskan klien ditolak untuk admin_ops (paling aman), bukan dibuka.
 */
export type Role = 'owner' | 'admin_ops';

const BOTH: readonly Role[] = ['owner', 'admin_ops'];
const OWNER: readonly Role[] = ['owner'];

export const ABILITIES = {
  /** Ringkasan (KPI, jadwal terdekat, antrean tindakan). */
  'ringkasan.lihat': BOTH,
  /** Reservasi, reservasi manual, jadwal dan kuota, Request dan proposal Private Trip. */
  'reservasi.kelola': BOTH,
  'jadwal.kelola': BOTH,
  'request.kelola': BOTH,
  /** Verifikasi pembayaran (setujui atau tolak bukti transfer). */
  'pembayaran.verifikasi': BOTH,
  /** Persetujuan refund: hanya Owner (DB-06). */
  'refund.setujui': OWNER,
  /** Paket dan Destinasi: konten dapat diubah keduanya; harga hanya Owner (admin: [ditentukan klien], ditolak dulu). */
  'paket.konten': BOTH,
  'paket.harga': OWNER,
  /** Halaman, Post/Journal, Dokumentasi, Testimoni, Media, Sampah. */
  'konten.kelola': BOTH,
  /** Dokumen legal: admin hanya menyusun draf; hanya Owner yang menerbitkan. */
  'legal.draf': BOTH,
  'legal.terbit': OWNER,
  /** Pengguna dan peran, Pengaturan (termasuk Template Email dan Kebijakan Batal), Log audit. */
  'pengguna.kelola': OWNER,
  'pengaturan.kelola': OWNER,
  'audit.lihat': OWNER,
} as const satisfies Record<string, readonly Role[]>;

export type Ability = keyof typeof ABILITIES;

export function can(role: Role | null | undefined, ability: Ability): boolean {
  if (!role) return false;
  return ABILITIES[ability].includes(role);
}
