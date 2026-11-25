import { afterAll, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { auditLogs, sessions, twoFactors, users } from '../../src/server/db/schema';
import { getStaff, signInStaff } from '../../src/server/auth/session';
import { createStaffUser } from '../../src/server/auth/users';
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  regenerateBackupCodes,
  resetTwoFactor,
  verifyTwoFactorLogin,
  TWO_FACTOR_MAX_PER_IP,
} from '../../src/server/auth/two-factor';

afterAll(async () => {
  await closeDb();
});

const db = () => getDb();
const uid = () => uuidv7().slice(-12);
const PASSWORD = 'sandi-uji-yang-cukup-panjang';
const req = (headers?: Headers) =>
  new Request('http://localhost:4321/dashboard/masuk', { method: 'POST', headers });
let ipSeq = 0;
const ip = () => `10.88.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

// ---- TOTP RFC 6238 independen (HMAC-SHA1, 6 digit, 30 dtk): bukan pustaka yang dipakai server ----
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of input.replace(/=+$/, '').toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function totpAt(secretB32: string, windowOffset = 0, now = Date.now()): string {
  const counter = Math.floor(now / 1000 / 30) + windowOffset;
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', base32Decode(secretB32)).update(buf).digest();
  const o = h[19]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}
const secretOf = (uri: string) => new URL(uri).searchParams.get('secret')!;
/** Kode 6 digit yang pasti salah (tidak sama dengan jendela sebelumnya, sekarang, maupun berikutnya). */
const wrongCode = (secret: string) => {
  const valid = new Set([-1, 0, 1].map((o) => totpAt(secret, o)));
  for (let i = 0; i < 1000; i++) {
    const c = String(100000 + i);
    if (!valid.has(c)) return c;
  }
  throw new Error('tidak ada kode salah');
};

const cookieHeaders = (setCookies: string[]) =>
  new Headers({ cookie: setCookies.map((c) => c.split(';')[0]).join('; ') });

async function makeUser(over: { status?: 'active' | 'disabled' } = {}) {
  const email = `dua-${uid()}@uji.example`;
  const u = await createStaffUser(db(), {
    email,
    name: 'Staf Dua',
    role: 'admin_ops',
    password: PASSWORD,
  });
  if (over.status) await db().update(users).set({ status: over.status }).where(eq(users.id, u.id));
  return { ...u, email };
}

/** Pengguna dengan 2FA aktif penuh (lewat jalur aktivasi sungguhan). */
async function userWith2fa() {
  const user = await makeUser();
  const login = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
  if (!login.ok) throw new Error('login awal gagal');
  const headers = cookieHeaders(login.setCookies);
  const setup = await beginTwoFactorSetup(req(headers), { staffId: user.id, password: PASSWORD });
  if (!setup.ok) throw new Error('aktivasi gagal: ' + setup.reason);
  const secret = secretOf(setup.totpURI);
  const confirm = await confirmTwoFactorSetup(req(headers), {
    staffId: user.id,
    code: totpAt(secret),
  });
  expect(confirm.ok, JSON.stringify(confirm)).toBe(true);
  if (!confirm.ok) throw new Error('konfirmasi gagal');
  // Verifikasi pertama mengganti sesi: yang dipakai selanjutnya adalah cookie baru dari konfirmasi.
  expect(await getStaff(headers), 'sesi lama dihapus saat aktivasi').toBeNull();
  return {
    user,
    secret,
    backupCodes: setup.backupCodes,
    headers: cookieHeaders(confirm.setCookies),
  };
}

/** Langkah pertama masuk untuk pengguna ber-2FA: hasilnya cookie tantangan, belum sesi. */
async function challenge(user: { email: string }, theIp = ip()) {
  const r = await signInStaff(req(), { email: user.email, password: PASSWORD }, theIp);
  if (!r.ok) throw new Error('sandi ditolak: ' + r.reason);
  expect(r.twoFactor).toBe(true);
  return { headers: cookieHeaders(r.setCookies), setCookies: r.setCookies, ip: theIp };
}

describe('aktivasi 2FA', () => {
  it('pengguna tanpa 2FA mendapat sesi langsung, dan staf.twoFactorEnabled false (middleware mewajibkan aktivasi)', async () => {
    const user = await makeUser();
    const r = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
    expect(r).toMatchObject({ ok: true, twoFactor: false });
    if (!r.ok) return;
    const staff = await getStaff(cookieHeaders(r.setCookies));
    expect(staff).toMatchObject({ id: user.id, twoFactorEnabled: false });
  });

  it('butuh sandi saat ini; URI otpauth dan 10 kode cadangan keluar sekali; belum aktif sebelum kode pertama', async () => {
    const user = await makeUser();
    const login = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
    if (!login.ok) throw new Error('login');
    const headers = cookieHeaders(login.setCookies);

    expect(
      await beginTwoFactorSetup(req(headers), { staffId: user.id, password: 'sandi-salah-sekali' }),
    ).toMatchObject({
      ok: false,
      reason: 'invalid_password',
    });

    const s = await beginTwoFactorSetup(req(headers), { staffId: user.id, password: PASSWORD });
    expect(s.ok).toBe(true);
    if (!s.ok) return;
    expect(s.totpURI).toMatch(/^otpauth:\/\/totp\//);
    expect(s.totpURI).toContain('Arunika');
    expect(s.backupCodes).toHaveLength(10);
    expect(new Set(s.backupCodes).size).toBe(10);

    // rahasia tersimpan terenkripsi, bukan dalam bentuk yang muncul di URI
    const [row] = await db().select().from(twoFactors).where(eq(twoFactors.userId, user.id));
    expect(row!.verified).toBe(false);
    expect(row!.secret).not.toContain(secretOf(s.totpURI));
    expect(JSON.stringify(row)).not.toContain(s.backupCodes[0]!);
    expect((await getStaff(headers))!.twoFactorEnabled).toBe(false);
  });

  it('kode pertama salah ditolak dan tidak mengaktifkan; kode benar mengaktifkan', async () => {
    const user = await makeUser();
    const login = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
    if (!login.ok) throw new Error('login');
    const headers = cookieHeaders(login.setCookies);
    const s = await beginTwoFactorSetup(req(headers), { staffId: user.id, password: PASSWORD });
    if (!s.ok) throw new Error('setup');
    const secret = secretOf(s.totpURI);

    expect(
      await confirmTwoFactorSetup(req(headers), { staffId: user.id, code: wrongCode(secret) }),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    expect(
      await confirmTwoFactorSetup(req(headers), { staffId: user.id, code: 'abcdef' }),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    expect((await getStaff(headers))!.twoFactorEnabled).toBe(false);

    const done = await confirmTwoFactorSetup(req(headers), {
      staffId: user.id,
      code: totpAt(secret),
    });
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    // Aktivasi mengganti sesi: cookie lama tidak berlaku, cookie baru dari konfirmasi berlaku dan sudah ber-2FA.
    expect(await getStaff(headers)).toBeNull();
    const fresh = cookieHeaders(done.setCookies);
    expect((await getStaff(fresh))!.twoFactorEnabled).toBe(true);
    // sudah aktif: tidak bisa memulai ulang tanpa reset
    expect(
      await beginTwoFactorSetup(req(fresh), { staffId: user.id, password: PASSWORD }),
    ).toMatchObject({ ok: false, reason: 'already_enabled' });
  });
});

describe('masuk dengan 2FA', () => {
  it('sandi benar saja belum membuat sesi; kode TOTP benar membuat sesi', async () => {
    const { user, secret } = await userWith2fa();
    const lastLogin = async () =>
      (await db().select().from(users).where(eq(users.id, user.id)))[0]!.lastLoginAt!.getTime();
    const before = await lastLogin();
    await new Promise((r) => setTimeout(r, 15)); // agar perbedaan waktu terukur

    const c = await challenge(user);
    expect(await getStaff(c.headers), 'belum ada sesi sebelum kode').toBeNull();
    expect(await lastLogin(), 'login terakhir TIDAK dicatat sebelum kode benar').toBe(before);

    const r = await verifyTwoFactorLogin(
      req(c.headers),
      { kind: 'totp', code: totpAt(secret) },
      c.ip,
    );
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    expect(await lastLogin(), 'login terakhir dicatat setelah kode benar').toBeGreaterThan(before);
    const session = r.setCookies.find((x) => x.startsWith('arj.session_token='));
    expect(session!.toLowerCase()).toContain('httponly');
    expect(await getStaff(cookieHeaders(r.setCookies))).toMatchObject({
      id: user.id,
      twoFactorEnabled: true,
    });
  });

  it('salah ketik lalu benar pada tantangan yang sama: sesi terbentuk dan benar-benar tersimpan', async () => {
    const { user, secret } = await userWith2fa();
    const c = await challenge(user);
    expect(
      await verifyTwoFactorLogin(req(c.headers), { kind: 'totp', code: wrongCode(secret) }, c.ip),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    const r = await verifyTwoFactorLogin(
      req(c.headers),
      { kind: 'totp', code: totpAt(secret) },
      c.ip,
    );
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    // sesi aktivasi (dari userWith2fa) + sesi masuk ini; tantangan tidak meninggalkan sesi sementara
    expect(await db().select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(2);
    expect(await getStaff(cookieHeaders(r.setCookies))).toMatchObject({ id: user.id });
  });

  it('kode benar tidak memakan jatah IP: banyak staf sah dari satu IP (kantor) tidak saling terkunci', async () => {
    const office = ip();
    for (let i = 0; i < TWO_FACTOR_MAX_PER_IP + 3; i++) {
      const { user, secret } = await userWith2fa();
      const c = await challenge(user, office);
      const r = await verifyTwoFactorLogin(
        req(c.headers),
        { kind: 'totp', code: totpAt(secret) },
        office,
      );
      expect(r.ok, `login sah ke-${i + 1}: ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it('kode salah ditolak; tantangan tanpa cookie dianggap kedaluwarsa', async () => {
    const { user, secret } = await userWith2fa();
    const c = await challenge(user);
    expect(
      await verifyTwoFactorLogin(req(c.headers), { kind: 'totp', code: wrongCode(secret) }, c.ip),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    expect(
      await verifyTwoFactorLogin(req(c.headers), { kind: 'totp', code: '12' }, c.ip),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    // tanpa cookie tantangan
    expect(
      await verifyTwoFactorLogin(req(), { kind: 'totp', code: totpAt(secret) }, ip()),
    ).toMatchObject({ ok: false, reason: 'expired' });
  });

  it('tebakan berulang dihentikan: setelah batas, bahkan kode yang benar ditolak sementara', async () => {
    const { user, secret } = await userWith2fa();
    const c = await challenge(user);
    const outcomes: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = await verifyTwoFactorLogin(
        req(c.headers),
        { kind: 'totp', code: wrongCode(secret) },
        c.ip,
      );
      outcomes.push(r.ok ? 'ok' : r.reason);
    }
    expect(outcomes.slice(0, 5)).toEqual(Array(5).fill('invalid'));
    expect(['locked', 'expired']).toContain(outcomes[5]);

    // kode benar pun tidak lolos: tantangan dibatalkan atau akun terkunci
    const retry = await verifyTwoFactorLogin(
      req(c.headers),
      { kind: 'totp', code: totpAt(secret) },
      c.ip,
    );
    expect(retry.ok).toBe(false);
    // dan sandi + kode benar dari tantangan BARU tetap ditolak selama akun terkunci
    const fresh = await challenge(user);
    const locked = await verifyTwoFactorLogin(
      req(fresh.headers),
      { kind: 'totp', code: totpAt(secret) },
      fresh.ip,
    );
    expect(locked).toMatchObject({ ok: false, reason: 'locked' });
  });

  it('batas per IP: percobaan ke-11 dari IP yang sama ditolak walau tanpa tantangan', async () => {
    const same = ip();
    const results = [];
    for (let i = 0; i < TWO_FACTOR_MAX_PER_IP + 1; i++) {
      results.push(await verifyTwoFactorLogin(req(), { kind: 'totp', code: '123456' }, same));
    }
    expect(results.at(-1)).toMatchObject({ ok: false, reason: 'rate_limited' });
    expect(
      results.slice(0, TWO_FACTOR_MAX_PER_IP).every((r) => !r.ok && r.reason === 'expired'),
    ).toBe(true);
  });

  it('kode cadangan berlaku sekali pakai', async () => {
    const { user, backupCodes } = await userWith2fa();
    const code = backupCodes[0]!;

    const c1 = await challenge(user);
    const ok = await verifyTwoFactorLogin(req(c1.headers), { kind: 'backup', code }, c1.ip);
    expect(ok.ok, JSON.stringify(ok)).toBe(true);
    if (ok.ok) expect(await getStaff(cookieHeaders(ok.setCookies))).toMatchObject({ id: user.id });

    const c2 = await challenge(user);
    expect(
      await verifyTwoFactorLogin(req(c2.headers), { kind: 'backup', code }, c2.ip),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    // kode cadangan lain masih berlaku
    const c3 = await challenge(user);
    expect(
      (
        await verifyTwoFactorLogin(
          req(c3.headers),
          { kind: 'backup', code: backupCodes[1]! },
          c3.ip,
        )
      ).ok,
    ).toBe(true);
  });

  it('akun nonaktif tidak bisa melewati langkah sandi walau 2FA aktif', async () => {
    const { user } = await userWith2fa();
    await db().update(users).set({ status: 'disabled' }).where(eq(users.id, user.id));
    expect(await signInStaff(req(), { email: user.email, password: PASSWORD }, ip())).toEqual({
      ok: false,
      reason: 'inactive',
    });
  });
});

