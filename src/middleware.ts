import { defineMiddleware } from 'astro:middleware';
import { isSameOriginRequest } from './server/auth/origin';
import { getStaff } from './server/auth/session';

/**
 * Pagar dashboard: semua `/dashboard/**` kecuali halaman masuk dan halaman status akses mewajibkan sesi staf
 * aktif. Tanpa sesi, pengunjung diarahkan ke halaman masuk (dengan penanda "sesi berakhir" bila cookie sesi
 * ada tetapi tidak lagi valid). Izin per kemampuan diperiksa di tiap halaman dan endpoint aksi (`can`), bukan
 * hanya di sini. Semua respons dashboard bersifat pribadi: tidak di-cache dan tidak diindeks.
 */
const OPEN_PATHS = new Set([
  '/dashboard/masuk',
  '/dashboard/sesi-berakhir',
  '/dashboard/tidak-ada-akses',
]);

/** Nama cookie sesi Better Auth (cookiePrefix "arj"). */
const SESSION_COOKIE = 'arj.session_token';

function markPrivate(response: Response): Response {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  if (pathname !== '/dashboard' && !pathname.startsWith('/dashboard/')) return next();

  // Permintaan yang mengubah data harus berasal dari situs ini (termasuk POST masuk, agar tidak ada login CSRF).
  const siteOrigin = new URL(process.env.PUBLIC_SITE_URL ?? context.url.origin).origin;
  if (!isSameOriginRequest(context.request, [context.url.origin, siteOrigin])) {
    return markPrivate(new Response('Permintaan ditolak', { status: 403 }));
  }

  const staff = await getStaff(context.request.headers);
  if (staff) context.locals.staff = staff;
  if (staff || OPEN_PATHS.has(pathname)) return markPrivate(await next());

  const params = new URLSearchParams({ lanjut: pathname + search });
  if (context.cookies.has(SESSION_COOKIE)) params.set('sesi', 'berakhir');
  return markPrivate(context.redirect(`/dashboard/masuk?${params}`, 303));
});
