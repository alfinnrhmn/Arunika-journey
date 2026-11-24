import { afterAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import {
  auditLogs,
  bookingDrafts,
  bookingParticipants,
  bookings,
  media,
  outbox,
  payments,
  settings,
  tripSchedules,
  trips,
  users,
} from '../../src/server/db/schema';
import {
  approvePayment,
  BookingError,
  createDraft,
  expireHolds,
  findBookingByAccess,
  findBookingForLookup,
  issueAccessToken,
  getBookingSettings,
  rejectPayment,
  saveDetails,
  startPayment,
  submitProof,
  updateParty,
} from '../../src/features/booking';
import type { ObjectStorage } from '../../src/server/storage';
import { makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
});

const db = () => getDb();
const uid = () => uuidv7().slice(-12);

/** Trip Open terbit + jadwal jauh di masa depan, siap dipesan. */
async function setup(
  over: {
    capacity?: number;
    price?: number;
    scheduleOver?: Partial<typeof tripSchedules.$inferInsert>;
  } = {},
) {
  const trip = await makeTrip({ status: 'published', basePrice: over.price ?? 1_250_000 });
  const schedule = await makeSchedule(trip.id, {
    departureDate: '2030-06-10',
    returnDate: '2030-06-11',
    capacity: over.capacity ?? 8,
    ...over.scheduleOver,
  });
  return { trip, schedule };
}

const contact = (email = `tamu-${uid()}@example.com`) => ({
  name: 'Nadia Putri',
  email,
  phone: '0812 3456 7890',
});

/** Draf lengkap dan valid (langkah 1 dan 2 selesai). */
async function readyDraft(
  scheduleId: string,
  party = { adults: 2, children: 0 },
  email?: string,
  now?: Date,
) {
  const { token } = await createDraft(db(), { scheduleId, ...party }, now);
  const kinds = [
    ...Array<'adult'>(party.adults).fill('adult'),
    ...Array<'child'>(party.children).fill('child'),
  ];
  const result = await saveDetails(
    db(),
    token,
    {
      contact: contact(email),
      participants: kinds.map((kind, i) => ({
        fullName: `Peserta ${i + 1}`,
        kind,
        specialNeeds: null,
      })),
      accepted: true,
    },
    now,
  );
  expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true);
  return token;
}

const reloadSchedule = async (id: string) =>
  (await db().select().from(tripSchedules).where(eq(tripSchedules.id, id)))[0]!;
const reloadBooking = async (id: string) =>
  (await db().select().from(bookings).where(eq(bookings.id, id)))[0]!;
const reloadPayment = async (id: string) =>
  (await db().select().from(payments).where(eq(payments.id, id)))[0]!;

async function codeOf(op: Promise<unknown>) {
  const err = await op.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err, 'seharusnya ditolak').toBeInstanceOf(BookingError);
  return err as BookingError;
}

const memoryStorage = (): ObjectStorage & { files: Map<string, Buffer> } => {
  const files = new Map<string, Buffer>();
  return {
    files,
    async put(key, data) {
      files.set(key, data);
    },
    async get(key) {
      const f = files.get(key);
      if (!f) throw new Error('tidak ada');
      return f;
    },
  };
};
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64),
]);

async function makeAdmin() {
  const [u] = await db()
    .insert(users)
    .values({
      email: `admin-${uid()}@example.com`,
      name: 'Admin Ops',
      role: 'admin_ops',
      status: 'active',
    })
    .returning();
  return u!;
}

/** Booking pending_payment lengkap dengan bukti bayar terunggah (antrean verifikasi). */
async function bookingAwaitingVerification(capacity = 8, party = { adults: 2, children: 0 }) {
  const { schedule } = await setup({ capacity });
  const token = await readyDraft(schedule.id, party);
  const started = await startPayment(db(), token);
  const proof = await submitProof(db(), memoryStorage(), {
    code: started.booking.code,
    token: started.accessToken,
    data: PNG,
    mime: 'image/png',
  });
  return { schedule, started, payment: proof.payment };
}

