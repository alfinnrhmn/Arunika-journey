import type { Role } from './permissions';
import { rateLimit } from '../rate-limit';
import { getAuth } from './auth';

/**
 * Pembungkus sesi staf untuk halaman dan endpoint. Halaman tidak memanggil Better Auth langsung: mereka memakai
 * fungsi di sini agar aturan (hanya pengguna aktif, peran valid, IP tepercaya untuk pembatas laju) ada di satu tempat.
 */
export interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
}

const ROLES: readonly string[] = ['owner', 'admin_ops'];

/** Staf dari sesi pada permintaan ini, atau null (tanpa sesi, sesi berakhir, akun tidak aktif, peran tidak dikenal). */
export async function getStaff(headers: Headers): Promise<Staff | null> {
  const result = await getAuth().api.getSession({ headers });
  const user = result?.user as
    { id: string; name: string; email: string; role?: string; status?: string } | undefined;
  if (!user || user.status !== 'active' || !user.role || !ROLES.includes(user.role)) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}

/** Header untuk Better Auth dengan IP klien dari soket (bukan header buatan klien) agar pembatas laju tidak bisa dikelabui. */
function withClientIp(source: Headers, ip: string | undefined) {
  const h = new Headers(source);
  if (ip) h.set('x-forwarded-for', ip);
  return h;
}

export type SignInResult =
  | { ok: true; setCookies: string[] }
  | { ok: false; reason: 'invalid' | 'rate_limited' | 'inactive'; retryAfter?: number };

/** Batas percobaan masuk: per IP dan per email dalam jendela yang sama (penguncian sementara, PRD 6.7). */
export const LOGIN_WINDOW_MS = 15 * 60_000;
export const LOGIN_MAX_PER_IP = 5;
export const LOGIN_MAX_PER_EMAIL = 10;

/**
 * Masuk dengan email dan sandi. Galat `invalid` sengaja sama untuk email tidak dikenal dan sandi salah.
 * Cookie sesi dikembalikan sebagai daftar nilai Set-Cookie untuk dipasang pada respons oleh pemanggil.
 */
export async function signInStaff(
  request: Request,
  credentials: { email: string; password: string },
  ip?: string,
): Promise<SignInResult> {
  const email = credentials.email.trim().toLowerCase();

  // Pembatas laju Better Auth tidak berlaku untuk panggilan auth.api dari server, jadi dipasang di sini.
  // Per IP menahan penebakan dari satu sumber; per email menahan penebakan terdistribusi ke satu akun.
  // Keduanya dihitung SEBELUM sandi diperiksa, sehingga tebakan yang benar pun tidak lolos saat terkunci.
  const byIp = rateLimit(`login:ip:${ip ?? 'tidak-diketahui'}`, LOGIN_MAX_PER_IP, LOGIN_WINDOW_MS);
  const byEmail = rateLimit(`login:email:${email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
  if (!byIp.allowed || !byEmail.allowed) {
    return {
      ok: false,
      reason: 'rate_limited',
      retryAfter: Math.max(
        byIp.allowed ? 0 : byIp.retryAfter,
        byEmail.allowed ? 0 : byEmail.retryAfter,
      ),
    };
  }

  const res = await getAuth().api.signInEmail({
    body: { email, password: credentials.password },
    headers: withClientIp(request.headers, ip),
    asResponse: true,
  });
  if (res.ok) return { ok: true, setCookies: res.headers.getSetCookie() };
  if (res.status === 403) return { ok: false, reason: 'inactive' };
  return { ok: false, reason: 'invalid' };
}

/** Keluar: menghapus sesi di database dan mengembalikan Set-Cookie yang mengosongkan cookie. */
export async function signOutStaff(request: Request): Promise<string[]> {
  const res = await getAuth().api.signOut({ headers: request.headers, asResponse: true });
  return res.headers.getSetCookie();
}

/** Respons redirect 303 dengan cookie dari Better Auth terpasang. */
export function redirectWithCookies(location: string, setCookies: string[]): Response {
  const headers = new Headers({ Location: location });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 303, headers });
}

/**
 * Tujuan setelah masuk dari parameter `lanjut`: hanya jalur di dalam dashboard yang diterima, selain itu
 * ke ringkasan. Mencegah open redirect (mis. `//situs-lain.com` atau `https://...`).
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return '/dashboard';
  // Segmen titik-titik, garis miring ganda, dan garis miring terbalik dinormalkan browser menjadi jalur di luar
  // dashboard atau ke host lain: tolak.
  if (value.includes('..') || value.includes('//') || value.includes('\\')) return '/dashboard';
  if (!/^\/dashboard(\/[A-Za-z0-9\-._~%/]*)?(\?[A-Za-z0-9\-._~%&=/]*)?$/.test(value)) {
    return '/dashboard';
  }
  return value;
}
