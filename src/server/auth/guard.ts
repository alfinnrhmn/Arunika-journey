import { can, type Ability } from './permissions';
import type { Staff } from './session';

/**
 * Penjaga izin untuk halaman dan endpoint aksi dashboard. Middleware sudah memastikan ada sesi staf; penjaga ini
 * memeriksa KEMAMPUAN (matriks peran), karena menyembunyikan menu bukan kontrol akses. Pemakaian:
 *
 *   const g = guard(Astro.locals, 'pembayaran.verifikasi');
 *   if ('response' in g) return g.response;
 *   // g.staff aman dipakai di sini
 */
export function guard(
  locals: { staff?: Staff },
  ability: Ability,
): { staff: Staff } | { response: Response } {
  const staff = locals.staff;
  if (!staff) {
    return {
      response: new Response(null, { status: 303, headers: { Location: '/dashboard/masuk' } }),
    };
  }
  if (!can(staff.role, ability)) {
    return {
      response: new Response(null, {
        status: 303,
        headers: { Location: '/dashboard/tidak-ada-akses' },
      }),
    };
  }
  return { staff };
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export const seeOther = (location: string) =>
  new Response(null, { status: 303, headers: { Location: location } });