describe('langkah 1 dan 2: draf booking', () => {
  it('membuat draf dan menolak jumlah peserta di luar batas, jadwal tidak ada, dan kuota kurang', async () => {
    const { schedule } = await setup({ capacity: 3 });

    const ok = await createDraft(db(), { scheduleId: schedule.id, adults: 2, children: 1 });
    expect(ok.token.length).toBeGreaterThan(30);
    // hanya hash token yang tersimpan
    expect(ok.draft.tokenHash).not.toBe(ok.token);

    expect(
      (await codeOf(createDraft(db(), { scheduleId: schedule.id, adults: 0, children: 1 }))).code,
    ).toBe('party_invalid');
    expect(
      (await codeOf(createDraft(db(), { scheduleId: schedule.id, adults: 9, children: 0 }))).code,
    ).toBe('party_invalid');
    const tooMany = await codeOf(
      createDraft(db(), { scheduleId: schedule.id, adults: 3, children: 1 }),
    );
    expect(tooMany.code).toBe('quota_insufficient');
    expect(tooMany.detail.seatsLeft).toBe(3);
    expect(
      (await codeOf(createDraft(db(), { scheduleId: uuidv7(), adults: 1, children: 0 }))).code,
    ).toBe('schedule_not_found');
  });

  it('jadwal tertutup, penuh, lewat tanggal, atau melewati batas pemesanan H-n: tanggal tidak tersedia', async () => {
    const closed = (await setup({ scheduleOver: { status: 'closed' } })).schedule;
    expect(
      (await codeOf(createDraft(db(), { scheduleId: closed.id, adults: 1, children: 0 }))).code,
    ).toBe('schedule_unavailable');

    const past = (
      await setup({ scheduleOver: { departureDate: '2020-01-01', returnDate: '2020-01-02' } })
    ).schedule;
    expect(
      (await codeOf(createDraft(db(), { scheduleId: past.id, adults: 1, children: 0 }))).detail
        .reason,
    ).toBe('past');

    // berangkat 2030-06-10 dengan cutoff 10 hari: tutup sejak 2030-05-31; "sekarang" 2030-06-05 sudah lewat batas
    const cut = (await setup({ scheduleOver: { bookingCutoffDays: 10 } })).schedule;
    const err = await codeOf(
      createDraft(
        db(),
        { scheduleId: cut.id, adults: 1, children: 0 },
        new Date('2030-06-05T03:00:00Z'),
      ),
    );
    expect(err.detail.reason).toBe('cutoff');
    // sebelum batas masih bisa
    await expect(
      createDraft(
        db(),
        { scheduleId: cut.id, adults: 1, children: 0 },
        new Date('2030-05-20T03:00:00Z'),
      ),
    ).resolves.toBeTruthy();
  });

  it('langkah 2 mengembalikan kesalahan per bidang dan tetap menyimpan data yang valid', async () => {
    const { schedule } = await setup();
    const { token } = await createDraft(db(), { scheduleId: schedule.id, adults: 2, children: 0 });

    const bad = await saveDetails(db(), token, {
      contact: { name: 'N', email: 'bukan-email', phone: '123' },
      participants: [
        { fullName: 'Budi', kind: 'adult' },
        { fullName: '', kind: 'adult' },
      ],
      accepted: false,
    });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(Object.keys(bad.issues).sort()).toEqual(
      [
        'accepted',
        'contact.email',
        'contact.name',
        'contact.phone',
        'participants.1.fullName',
      ].sort(),
    );
    expect(bad.issues['contact.email']).toMatch(/email/i);
    expect(bad.issues.accepted).toMatch(/setujui/i);

    // jumlah peserta tidak sesuai langkah 1
    const wrongCount = await saveDetails(db(), token, {
      contact: contact(),
      participants: [{ fullName: 'Budi', kind: 'adult' }],
      accepted: true,
    });
    expect(wrongCount.ok).toBe(false);
    if (!wrongCount.ok) expect(wrongCount.issues.participants).toMatch(/2 peserta/);
    // kontak yang valid tersimpan walau peserta belum lengkap
    expect(
      (await db().select().from(bookingDrafts).where(eq(bookingDrafts.id, wrongCount.draft.id)))[0]!
        .contact?.phone,
    ).toBe('081234567890');
  });

  it('kembali ke langkah 1 mengubah jumlah peserta tanpa menghilangkan nama yang sudah diisi', async () => {
    const { schedule } = await setup();
    const token = await readyDraft(schedule.id, { adults: 2, children: 0 });
    const updated = await updateParty(db(), token, {
      scheduleId: schedule.id,
      adults: 2,
      children: 1,
    });
    expect(updated.participants.map((p) => [p.fullName, p.kind])).toEqual([
      ['Peserta 1', 'adult'],
      ['Peserta 2', 'adult'],
      ['', 'child'],
    ]);
  });
});