describe('kode cadangan dan reset', () => {
  it('membuat ulang kode cadangan butuh sandi dan menghanguskan yang lama', async () => {
    const { user, backupCodes, headers } = await userWith2fa();
    expect(
      await regenerateBackupCodes(req(headers), {
        staffId: user.id,
        password: 'sandi-salah-sekali',
      }),
    ).toMatchObject({ ok: false, reason: 'invalid_password' });

    const r = await regenerateBackupCodes(req(headers), { staffId: user.id, password: PASSWORD });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backupCodes).toHaveLength(10);
    expect(r.backupCodes).not.toContain(backupCodes[0]);

    const c = await challenge(user);
    expect(
      await verifyTwoFactorLogin(req(c.headers), { kind: 'backup', code: backupCodes[0]! }, c.ip),
    ).toMatchObject({ ok: false, reason: 'invalid' });
    const c2 = await challenge(user);
    expect(
      (
        await verifyTwoFactorLogin(
          req(c2.headers),
          { kind: 'backup', code: r.backupCodes[0]! },
          c2.ip,
        )
      ).ok,
    ).toBe(true);
  });

  it('reset: rahasia dihapus, tanda 2FA mati, semua sesi dicabut, tercatat di audit; masuk berikutnya wajib aktivasi ulang', async () => {
    const { user, headers } = await userWith2fa();
    expect(await getStaff(headers)).not.toBeNull();
    const owner = await createStaffUser(db(), {
      email: `own-${uid()}@uji.example`,
      name: 'Pemilik',
      role: 'owner',
      password: PASSWORD,
    });

    await resetTwoFactor(db(), { userId: user.id, actorId: owner.id, via: 'owner' });

    const [u] = await db().select().from(users).where(eq(users.id, user.id));
    expect(u!.twoFactorEnabled).toBe(false);
    expect(await db().select().from(twoFactors).where(eq(twoFactors.userId, user.id))).toHaveLength(
      0,
    );
    expect(await db().select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);
    expect(await getStaff(headers), 'sesi lama tidak berlaku').toBeNull();
    const [log] = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, user.id), eq(auditLogs.action, 'user.2fa_reset')));
    expect(log!.actorId).toBe(owner.id);

    const again = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
    expect(again).toMatchObject({ ok: true, twoFactor: false });
    if (again.ok)
      expect((await getStaff(cookieHeaders(again.setCookies)))!.twoFactorEnabled).toBe(false);
  });

  it('reset oleh jalur CLI mencatat tanpa pelaku; pengguna tidak dikenal: galat', async () => {
    const { user } = await userWith2fa();
    await resetTwoFactor(db(), { userId: user.id, actorId: null, via: 'cli' });
    const [log] = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, user.id), eq(auditLogs.action, 'user.2fa_reset')));
    expect(log!.actorId).toBeNull();
    await expect(
      resetTwoFactor(db(), { userId: uuidv7(), actorId: null, via: 'cli' }),
    ).rejects.toThrow(/tidak ditemukan/);
  });
});
