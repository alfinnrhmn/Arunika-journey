import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { accounts, sessions, users } from '../../src/server/db/schema';
import { getAuth } from '../../src/server/auth/auth';
import { getStaff, signInStaff, signOutStaff } from '../../src/server/auth/session';
import { createStaffUser, UserError } from '../../src/server/auth/users';

afterAll(async () => {
  await closeDb();
});

const db = () => getDb();
const uid = () => uuidv7().slice(-12);
const PASSWORD = 'sandi-uji-yang-cukup-panjang';
const req = () => new Request('http://localhost:4321/dashboard/masuk', { method: 'POST' });
/** IP unik per tes: pembatas laju memori dibagi per IP, jangan sampai tes saling mengganggu. */
let ipSeq = 0;
const ip = () => `10.77.${Math.floor(ipSeq / 250)}.${(ipSeq++ % 250) + 1}`;

async function makeUser(
  over: { role?: 'owner' | 'admin_ops'; status?: 'active' | 'disabled' | 'invited' } = {},
) {
  const email = `staf-${uid()}@uji.example`;
  const created = await createStaffUser(db(), {
    email,
    name: 'Staf Uji',
    role: over.role ?? 'admin_ops',
    password: PASSWORD,
  });
  if (over.status && over.status !== 'active') {
    await db().update(users).set({ status: over.status }).where(eq(users.id, created.id));
  }
  return { ...created, email };
}

/** Header Cookie dari daftar Set-Cookie hasil masuk. */
const cookieHeader = (setCookies: string[]) =>
  new Headers({ cookie: setCookies.map((c) => c.split(';')[0]).join('; ') });

async function signedIn(user: { email: string }) {
  const r = await signInStaff(req(), { email: user.email, password: PASSWORD }, ip());
  expect(r.ok, JSON.stringify(r)).toBe(true);
  if (!r.ok) throw new Error('gagal masuk');
  return { headers: cookieHeader(r.setCookies), setCookies: r.setCookies };
}

describe('pembuatan akun staf', () => {
  it('membuat pengguna aktif dengan sandi ter-hash dan email huruf kecil', async () => {
    const email = `Owner-${uid()}@Uji.Example`;
    const u = await createStaffUser(db(), {
      email,
      name: 'Pemilik',
      role: 'owner',
      password: PASSWORD,
    });
    expect(u.email).toBe(email.toLowerCase());

    const [row] = await db().select().from(users).where(eq(users.id, u.id));
    expect(row).toMatchObject({ role: 'owner', status: 'active', emailVerified: true });
    const [acc] = await db().select().from(accounts).where(eq(accounts.userId, u.id));
    expect(acc!.providerId).toBe('credential');
    expect(acc!.password).toBeTruthy();
    expect(acc!.password).not.toContain(PASSWORD); // hanya hash yang tersimpan
  });

  it('menolak sandi pendek, email salah, nama terlalu pendek, sandi sama dengan email, dan email ganda', async () => {
    const base = {
      email: `x-${uid()}@uji.example`,
      name: 'Nama',
      role: 'admin_ops' as const,
      password: PASSWORD,
    };
    const code = async (input: Parameters<typeof createStaffUser>[1]) => {
      const err = await createStaffUser(db(), input).then(
        () => null,
        (e: unknown) => e,
      );
      expect(err).toBeInstanceOf(UserError);
      return (err as UserError).code;
    };
    expect(await code({ ...base, password: 'pendek' })).toBe('invalid');
    expect(await code({ ...base, email: 'bukan-email' })).toBe('invalid');
    expect(await code({ ...base, name: 'A' })).toBe('invalid');
    expect(await code({ ...base, email: 'sama@uji.example', password: 'sama@uji.example' })).toBe(
      'invalid',
    );
    // @ts-expect-error peran di luar daftar harus ditolak walau lolos tipe di runtime
    expect(await code({ ...base, role: 'superadmin' })).toBe('invalid');

    await createStaffUser(db(), base);
    expect(await code({ ...base, email: base.email.toUpperCase() })).toBe('duplicate');
  });
});

