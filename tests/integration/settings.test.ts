import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { auditLogs, bookings, settings } from '../../src/server/db/schema';
import {
  BOOKING_SETTING_KEYS,
  DEFAULT_BOOKING_SETTINGS,
  getBookingSettings,
  type BookingSettings,
} from '../../src/features/booking/settings';
import {
  MAX_MANUAL_ACCOUNTS,
  parseBookingSettingsForm,
  saveBookingSettings,
} from '../../src/features/settings/save';
import { createStaffUser } from '../../src/server/auth/users';
import { makeBooking, makeSchedule, makeTrip } from './factories';

const db = () => getDb();

afterEach(async () => {
  // Pengaturan itu global: kembalikan ke keadaan bersih supaya tes lain membaca nilai bawaan.
  await db()
    .delete(settings)
    .where(inArray(settings.key, Object.values(BOOKING_SETTING_KEYS)));
});
afterAll(async () => {
  await closeDb();
});

function form(over: Record<string, string | string[]> = {}) {
  const base: Record<string, string | string[]> = {
    dp_percent: '30',
    hold_minutes: '120',
    max_participants: '8',
    draft_hours: '24',
    bank: [],
    nomor: [],
    pemegang: [],
    ...over,
  };
  const f = new FormData();
  for (const [k, v] of Object.entries(base)) {
    for (const item of Array.isArray(v) ? v : [v]) f.append(k, item);
  }
  return f;
}

async function owner() {
  return createStaffUser(db(), {
    email: `own-${uuidv7().slice(-12)}@uji.example`,
    name: 'Pemilik Uji',
    role: 'owner',
    password: 'sandi-uji-yang-cukup-panjang',
  });
}

const valid = (over: Partial<BookingSettings> = {}): BookingSettings => ({
  ...DEFAULT_BOOKING_SETTINGS,
  ...over,
});

