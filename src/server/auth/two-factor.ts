import { eq } from 'drizzle-orm';
import { writeAudit } from '../audit';
import { getDb } from '../db';
import { sessions, twoFactors, users } from '../db/schema';
import { rateLimit, rateLimitFail, rateLimitPeek } from '../rate-limit';
import { getAuth } from './auth';
import { withClientIp } from './session';

/**
 * 2FA TOTP untuk staf: langkah kode saat masuk, aktivasi, kode cadangan, dan reset. Halaman memakai fungsi di sini,
 * bukan Better Auth langsung. Berlapis menahan tebakan kode: batas per IP di sini, batas percobaan per tantangan
 * masuk, dan pengunci akun (5 kegagalan beruntun mengunci 15 menit) milik plugin. Pembatas bawaan plugin hanya
 * berlaku di handler HTTP (tidak dibuka), jadi batas per IP dipasang sendiri.
 */
type Db = ReturnType<typeof getDb>;
type ErrorBody = { code?: string; message?: string } | null;

const errorBody = async (res: Response): Promise<ErrorBody> =>
  (await res
    .clone()
    .json()
    .catch(() => null)) as ErrorBody;

/** Cookie tantangan 2FA (bertanda tangan, 10 menit) yang dipasang setelah sandi benar dan sebelum kode diverifikasi. */
export const TWO_FACTOR_CHALLENGE_COOKIE = 'arj.two_factor';

export const TWO_FACTOR_WINDOW_MS = 10 * 60_000;
export const TWO_FACTOR_MAX_PER_IP = 10;
const SETUP_WINDOW_MS = 15 * 60_000;
const SETUP_MAX = 5;

export type TwoFactorLoginResult =
  | { ok: true; setCookies: string[] }
  | {
      ok: false;
      /** invalid: kode salah; expired: tantangan masuk habis (ulangi dari sandi); locked: akun terkunci sementara. */
      reason: 'invalid' | 'expired' | 'locked' | 'rate_limited' | 'inactive';
      retryAfter?: number;
    };

/**
 * Langkah kedua masuk: kode TOTP 6 digit atau satu kode cadangan (sekali pakai). Tantangan dibawa cookie bertanda
 * tangan dari langkah pertama (`signInStaff` dengan `twoFactor: true`). Berhasil: cookie sesi dikembalikan.
 */
export async function verifyTwoFactorLogin(
  request: Request,
  input: { kind: 'totp' | 'backup'; code: string },
  ip?: string,
): Promise<TwoFactorLoginResult> {
  // Hanya percobaan GAGAL yang dihitung per IP: kode yang benar tidak memakan jatah, jadi staf yang berbagi IP
  // (satu kantor) tidak saling terkunci. Pemeriksaan dilakukan sebelum kode dinilai.
  const ipKey = `2fa:ip:${ip ?? 'tidak-diketahui'}`;
  const limit = rateLimitPeek(ipKey, TWO_FACTOR_MAX_PER_IP);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited', retryAfter: limit.retryAfter };

  const result = await verifyTwoFactorCode(request, input, ip);
  if (!result.ok) rateLimitFail(ipKey, TWO_FACTOR_WINDOW_MS);
  return result;
}

async function verifyTwoFactorCode(
  request: Request,
  input: { kind: 'totp' | 'backup'; code: string },
  ip?: string,
): Promise<TwoFactorLoginResult> {
  const code = input.kind === 'totp' ? input.code.replace(/\s+/g, '') : input.code.trim();
  if (input.kind === 'totp' ? !/^\d{6}$/.test(code) : code.length < 6 || code.length > 64) {
    return { ok: false, reason: 'invalid' };
  }

  const api = getAuth().api;
  const headers = withClientIp(request.headers, ip);
  const res =
    input.kind === 'totp'
      ? await api.verifyTOTP({ body: { code }, headers, asResponse: true })
      : await api.verifyBackupCode({ body: { code }, headers, asResponse: true });
  if (res.ok) {
    // Login selesai hanya setelah kode benar: catat "login terakhir" sekarang (lihat hook sesi di auth.ts).
    const done = (await res
      .clone()
      .json()
      .catch(() => null)) as { user?: { id?: string } } | null;
    if (done?.user?.id) {
      await getDb()
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, done.user.id));
    }
    return { ok: true, setCookies: res.headers.getSetCookie() };
  }

  const body = await errorBody(res);
  if (body?.code === 'ACCOUNT_TEMPORARILY_LOCKED') return { ok: false, reason: 'locked' };
  if (
    body?.code === 'INVALID_TWO_FACTOR_COOKIE' ||
    body?.code === 'TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE'
  ) {
    return { ok: false, reason: 'expired' };
  }
  if (res.status === 403) return { ok: false, reason: 'inactive' };
  return { ok: false, reason: 'invalid' };
}

export type TwoFactorSetupStart =
  | { ok: true; totpURI: string; backupCodes: string[] }
  | {
      ok: false;
      reason: 'invalid_password' | 'already_enabled' | 'rate_limited';
      retryAfter?: number;
    };

/**
 * Memulai aktivasi: butuh sandi saat ini. Mengembalikan URI otpauth (untuk QR) dan kode cadangan dalam bentuk asli,
 * SEKALI ini saja; 2FA baru aktif setelah `confirmTwoFactorSetup` menerima kode pertama.
 */