describe('masuk, sesi, dan keluar', () => {
  it('masuk dengan kredensial benar: cookie sesi httpOnly, staf terbaca dari sesi, dan lastLoginAt terisi', async () => {
    const user = await makeUser({ role: 'owner' });
    const { headers, setCookies } = await signedIn(user);

    const session = setCookies.find((c) => c.startsWith('arj.session_token='));
    expect(session, 'cookie sesi berawalan arj').toBeTruthy();
    expect(session!.toLowerCase()).toContain('httponly');
    expect(session!.toLowerCase()).toContain('samesite=lax');

    const staff = await getStaff(headers);
    expect(staff).toEqual({
      id: user.id,
      name: 'Staf Uji',
      email: user.email,
      role: 'owner',
      twoFactorEnabled: false,
    });

    const [row] = await db().select().from(users).where(eq(users.id, user.id));
    expect(row!.lastLoginAt).toBeTruthy();
    // sesi berlaku sekitar 12 jam
    const [s] = await db().select().from(sessions).where(eq(sessions.userId, user.id));
    const hours = (s!.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThan(12.1);
  });

  it('sandi salah dan email tidak dikenal menghasilkan jawaban yang sama (tidak membocorkan keberadaan akun)', async () => {
    const user = await makeUser();
    const wrongPass = await signInStaff(
      req(),
      { email: user.email, password: 'sandi-salah-sekali-lho' },
      ip(),
    );
    const unknown = await signInStaff(
      req(),
      { email: `tidak-ada-${uid()}@uji.example`, password: PASSWORD },
      ip(),
    );
    expect(wrongPass).toEqual({ ok: false, reason: 'invalid' });
    expect(unknown).toEqual({ ok: false, reason: 'invalid' });
  });

  it('akun dinonaktifkan atau masih diundang tidak bisa masuk; akun yang dinonaktifkan di tengah sesi langsung ditolak', async () => {
    const disabled = await makeUser({ status: 'disabled' });
    expect(await signInStaff(req(), { email: disabled.email, password: PASSWORD }, ip())).toEqual({
      ok: false,
      reason: 'inactive',
    });
    const invited = await makeUser({ status: 'invited' });
    expect(await signInStaff(req(), { email: invited.email, password: PASSWORD }, ip())).toEqual({
      ok: false,
      reason: 'inactive',
    });
    expect(await db().select().from(sessions).where(eq(sessions.userId, disabled.id))).toHaveLength(
      0,
    );

    const active = await makeUser();
    const { headers } = await signedIn(active);
    expect(await getStaff(headers)).not.toBeNull();
    await db().update(users).set({ status: 'disabled' }).where(eq(users.id, active.id));
    expect(await getStaff(headers)).toBeNull(); // sesi lama tidak lagi berguna
  });

  it('keluar menghapus sesi: cookie lama tidak lagi diterima', async () => {
    const user = await makeUser();
    const { headers } = await signedIn(user);
    expect(await getStaff(headers)).not.toBeNull();

    const cleared = await signOutStaff(
      new Request('http://localhost:4321/dashboard/keluar', { method: 'POST', headers }),
    );
    expect(cleared.some((c) => c.startsWith('arj.session_token=;') || /max-age=0/i.test(c))).toBe(
      true,
    );
    expect(await getStaff(headers)).toBeNull();
    expect(await db().select().from(sessions).where(eq(sessions.userId, user.id))).toHaveLength(0);
  });

  it('cookie palsu atau tanpa cookie tidak menghasilkan staf', async () => {
    expect(await getStaff(new Headers())).toBeNull();
    expect(await getStaff(new Headers({ cookie: 'arj.session_token=palsu.palsu' }))).toBeNull();
  });

  it('percobaan masuk dibatasi: setelah 5 percobaan dari IP yang sama, yang berikutnya ditolak sementara', async () => {
    const user = await makeUser();
    const sameIp = ip();
    const results = [];
    for (let i = 0; i < 6; i++) {
      results.push(
        await signInStaff(req(), { email: user.email, password: `salah-${i}-salah-salah` }, sameIp),
      );
    }
    expect(results.slice(0, 5).map((r) => (r.ok ? 'ok' : r.reason))).toEqual(
      Array(5).fill('invalid'),
    );
    expect(results[5]).toMatchObject({ ok: false, reason: 'rate_limited' });
    // IP lain tidak terkena
    expect((await signInStaff(req(), { email: user.email, password: PASSWORD }, ip())).ok).toBe(
      true,
    );
  });

  it('IP dari header buatan klien tidak dipercaya: yang dipakai adalah IP yang diberikan server', async () => {
    const user = await makeUser();
    const serverIp = ip();
    // klien mengirim X-Forwarded-For berganti-ganti untuk menghindari pembatas
    for (let i = 0; i < 5; i++) {
      const spoofed = new Request('http://localhost:4321/dashboard/masuk', {
        method: 'POST',
        headers: { 'x-forwarded-for': `203.0.113.${i + 1}` },
      });
      await signInStaff(
        spoofed,
        { email: user.email, password: `salah-${i}-salah-salah` },
        serverIp,
      );
    }
    const sixth = new Request('http://localhost:4321/dashboard/masuk', {
      method: 'POST',
      headers: { 'x-forwarded-for': '203.0.113.200' },
    });
    expect(
      await signInStaff(sixth, { email: user.email, password: 'salah-lagi-salah-salah' }, serverIp),
    ).toMatchObject({
      ok: false,
      reason: 'rate_limited',
    });
  });

  it('tidak ada pendaftaran publik', async () => {
    const email = `daftar-${uid()}@uji.example`;
    const err = await getAuth()
      .api.signUpEmail({ body: { email, password: PASSWORD, name: 'Penyusup' } })
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(err, 'pendaftaran publik harus ditolak').not.toBeNull();
    expect(await db().select().from(users).where(eq(users.email, email))).toHaveLength(0);
  });
});

describe('pembatas masuk hanya menghitung kegagalan', () => {
  it('banyak staf sah masuk berhasil dari satu IP (kantor) tanpa saling terkunci', async () => {
    const office = ip();
    for (let i = 0; i < 8; i++) {
      const user = await makeUser();
      const r = await signInStaff(req(), { email: user.email, password: PASSWORD }, office);
      expect(r.ok, `masuk sah ke-${i + 1}: ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it('login berhasil tidak mengosongkan hitungan gagal IP: penebak tidak bisa "mereset" dengan akunnya sendiri', async () => {
    const mine = await makeUser();
    const victim = await makeUser();
    const attacker = ip();
    for (let i = 0; i < 4; i++) {
      await signInStaff(
        req(),
        { email: victim.email, password: `tebak-${i}-tebak-tebak` },
        attacker,
      );
    }
    // masuk sah dengan akun sendiri dari IP yang sama TIDAK menghapus 4 kegagalan tadi
    expect((await signInStaff(req(), { email: mine.email, password: PASSWORD }, attacker)).ok).toBe(
      true,
    );
    await signInStaff(req(), { email: victim.email, password: 'tebak-4-tebak-tebak' }, attacker);
    expect(
      await signInStaff(req(), { email: victim.email, password: PASSWORD }, attacker),
    ).toMatchObject({ ok: false, reason: 'rate_limited' });
  });
});