describe('memulai pembayaran: hold kuota, snapshot harga, kode booking', () => {
  it('membuat booking pending_payment dengan harga dan DP dari server, kursi tertahan, dan kode ARJ', async () => {
    const { schedule } = await setup({ capacity: 8, price: 1_250_000 });
    const now = new Date('2030-01-15T03:00:00Z');
    const token = await readyDraft(schedule.id, { adults: 2, children: 0 }, undefined, now);
    const r = await startPayment(db(), token, now);

    expect(r.booking.code).toMatch(/^ARJ-\d{4}-\d{4}$/);
    expect(r.booking.status).toBe('pending_payment');
    expect(r.booking.totalAmount).toBe(2_500_000);
    expect(r.booking.dpPercent).toBe(30);
    expect(r.booking.dpAmount).toBe(750_000);
    expect(r.booking.seatCount).toBe(2);
    expect(r.booking.holdExpiresAt!.getTime()).toBe(now.getTime() + 120 * 60_000);
    expect(r.booking.accessTokenHash).toBeTruthy();
    expect(r.booking.accessTokenHash).not.toBe(r.accessToken);

    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(2);
    const people = await db()
      .select()
      .from(bookingParticipants)
      .where(eq(bookingParticipants.bookingId, r.booking.id));
    expect(people.map((p) => p.fullName)).toEqual(['Peserta 1', 'Peserta 2']);
    expect(r.payment).toMatchObject({
      kind: 'dp',
      provider: 'manual',
      status: 'pending',
      amount: 750_000,
    });
    // draf dibuang; memakai token yang sama lagi gagal
    expect((await codeOf(startPayment(db(), token))).code).toBe('draft_not_found');
    // email antrean dan audit ditulis di transaksi yang sama
    const mails = await db()
      .select()
      .from(outbox)
      .where(eq(outbox.toAddress, r.booking.contactEmail));
    expect(mails.map((m) => m.template)).toEqual(['booking_pending_payment']);
    const audit = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, 'booking'), eq(auditLogs.entityId, r.booking.id)));
    expect(audit.map((a) => a.action)).toEqual(['booking.created']);
    // audit tidak memuat data pribadi
    expect(JSON.stringify(audit[0]!.diff)).not.toMatch(/example\.com|Nadia|0812/);
  });

  it('harga jadwal menimpa harga paket; harga anak memakai harga dewasa bila belum ditentukan', async () => {
    const { schedule } = await setup({
      price: 1_250_000,
      scheduleOver: { priceOverride: 1_350_000 },
    });
    const token = await readyDraft(schedule.id, { adults: 2, children: 1 });
    const r = await startPayment(db(), token);
    expect(r.booking.totalAmount).toBe(3 * 1_350_000);
    expect(r.booking.dpAmount).toBe(1_215_000); // 30% x 4.050.000, naik ke kelipatan 1.000
    expect(r.booking.priceLines.map((l) => [l.label, l.qty, l.unitPrice])).toEqual([
      ['Dewasa', 2, 1_350_000],
      ['Anak', 1, 1_350_000],
    ]);
  });

  it('harga dibekukan: mengubah harga paket sesudah hold tidak mengubah booking yang ada', async () => {
    const { trip, schedule } = await setup({ price: 1_250_000 });
    const r = await startPayment(db(), await readyDraft(schedule.id));
    await db().update(trips).set({ basePrice: 9_999_000 }).where(eq(trips.id, trip.id));
    const after = await reloadBooking(r.booking.id);
    expect(after.totalAmount).toBe(2_500_000);
    expect(after.dpAmount).toBe(750_000);
  });

  it('Pengaturan mengubah DP dan lama hold; nilai rusak diabaikan dan memakai bawaan', async () => {
    const { schedule } = await setup({ price: 1_000_000 });
    const put = (key: string, value: unknown) =>
      db()
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    await put('booking.dp_percent', 50);
    await put('booking.hold_minutes', 30);
    await put('booking.max_participants', 'delapan'); // rusak: salah tipe, harus diabaikan
    try {
      const cfg = await getBookingSettings(db());
      expect(cfg).toMatchObject({ dpPercent: 50, holdMinutes: 30, maxParticipants: 8 });

      const now = new Date('2030-01-15T03:00:00Z');
      const r = await startPayment(
        db(),
        await readyDraft(schedule.id, undefined, undefined, now),
        now,
      );
      expect(r.booking.dpPercent).toBe(50);
      expect(r.booking.dpAmount).toBe(1_000_000);
      expect(r.booking.holdExpiresAt!.getTime()).toBe(now.getTime() + 30 * 60_000);
    } finally {
      await db().delete(settings).where(eq(settings.key, 'booking.dp_percent'));
      await db().delete(settings).where(eq(settings.key, 'booking.hold_minutes'));
      await db().delete(settings).where(eq(settings.key, 'booking.max_participants'));
    }
  });

  it('draf belum lengkap ditolak dengan rincian bidang, dan tidak ada kursi atau kode yang terpakai', async () => {
    const { schedule } = await setup();
    const { token } = await createDraft(db(), { scheduleId: schedule.id, adults: 2, children: 0 });
    const err = await codeOf(startPayment(db(), token));
    expect(err.code).toBe('draft_incomplete');
    expect(Object.keys(err.detail.issues as object)).toContain('accepted');
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(0);
  });

  it('kuota tidak cukup saat bayar: ditolak, kursi dan kode tidak berubah, nomor berikutnya tidak melompat', async () => {
    const { schedule } = await setup({ capacity: 3 });
    const first = await startPayment(
      db(),
      await readyDraft(schedule.id, { adults: 2, children: 0 }),
    );
    // draf kedua dibuat SEBELUM kuota habis (langkah 1 lolos), lalu kalah berebut saat bayar
    const late = await readyDraft(schedule.id, { adults: 1, children: 0 });
    await startPayment(db(), await readyDraft(schedule.id, { adults: 1, children: 0 })); // menghabiskan kursi terakhir
    const err = await codeOf(startPayment(db(), late));
    expect(err.code).toBe('quota_insufficient');
    expect(err.detail.seatsLeft).toBe(0);
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(3);

    // kode yang gagal tidak menghabiskan nomor: booking berikutnya hanya +1 dari yang terakhir sukses
    const { schedule: s2 } = await setup({ capacity: 8 });
    const a = await startPayment(db(), await readyDraft(s2.id));
    const b = await startPayment(db(), await readyDraft(s2.id));
    expect(Number(b.booking.code.slice(-4))).toBe(Number(a.booking.code.slice(-4)) + 1);
    expect(first.booking.code).not.toBe(a.booking.code);
  });

  it('banyak pembayaran bersamaan ke sisa 4 kursi: tepat 4 berhasil, tidak ada oversell, jadwal Penuh', async () => {
    const { schedule } = await setup({ capacity: 4 });
    const tokens = await Promise.all(
      Array.from({ length: 10 }, async () => {
        // langkah 1 lolos untuk semua (kursi belum terisi); persaingan terjadi saat bayar
        return readyDraft(schedule.id, { adults: 1, children: 0 });
      }),
    );
    const results = await Promise.allSettled(tokens.map((t) => startPayment(db(), t)));
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(4);
    expect(rejected).toHaveLength(6);
    for (const r of rejected)
      expect((r.reason as BookingError).code).toMatch(/quota_insufficient|schedule_unavailable/);

    const after = await reloadSchedule(schedule.id);
    expect(after.seatsTaken).toBe(4);
    expect(after.status).toBe('full');
    const codes = ok.map(
      (r) =>
        (r as PromiseFulfilledResult<Awaited<ReturnType<typeof startPayment>>>).value.booking.code,
    );
    expect(new Set(codes).size).toBe(4); // kode unik
  });

  it('satu hold aktif per email: pembayaran kedua dengan email yang sama ditolak dan menyebut kode pertama', async () => {
    const { schedule } = await setup();
    const email = `sama-${uid()}@example.com`;
    const first = await startPayment(
      db(),
      await readyDraft(schedule.id, { adults: 1, children: 0 }, email),
    );
    const second = await readyDraft(schedule.id, { adults: 1, children: 0 }, email.toUpperCase());
    const err = await codeOf(startPayment(db(), second));
    expect(err.code).toBe('active_hold_exists');
    expect(err.detail.code).toBe(first.booking.code);
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(1);
  });

  it('jadwal ditutup di tengah alur: tanggal tidak tersedia, data draf tetap ada', async () => {
    const { schedule } = await setup();
    const token = await readyDraft(schedule.id);
    await db()
      .update(tripSchedules)
      .set({ status: 'closed' })
      .where(eq(tripSchedules.id, schedule.id));
    expect((await codeOf(startPayment(db(), token))).code).toBe('schedule_unavailable');
    const left = await db()
      .select()
      .from(bookingDrafts)
      .where(eq(bookingDrafts.scheduleId, schedule.id));
    expect(left).toHaveLength(1);
    expect(left[0]!.participants).toHaveLength(2);
  });
});

