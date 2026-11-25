import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { uuidv7 } from '../db/id';
import { accounts, sessions, users, verifications } from '../db/schema';

/**
 * Autentikasi pengguna internal (Owner dan Admin Operasional) dengan Better Auth: email + sandi, tanpa
 * pendaftaran publik (akun dibuat Owner/skrip). Konfigurasi dibuat malas (saat pertama dipakai) agar mengimpor
 * modul ini tidak membuka koneksi database atau menuntut secret saat build.
 *
 * Keamanan:
 * - Sandi disimpan sebagai hash (scrypt bawaan Better Auth); minimal 12 karakter.
 * - Percobaan masuk dibatasi di signInStaff (5 per 15 menit per IP, 10 per email) dan galatnya tidak membedakan
 *   email salah dari sandi salah. Handler HTTP Better Auth tidak dibuka.
 * - Pengguna berstatus bukan `active` (diundang/dinonaktifkan) tidak bisa membuat sesi.
 * - Cookie sesi httpOnly, SameSite Lax, Secure di produksi; sesi tidak di-cache di cookie sehingga penonaktifan
 *   akun berlaku pada permintaan berikutnya.
 * - 2FA TOTP (wajib untuk kedua peran menurut PRD) ditambahkan sebagai langkah terpisah lewat plugin two-factor;
 *   kolom `users.two_factor_enabled` sudah disiapkan.
 */
export const SESSION_HOURS = 12;
export const MIN_PASSWORD_LENGTH = 12;

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET belum diatur atau terlalu pendek (minimal 32 karakter)');
  }
  const baseURL = process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321';
  const isProd = process.env.NODE_ENV === 'production';
  const db = getDb();

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        role: { type: 'string', required: false, defaultValue: 'admin_ops', input: false },
        status: { type: 'string', required: false, defaultValue: 'invited', input: false },
        lastLoginAt: { type: 'date', required: false, input: false },
      },
    },
    session: {
      expiresIn: SESSION_HOURS * 3600,
      updateAge: 3600,
    },
    // Pembatas laju bawaan Better Auth hanya berlaku di handler HTTP-nya, yang SENGAJA tidak dibuka (tidak ada
    // /api/auth/*). Panggilan server lewat auth.api tidak melewatinya, jadi pembatas masuk ada di signInStaff.
    advanced: {
      cookiePrefix: 'arj',
      useSecureCookies: isProd,
      database: { generateId: () => uuidv7() },
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    databaseHooks: {
      session: {
        create: {
          // Hanya pengguna aktif yang boleh punya sesi (pengguna diundang atau dinonaktifkan ditolak).
          before: async (session) => {
            const [u] = await db
              .select({ status: users.status })
              .from(users)
              .where(eq(users.id, session.userId));
            if (!u || u.status !== 'active') {
              throw new APIError('FORBIDDEN', { message: 'Akun tidak aktif' });
            }
          },
          after: async (session) => {
            await db
              .update(users)
              .set({ lastLoginAt: new Date() })
              .where(eq(users.id, session.userId));
          },
        },
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Instans Better Auth (dibuat sekali, malas). */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
