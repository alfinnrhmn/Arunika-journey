import { can, type Ability, type Role } from '../../server/auth/permissions';

/**
 * Menu sidebar. Hanya Ringkasan dan Pembayaran yang punya halaman (`href`); sisanya tampil sesuai desain tetapi
 * tidak bisa diklik ("segera") supaya tidak ada tautan 404. Menyembunyikan menu per peran hanya KOSMETIK:
 * izin sebenarnya diperiksa di server pada tiap halaman dan endpoint (`guard`).
 */
export type IconName =
  | 'home'
  | 'calcheck'
  | 'inbox'
  | 'wallet'
  | 'clock'
  | 'package'
  | 'globe'
  | 'calendar'
  | 'layout'
  | 'pencil'
  | 'book'
  | 'camera'
  | 'user'
  | 'filecheck'
  | 'images'
  | 'users'
  | 'sliders'
  | 'shield';

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  /** Ada = halaman aktif. Tidak ada = "segera". */
  href?: string;
  ability: Ability;
}

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Operasional',
    items: [
      {
        key: 'ringkasan',
        label: 'Ringkasan',
        icon: 'home',
        href: '/dashboard',
        ability: 'ringkasan.lihat',
      },
      {
        key: 'reservasi',
        label: 'Reservasi',
        icon: 'calcheck',
        href: '/dashboard/reservasi',
        ability: 'reservasi.kelola',
      },
      { key: 'request', label: 'Request Private Trip', icon: 'inbox', ability: 'request.kelola' },
      {
        key: 'pembayaran',
        label: 'Pembayaran',
        icon: 'wallet',
        href: '/dashboard/pembayaran',
        ability: 'pembayaran.verifikasi',
      },
      { key: 'kotak-masuk', label: 'Kotak Masuk', icon: 'clock', ability: 'reservasi.kelola' },
    ],
  },
  {
    label: 'Katalog',
    items: [
      { key: 'paket', label: 'Paket Trip', icon: 'package', ability: 'paket.konten' },
      { key: 'destinasi', label: 'Destinasi', icon: 'globe', ability: 'paket.konten' },
      { key: 'jadwal', label: 'Jadwal dan Kuota', icon: 'calendar', ability: 'jadwal.kelola' },
    ],
  },
  {
    label: 'Konten (CMS)',
    items: [
      { key: 'halaman', label: 'Halaman', icon: 'layout', ability: 'konten.kelola' },
      { key: 'post', label: 'Post', icon: 'pencil', ability: 'konten.kelola' },
      { key: 'journal', label: 'Journal', icon: 'book', ability: 'konten.kelola' },
      { key: 'dokumentasi', label: 'Dokumentasi', icon: 'camera', ability: 'konten.kelola' },
      { key: 'testimoni', label: 'Testimoni', icon: 'user', ability: 'konten.kelola' },
      { key: 'legal', label: 'Dokumen Legal', icon: 'filecheck', ability: 'legal.draf' },
      { key: 'media', label: 'Pustaka Media', icon: 'images', ability: 'konten.kelola' },
    ],
  },
  {
    label: 'Sistem',
    items: [
      { key: 'pengguna', label: 'Pengguna dan Peran', icon: 'users', ability: 'pengguna.kelola' },
      {
        key: 'pengaturan',
        label: 'Pengaturan',
        icon: 'sliders',
        href: '/dashboard/pengaturan',
        ability: 'pengaturan.kelola',
      },
      { key: 'audit', label: 'Log Audit', icon: 'shield', ability: 'audit.lihat' },
    ],
  },
];

/** Grup menu yang boleh dilihat peran ini; grup tanpa item dibuang. Kosmetik, bukan kontrol akses. */
export function navFor(role: Role) {
  return GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(role, i.ability)) })).filter(
    (g) => g.items.length > 0,
  );
}