describe('transfer manual: bukti bayar dan antrean verifikasi', () => {
  it('unggah bukti memindahkan pembayaran ke needs_verification; booking tetap pending_payment', async () => {
    const { started, payment } = await bookingAwaitingVerification();
    expect(payment.status).toBe('needs_verification');
    expect(payment.proofMediaId).toBeTruthy();
    expect((await reloadBooking(started.booking.id)).status).toBe('pending_payment');
    const [file] = await db().select().from(media).where(eq(media.id, payment.proofMediaId!));
    expect(file!.storageKey).toMatch(new RegExp(`^proofs/${started.booking.code}/.+\\.png$`));
    expect(file!.mime).toBe('image/png');
  });

  it('menolak token salah, berkas berbahaya, berkas terlalu besar, dan hold yang sudah lewat', async () => {
    const { schedule } = await setup();
    const t0 = new Date('2030-01-15T03:00:00Z');
    const started = await startPayment(
      db(),
      await readyDraft(schedule.id, undefined, undefined, t0),
      t0,
    );
    const base = {
      code: started.booking.code,
      token: started.accessToken,
      data: PNG,
      mime: 'image/png',
    };
    const store = memoryStorage();
    const now = new Date('2030-01-15T03:30:00Z');

    expect((await codeOf(submitProof(db(), store, { ...base, token: 'salah' }, now))).code).toBe(
      'booking_not_found',
    );
    expect(
      (
        await codeOf(
          submitProof(
            db(),
            store,
            { ...base, mime: 'text/html', data: Buffer.from('<script>') },
            now,
          ),
        )
      ).code,
    ).toBe('proof_invalid');
    // MIME mengaku PNG tetapi isinya bukan
    expect(
      (
        await codeOf(
          submitProof(db(), store, { ...base, data: Buffer.from('MZ-bukan-gambar') }, now),
        )
      ).code,
    ).toBe('proof_invalid');
    expect(
      (
        await codeOf(
          submitProof(
            db(),
            store,
            { ...base, data: Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]) },
            now,
          ),
        )
      ).code,
    ).toBe('proof_invalid');
    // hold sudah lewat (2 jam 1 menit kemudian)
    const late = new Date('2030-01-15T05:01:00Z');
    expect((await codeOf(submitProof(db(), store, base, late))).code).toBe('hold_expired');
    expect(store.files.size).toBe(0); // tidak ada berkas tersimpan untuk permintaan yang ditolak
  });
});

