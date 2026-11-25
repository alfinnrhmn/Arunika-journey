import type { APIRoute } from 'astro';
import { redirectWithCookies, signOutStaff } from '../../server/auth/session';

/** Keluar dari dashboard (POST, dilindungi cek asal): sesi dihapus di database dan cookie dikosongkan. */
export const POST: APIRoute = async ({ request }) => {
  const cookies = await signOutStaff(request);
  return redirectWithCookies('/dashboard/masuk', cookies);
};