export async function beginTwoFactorSetup(
  request: Request,
  input: { staffId: string; password: string },
  ip?: string,
): Promise<TwoFactorSetupStart> {
  const limit = rateLimit(`2fa-setup:${input.staffId}`, SETUP_MAX, SETUP_WINDOW_MS);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited', retryAfter: limit.retryAfter };

  const res = await getAuth().api.enableTwoFactor({
    body: { password: input.password, method: 'totp' },
    headers: withClientIp(request.headers, ip),
    asResponse: true,
  });
  if (res.ok) {
    const body = (await res.json()) as { totpURI?: string; backupCodes?: string[] };
    if (!body.totpURI || !body.backupCodes) return { ok: false, reason: 'invalid_password' };
    return { ok: true, totpURI: body.totpURI, backupCodes: body.backupCodes };
  }
  const body = await errorBody(res);
  if (body?.code === 'TOTP_ALREADY_ENABLED') return { ok: false, reason: 'already_enabled' };
  return { ok: false, reason: 'invalid_password' };
}

export type TwoFactorSetupConfirm =
  /** Verifikasi pertama MENGGANTI sesi (yang lama dihapus): pemanggil wajib memasang `setCookies` pada respons. */
  | { ok: true; setCookies: string[] }
  | { ok: false; reason: 'invalid' | 'locked' | 'rate_limited'; retryAfter?: number };

/**
 * Menyelesaikan aktivasi dengan kode pertama dari aplikasi autentikator; sesudahnya `twoFactorEnabled` menjadi true.
 * Plugin membuat sesi BARU dan menghapus sesi lama pada langkah ini, jadi cookie baru harus diteruskan ke browser;
 * kalau tidak, pengguna terlempar keluar tepat setelah berhasil mengaktifkan.
 */
export async function confirmTwoFactorSetup(
  request: Request,
  input: { staffId: string; code: string },
  ip?: string,
): Promise<TwoFactorSetupConfirm> {
  const limit = rateLimit(`2fa-setup-code:${input.staffId}`, SETUP_MAX * 2, SETUP_WINDOW_MS);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited', retryAfter: limit.retryAfter };

  const code = input.code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: 'invalid' };
  const res = await getAuth().api.verifyTOTP({
    body: { code },
    headers: withClientIp(request.headers, ip),
    asResponse: true,
  });
  if (res.ok) return { ok: true, setCookies: res.headers.getSetCookie() };
  const body = await errorBody(res);
  return { ok: false, reason: body?.code === 'ACCOUNT_TEMPORARILY_LOCKED' ? 'locked' : 'invalid' };
}

export type BackupCodesResult =
  | { ok: true; backupCodes: string[] }
  | { ok: false; reason: 'invalid_password' | 'not_enabled' | 'rate_limited'; retryAfter?: number };

/** Membuat ulang kode cadangan (yang lama hangus). Butuh sandi saat ini dan 2FA yang sudah aktif. */
export async function regenerateBackupCodes(
  request: Request,
  input: { staffId: string; password: string },
  ip?: string,
): Promise<BackupCodesResult> {
  const limit = rateLimit(`2fa-backup:${input.staffId}`, SETUP_MAX, SETUP_WINDOW_MS);
  if (!limit.allowed) return { ok: false, reason: 'rate_limited', retryAfter: limit.retryAfter };

  const res = await getAuth().api.generateBackupCodes({
    body: { password: input.password },
    headers: withClientIp(request.headers, ip),
    asResponse: true,
  });
  if (res.ok) {
    const body = (await res.json()) as { backupCodes?: string[] };
    return body.backupCodes
      ? { ok: true, backupCodes: body.backupCodes }
      : { ok: false, reason: 'invalid_password' };
  }
  const body = await errorBody(res);
  return {
    ok: false,
    reason: body?.code === 'TWO_FACTOR_NOT_ENABLED' ? 'not_enabled' : 'invalid_password',
  };
}

/**
 * Reset 2FA seorang pengguna (kehilangan ponsel dan kode cadangan): menghapus rahasia, mematikan tanda 2FA,
 * dan mencabut SEMUA sesinya, sehingga saat masuk lagi ia diwajibkan mengaktifkan ulang. Dipakai Owner dari
 * halaman Pengguna (Dashboard 36) dan `npm run user:reset-2fa` untuk pemulihan bila Owner sendiri terkunci.
 * Izin (`pengguna.kelola`, hanya Owner) diperiksa pemanggil; `actorId` kosong untuk jalur CLI.
 */
export async function resetTwoFactor(
  db: Db,
  input: { userId: string; actorId?: string | null; via: 'owner' | 'cli' },
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, input.userId))
      .for('update');
    if (!user) throw new Error('Pengguna tidak ditemukan');
    await tx.delete(twoFactors).where(eq(twoFactors.userId, input.userId));
    await tx.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, input.userId));
    await tx.delete(sessions).where(eq(sessions.userId, input.userId));
    await writeAudit(tx, {
      actorId: input.actorId ?? null,
      action: 'user.2fa_reset',
      entity: 'user',
      entityId: input.userId,
      after: { via: input.via },
    });
  });
}