describe('kedaluwarsa hold', () => {
  it('melepas kursi booking pending_payment yang batasnya lewat dan menandai pembayaran expired; idempotent', async () => {
    const { schedule } = await setup({ capacity: 4 });
    const t0 = new Date('2030-01-15T03:00:00Z');
    const r = await startPayment(
      db(),
      await readyDraft(schedule.id, { adults: 2, children: 0 }, undefined, t0),
      t0,
    );
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(2);

    // belum lewat: tidak disentuh
    // (pekerjaan ini global, jadi yang diperiksa adalah booking milik tes ini, bukan jumlah totalnya)
    await expireHolds(db(), new Date('2030-01-15T04:00:00Z'));
    expect((await reloadBooking(r.booking.id)).status).toBe('pending_payment');
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(2);
    // sesudah 120 menit
    const after = new Date('2030-01-15T05:01:00Z');
    expect((await expireHolds(db(), after)).expired).toBeGreaterThanOrEqual(1);
    expect((await reloadBooking(r.booking.id)).status).toBe('expired');
    expect((await reloadPayment(r.payment.id)).status).toBe('expired');
    const s = await reloadSchedule(schedule.id);
    expect(s.seatsTaken).toBe(0);
    expect(s.status).toBe('open');
    // jalan lagi: kursi tidak dilepas dua kali
    await expireHolds(db(), after);
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(0);
  });

  it('jadwal Penuh kembali Terbuka saat hold kedaluwarsa; booking yang bukti bayarnya menunggu verifikasi tidak dikedaluwarsakan', async () => {
    const { schedule } = await setup({ capacity: 2 });
    const t0 = new Date('2030-01-15T03:00:00Z');
    const full = await startPayment(
      db(),
      await readyDraft(schedule.id, { adults: 2, children: 0 }, undefined, t0),
      t0,
    );
    expect((await reloadSchedule(schedule.id)).status).toBe('full');
    await expireHolds(db(), new Date('2030-01-15T06:00:00Z'));
    expect((await reloadSchedule(schedule.id)).status).toBe('open');
    expect((await reloadBooking(full.booking.id)).status).toBe('expired');

    const waiting = await bookingAwaitingVerification(4);
    await expireHolds(db(), new Date('2099-01-01T00:00:00Z'));
    expect((await reloadBooking(waiting.started.booking.id)).status).toBe('pending_payment');
    expect((await reloadSchedule(waiting.schedule.id)).seatsTaken).toBe(2);
  });
});