describe('membaca form Pengaturan', () => {
  it('menerima isian sah, memangkas spasi, dan membuang baris rekening yang kosong seluruhnya', () => {
    const r = parseBookingSettingsForm(
      form({
        dp_percent: ' 40 ',
        hold_minutes: '90',
        max_participants: '10',
        draft_hours: '48',
        bank: ['BCA', '', ' Mandiri '],
        nomor: ['123 456 7890', '', '1234-5678-90'],
        pemegang: ['PT Arunika Journey', '', ' Arunika '],
      }),
    );
    expect(r.ok, JSON.stringify(r)).toBe(true);
    if (!r.ok) return;
    expect(r.values).toEqual({
      dpPercent: 40,
      holdMinutes: 90,
      maxParticipants: 10,
      draftHours: 48,
      manualAccounts: [
        { bank: 'BCA', number: '123 456 7890', holder: 'PT Arunika Journey' },
        { bank: 'Mandiri', number: '1234-5678-90', holder: 'Arunika' },
      ],
    });
  });

  it('menolak angka di luar batas atau bukan bilangan bulat, dengan pesan per kolom dan isian mentah tetap ada', () => {
    const r = parseBookingSettingsForm(
      form({ dp_percent: '101', hold_minutes: '4', max_participants: '0', draft_hours: 'abc' }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual([
      'dpPercent',
      'draftHours',
      'holdMinutes',
      'maxParticipants',
    ]);
    expect(r.raw).toMatchObject({ dpPercent: '101', draftHours: 'abc' });
  });

  it.each(['30.5', '-1', '1e2', '', '0x10', '３０', '1 000'])(
    'DP "%s" bukan bilangan bulat biasa: ditolak',
    (dp) => {
      const r = parseBookingSettingsForm(form({ dp_percent: dp }));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.dpPercent).toBeTruthy();
    },
  );

  it('batas tepi diterima: DP 0 dan 100, hold 5 dan 1440, peserta 1 dan 50', () => {
    for (const [dp, hold, max] of [
      ['0', '5', '1'],
      ['100', '1440', '50'],
    ] as const) {
      const r = parseBookingSettingsForm(
        form({ dp_percent: dp, hold_minutes: hold, max_participants: max }),
      );
      expect(r.ok, `${dp}/${hold}/${max}`).toBe(true);
    }
  });

  it('baris rekening yang terisi sebagian ditolak (tidak dilewati diam-diam), nomor tidak wajar ditolak', () => {
    const r = parseBookingSettingsForm(
      form({
        bank: ['BCA', 'Mandiri', 'BNI'],
        nomor: ['1234567890', '', 'abc-def'],
        pemegang: ['', 'Arunika', 'Arunika'],
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors.accountRows ?? {}).map(Number)).toEqual([0, 1, 2]);
  });

  it('rekening berlebih ditolak', () => {
    const n = MAX_MANUAL_ACCOUNTS + 1;
    const r = parseBookingSettingsForm(
      form({
        bank: Array(n).fill('BCA'),
        nomor: Array(n).fill('1234567890'),
        pemegang: Array(n).fill('Arunika'),
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.manualAccounts).toMatch(/Maksimal/);
  });
});

describe('menyimpan Pengaturan', () => {
  it('menulis hanya yang berubah dan mencatat nilai sebelum dan sesudah beserta pelaku', async () => {
    const actor = await owner();
    const res = await saveBookingSettings(db(), {
      actorId: actor.id,
      values: valid({ dpPercent: 50, holdMinutes: 90 }),
      ip: '203.0.113.9',
    });
    expect(res.changed.sort()).toEqual(['dp_percent', 'hold_minutes']);

    expect(await getBookingSettings(db())).toMatchObject({ dpPercent: 50, holdMinutes: 90 });
    const rows = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actorId, actor.id), eq(auditLogs.action, 'settings.updated')))
      .orderBy(asc(auditLogs.entityId));
    expect(rows.map((r) => r.entityId)).toEqual(['dp_percent', 'hold_minutes']);
    expect(rows[0]).toMatchObject({
      entity: 'settings',
      ip: '203.0.113.9',
      diff: { before: DEFAULT_BOOKING_SETTINGS.dpPercent, after: 50 },
    });
    // pengaturan lain tidak tersentuh
    const stored = await db().select().from(settings);
    expect(stored.map((s) => s.key)).not.toContain('draft_hours');
    const [dp] = stored.filter((s) => s.key === 'dp_percent');
    expect(dp!.updatedBy).toBe(actor.id);
  });

  it('menyimpan nilai yang sama tidak menulis atau mencatat apa pun', async () => {
    const actor = await owner();
    await saveBookingSettings(db(), { actorId: actor.id, values: valid({ dpPercent: 45 }) });
    const again = await saveBookingSettings(db(), {
      actorId: actor.id,
      values: valid({ dpPercent: 45 }),
    });
    expect(again.changed).toEqual([]);
    const logs = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.actorId, actor.id), eq(auditLogs.action, 'settings.updated')));
    expect(logs).toHaveLength(1);
  });

  it('rekening transfer tersimpan, terbaca kembali, dan bisa dikosongkan', async () => {
    const actor = await owner();
    const accounts = [{ bank: 'BCA', number: '123 456 7890', holder: 'PT Arunika Journey' }];
    await saveBookingSettings(db(), {
      actorId: actor.id,
      values: valid({ manualAccounts: accounts }),
    });
    expect((await getBookingSettings(db())).manualAccounts).toEqual(accounts);
    const res = await saveBookingSettings(db(), {
      actorId: actor.id,
      values: valid({ manualAccounts: [] }),
    });
    expect(res.changed).toEqual(['manual_accounts']);
    expect((await getBookingSettings(db())).manualAccounts).toEqual([]);
  });

  it('booking yang sudah berjalan tidak berubah saat DP diubah (nilai dibekukan saat dibuat)', async () => {
    const actor = await owner();
    const schedule = await makeSchedule((await makeTrip()).id);
    const booking = await makeBooking(schedule.id, { dpPercent: 30, dpAmount: 750_000 });
    await saveBookingSettings(db(), { actorId: actor.id, values: valid({ dpPercent: 80 }) });
    const [row] = await db().select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row).toMatchObject({ dpPercent: 30, dpAmount: 750_000 });
  });

  it('dua penyimpanan bersamaan berurutan: catatan "sebelum" milik yang kedua adalah "sesudah" yang pertama', async () => {
    const [a, b] = await Promise.all([owner(), owner()]);
    await Promise.all([
      saveBookingSettings(db(), { actorId: a.id, values: valid({ dpPercent: 40 }) }),
      saveBookingSettings(db(), { actorId: b.id, values: valid({ dpPercent: 60 }) }),
    ]);
    const logs = await db()
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityId, 'dp_percent'),
          eq(auditLogs.action, 'settings.updated'),
          inArray(auditLogs.actorId, [a.id, b.id]),
        ),
      )
      .orderBy(asc(auditLogs.createdAt), asc(auditLogs.id));
    expect(logs).toHaveLength(2);
    expect(logs[0]!.diff?.before).toBe(DEFAULT_BOOKING_SETTINGS.dpPercent);
    expect(logs[1]!.diff?.before).toBe(logs[0]!.diff?.after);
    expect((await getBookingSettings(db())).dpPercent).toBe(logs[1]!.diff?.after);
  });
});
