import type { Staff } from './session';

/**
 * Kewajiban 2FA (PRD 6.7: wajib untuk kedua peran). Staf yang sudah masuk tetapi belum mengaktifkan 2FA hanya
 * boleh membuka halaman aktivasi dan keluar; semua halaman dan endpoint dashboard lain diarahkan ke aktivasi.
 * Diterapkan di middleware, sehingga tidak ada halaman yang bisa lupa memeriksanya.
 */
export const TWO_FACTOR_SETUP_PATH = '/dashboard/keamanan/2fa';

const ALLOWED_WITHOUT_2FA = new Set([TWO_FACTOR_SETUP_PATH, '/dashboard/keluar']);

export function twoFactorGate(
  staff: Pick<Staff, 'twoFactorEnabled'>,
  pathname: string,
): 'ok' | 'setup' {
  if (staff.twoFactorEnabled) return 'ok';
  return ALLOWED_WITHOUT_2FA.has(pathname.replace(/\/+$/, '')) ? 'ok' : 'setup';
}