describe('keputusan admin atas bukti bayar', () => {
  it('menyetujui: pembayaran paid, booking confirmed, sisa tagihan due, tercatat di audit dan email antrean', async () => {
    const admin = await makeAdmin();
    const { started, payment } = await bookingAwaitingVerification();
    const r = await approvePayment(db(), { paymentId: payment.id, actorId: admin.id });
    expect(r.status).toBe('confirmed');

    const p = await reloadPayment(payment.id);
    expect(p).toMatchObject({ status: 'paid', verifiedBy: admin.id });
    expect(p.paidAt).toBeTruthy();
    const b = await reloadBooking(started.booking.id);
    expect(b.status).toBe('confirmed');
    expect(b.balanceStatus).toBe('due');
    const mails = await db().select().from(outbox).where(eq(outbox.toAddress, b.contactEmail));
    expect(mails.map((m) => m.template).sort()).toEqual([
      'booking_confirmed',
      'booking_pending_payment',
    ]);
    const audit = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entity, 'payment'), eq(auditLogs.entityId, payment.id)));
    expect(audit.find((a) => a.action === 'payment.approved')!.actorId).toBe(admin.id);

    // menyetujui dua kali ditolak
    expect(
      (await codeOf(approvePayment(db(), { paymentId: payment.id, actorId: admin.id }))).code,
    ).toBe('invalid_state');
  });

  it('hanya pembayaran yang menunggu verifikasi yang bisa diputuskan (belum ada bukti: ditolak)', async () => {
    const admin = await makeAdmin();
    const { schedule } = await setup();
    const started = await startPayment(db(), await readyDraft(schedule.id));
    expect(
      (await codeOf(approvePayment(db(), { paymentId: started.payment.id, actorId: admin.id })))
        .code,
    ).toBe('invalid_state');
    expect(
      (await codeOf(approvePayment(db(), { paymentId: uuidv7(), actorId: admin.id }))).code,
    ).toBe('payment_not_found');
    expect((await reloadBooking(started.booking.id)).status).toBe('pending_payment');
  });

  it('DP yang melunasi seluruh harga tidak meninggalkan sisa tagihan', async () => {
    await db()
      .insert(settings)
      .values({ key: 'booking.dp_percent', value: 100 })
      .onConflictDoUpdate({ target: settings.key, set: { value: 100 } });
    try {
      const admin = await makeAdmin();
      const { started, payment } = await bookingAwaitingVerification();
      await approvePayment(db(), { paymentId: payment.id, actorId: admin.id });
      const b = await reloadBooking(started.booking.id);
      expect(b.status).toBe('confirmed');
      expect(b.balanceStatus).toBeNull();
    } finally {
      await db().delete(settings).where(eq(settings.key, 'booking.dp_percent'));
    }
  });

  it('menolak: wajib beralasan, melepas kursi, booking expired, pembayaran rejected, pelanggan diberi tahu', async () => {
    const admin = await makeAdmin();
    const { schedule, started, payment } = await bookingAwaitingVerification(4, {
      adults: 2,
      children: 0,
    });
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(2);

    expect(
      (await codeOf(rejectPayment(db(), { paymentId: payment.id, actorId: admin.id, reason: ' ' })))
        .code,
    ).toBe('invalid_state');
    await rejectPayment(db(), {
      paymentId: payment.id,
      actorId: admin.id,
      reason: 'Nominal transfer tidak sesuai',
    });

    expect((await reloadPayment(payment.id)).status).toBe('rejected');
    expect((await reloadBooking(started.booking.id)).status).toBe('expired');
    expect((await reloadSchedule(schedule.id)).seatsTaken).toBe(0);
    const mail = (
      await db().select().from(outbox).where(eq(outbox.toAddress, started.booking.contactEmail))
    ).find((m) => m.template === 'payment_rejected');
    expect(mail!.payload.alasan).toBe('Nominal transfer tidak sesuai');
  });

  it('bukti disetujui setelah kursi sempat dilepas: kursi diambil lagi; bila sudah habis, needs_attention (tanpa oversell)', async () => {
    const admin = await makeAdmin();
    // kasus 1: kursi masih ada
    const a = await bookingAwaitingVerification(4, { adults: 2, children: 0 });
    await db()
      .update(bookings)
      .set({ status: 'expired' })
      .where(eq(bookings.id, a.started.booking.id));
    await db()
      .update(tripSchedules)
      .set({ seatsTaken: 0 })
      .where(eq(tripSchedules.id, a.schedule.id)); // kursi dilepas
    const r1 = await approvePayment(db(), { paymentId: a.payment.id, actorId: admin.id });
    expect(r1.status).toBe('confirmed');
    expect((await reloadSchedule(a.schedule.id)).seatsTaken).toBe(2);

    // kasus 2: kursi sudah diambil orang lain
    const b = await bookingAwaitingVerification(2, { adults: 2, children: 0 });
    await db()
      .update(bookings)
      .set({ status: 'expired' })
      .where(eq(bookings.id, b.started.booking.id));
    await db()
      .update(tripSchedules)
      .set({ seatsTaken: 2, status: 'full' })
      .where(eq(tripSchedules.id, b.schedule.id));
    const r2 = await approvePayment(db(), { paymentId: b.payment.id, actorId: admin.id });
    expect(r2.status).toBe('needs_attention');
    const after = await reloadSchedule(b.schedule.id);
    expect(after.seatsTaken).toBe(2); // tetap tidak melebihi kapasitas
    expect((await reloadBooking(b.started.booking.id)).status).toBe('needs_attention');
  });
});

