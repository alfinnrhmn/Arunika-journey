import type { Role } from './permissions';
import { rateLimitFail, rateLimitPeek, rateLimitReset } from '../rate-limit';
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
  /** 2FA sudah aktif. Staf tanpa 2FA hanya boleh membuka halaman aktivasi (lihat two-factor-gate.ts). */
  twoFactorEnabled: boolean;
}

const ROLES: readonly string[] = ['owner', 'admin_ops'];

/** Staf dari sesi pada permintaan ini, atau null (tanpa sesi, sesi berakhir, akun tidak aktif, peran tidak dikenal). */
export async function getStaff(headers: Headers): Promise<Staff | null> {
  const result = await getAuth().api.getSession({ headers });
  const user = result?.user as
    | {
        id: string;
        name: string;
        email: string;
        role?: string;
        status?: string;
        twoFactorEnabled?: boolean | null;
      }
    | undefined;
  if (!user || user.status !== 'active' || !user.role || !ROLES.includes(user.role)) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    twoFactorEnabled: user.twoFactorEnabled === true,
  };
}

/** Header untuk Better Auth dengan IP klien dari soket (bukan header buatan klien) agar pembatas laju tidak bisa dikelabui. */
export function withClientIp(source: Headers, ip: string | undefined) {
  const h = new Headers(source);
  if (ip) h.set('x-forwarded-for', ip);
  return h;
}

export type SignInResult =
  /** `twoFactor: true` = sandi benar tetapi belum ada sesi: lanjutkan ke langkah kode 2FA (cookie tantangan terpasang). */
  | { ok: true; twoFactor: boolean; setCookies: string[] }
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
  // Hanya percobaan GAGAL yang dihitung: login yang berhasil tidak memakan jatah, sehingga staf yang berbagi IP
  // (satu kantor, satu Wi-Fi) tidak saling mengunci. Pemeriksaan dilakukan SEBELUM sandi diperiksa, jadi tebakan
  // yang benar pun tidak lolos saat terkunci.
  const ipKey = `login:ip:${ip ?? 'tidak-diketahui'}`;
  const emailKey = `login:email:${email}`;
  const byIp = rateLimitPeek(ipKey, LOGIN_MAX_PER_IP);
  const byEmail = rateLimitPeek(emailKey, LOGIN_MAX_PER_EMAIL);
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
  if (!res.ok) {
    rateLimitFail(ipKey, LOGIN_WINDOW_MS);
    rateLimitFail(emailKey, LOGIN_WINDOW_MS);
  } else {
    // Sandi benar: hitungan email dibersihkan. Hitungan IP sengaja TIDAK dibersihkan, kalau tidak penyerang yang
    // punya satu akun sah dapat mengosongkan pembatasnya sendiri lalu terus menebak sandi akun lain.
    rateLimitReset(emailKey);
  }
  if (res.ok) {
    // Pengguna ber-2FA mendapat penanda twoFactorRedirect dan cookie tantangan, BUKAN cookie sesi.
    const body = (await res
      .clone()
      .json()
      .catch(() => null)) as { twoFactorRedirect?: boolean } | null;
    return {
      ok: true,
      twoFactor: body?.twoFactorRedirect === true,
      setCookies: res.headers.getSetCookie(),
    };
  }
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