describe('token akses', () => {
  it('menerbitkan token baru dan mencabut yang lama', async () => {
    const { started } = await bookingAwaitingVerification();
    const code = started.booking.code;
    const old = started.accessToken;
    expect(await findBookingByAccess(db(), code, old)).not.toBeNull();

    const fresh = await issueAccessToken(db(), started.booking.id);
    expect(fresh).not.toBe(old);
    expect((await findBookingByAccess(db(), code, fresh))?.code).toBe(code);
    expect(await findBookingByAccess(db(), code, old)).toBeNull();
  });
});

describe('halaman status', () => {
  it('pemilik token melihat bookingnya; token atau kode salah tidak melihat apa pun', async () => {
    const { started } = await bookingAwaitingVerification();
    const view = await findBookingByAccess(db(), started.booking.code, started.accessToken);
    expect(view).toMatchObject({
      code: started.booking.code,
      status: 'pending_payment',
      seatCount: 2,
      totalAmount: 2_500_000,
      dpAmount: 750_000,
      payment: { status: 'needs_verification', hasProof: true, amount: 750_000 },
    });
    expect(view!.participants.map((p) => p.fullName)).toEqual(['Peserta 1', 'Peserta 2']);
    expect(JSON.stringify(view)).not.toMatch(/tokenHash|accessTokenHash/);
    expect(await findBookingByAccess(db(), started.booking.code, 'token-salah')).toBeNull();
    expect(await findBookingByAccess(db(), 'ARJ-0000-0000', started.accessToken)).toBeNull();
  });

  it('Cek Status: kode dengan email ATAU empat digit akhir WhatsApp; selainnya null tanpa membedakan sebabnya', async () => {
    const { schedule } = await setup();
    const email = `cek-${uid()}@example.com`;
    const started = await startPayment(
      db(),
      await readyDraft(schedule.id, { adults: 1, children: 0 }, email),
    );
    const code = started.booking.code;

    expect((await findBookingForLookup(db(), { code, email: email.toUpperCase() }))?.code).toBe(
      code,
    );
    expect(
      (await findBookingForLookup(db(), { code: code.toLowerCase(), phoneLast4: '7890' }))?.code,
    ).toBe(code);
    expect(await findBookingForLookup(db(), { code, email: 'orang-lain@example.com' })).toBeNull();
    expect(await findBookingForLookup(db(), { code, phoneLast4: '0000' })).toBeNull();
    expect(await findBookingForLookup(db(), { code })).toBeNull(); // tanpa verifikasi
    expect(await findBookingForLookup(db(), { code, phoneLast4: '78' })).toBeNull(); // bukan empat digit
    expect(await findBookingForLookup(db(), { code: 'ARJ-9999-9999', email })).toBeNull();
  });
});
