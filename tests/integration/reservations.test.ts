import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { bookingParticipants, payments } from '../../src/server/db/schema';
import { writeAudit } from '../../src/server/audit';
import { createStaffUser } from '../../src/server/auth/users';
import {
  getReservation,
  listReservations,
  listTripsWithBookings,
  parseReservationTab,
} from '../../src/features/reservations/queries';
import { makeBooking, makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
});

const db = () => getDb();
/** Penanda unik per tes: basis uji dipakai bersama, jadi setiap tes menyaring dengan penandanya sendiri. */
const tag = () => uuidv7().slice(-10);

async function seed(token: string) {
  const trip = await makeTrip({ title: `Trip ${token}` });
  const march = await makeSchedule(trip.id, {
    departureDate: '2031-03-14',
    returnDate: '2031-03-15',
  });
  const april = await makeSchedule(trip.id, {
    departureDate: '2031-04-11',
    returnDate: '2031-04-12',
  });
  const mk = (
    name: string,
    status: Parameters<typeof makeBooking>[1] extends infer O
      ? O extends { status?: infer S }
        ? S
        : never
      : never,
    scheduleId: string | null,
    extra: Record<string, unknown> = {},
  ) =>
    makeBooking(scheduleId, {
      contactName: `${name} ${token}`,
      status,
      ...(scheduleId ? {} : { type: 'private' as const }),
      ...extra,
    });
  const pending = await mk('Rafi', 'pending_payment', march.id);
  const confirmed = await mk('Nadia', 'confirmed', march.id);
  const completed = await mk('Dimas', 'completed', april.id);
  const cancelled = await mk('Putri', 'cancelled', april.id);
  const expired = await mk('Maya', 'expired', april.id);
  const attention = await mk('Hendra', 'needs_attention', march.id);
  const draft = await mk('Draf', 'draft', march.id);
  const priv = await mk('Pribadi', 'confirmed', null);
  return {
    trip,
    march,
    april,
    pending,
    confirmed,
    completed,
    cancelled,
    expired,
    attention,
    draft,
    priv,
  };
}

describe('daftar reservasi', () => {
  it('menghitung per tab; draf tidak pernah tampil; Confirmed memuat Selesai; Dibatalkan memuat kedaluwarsa', async () => {
    const t = tag();
    await seed(t);
    const all = await listReservations(db(), { q: t });
    expect(all.total).toBe(7); // 8 dibuat, 1 draf disembunyikan
    expect(all.counts).toEqual({
      semua: 7,
      pending_payment: 1,
      perlu_perhatian: 1,
      confirmed: 3, // confirmed + completed + private confirmed
      dibatalkan: 2, // cancelled + expired
    });
    expect(all.items.map((i) => i.contactName).join()).not.toContain('Draf');

    const tab = async (tabName: Parameters<typeof parseReservationTab>[0]) =>
      (await listReservations(db(), { q: t, tab: parseReservationTab(tabName) })).items.length;
    expect(await tab('pending_payment')).toBe(1);
    expect(await tab('confirmed')).toBe(3);
    expect(await tab('dibatalkan')).toBe(2);
    expect(await tab('perlu_perhatian')).toBe(1);
    expect(await tab('ngawur')).toBe(7); // tab tak dikenal = Semua
  });

  it('pencarian cocok pada kode, nama pemesan, dan nama trip; karakter wildcard LIKE diperlakukan apa adanya', async () => {
    const t = tag();
    const s = await seed(t);
    expect((await listReservations(db(), { q: `Nadia ${t}` })).items.map((i) => i.id)).toEqual([
      s.confirmed.id,
    ]);
    expect((await listReservations(db(), { q: s.pending.code })).items.map((i) => i.id)).toEqual([
      s.pending.id,
    ]);
    expect((await listReservations(db(), { q: `Trip ${t}` })).total).toBe(7 - 1); // tanpa Pribadi (tanpa trip)
    expect((await listReservations(db(), { q: `  nadia ${t}  ` })).total).toBe(1); // huruf besar kecil dan spasi
    expect((await listReservations(db(), { q: '%' })).total).toBe(0);
    expect((await listReservations(db(), { q: '_' })).total).toBe(0);
    expect((await listReservations(db(), { q: `${t}\\` })).total).toBe(0);
  });

  it('filter bulan keberangkatan dan trip; masukan tidak valid diabaikan dan booking tanpa jadwal ikut tersaring keluar oleh bulan', async () => {
    const t = tag();
    const s = await seed(t);
    const march = await listReservations(db(), { q: t, month: '2031-03' });
    expect(march.items.map((i) => i.departureDate)).toEqual(Array(march.total).fill('2031-03-14'));
    expect(march.total).toBe(3); // pending, confirmed, attention
    expect((await listReservations(db(), { q: t, month: '2031-04' })).total).toBe(3);
    expect((await listReservations(db(), { q: t, month: '2031-05' })).total).toBe(0);
    // bulan Desember (rollover tahun) tidak menggeser
    expect((await listReservations(db(), { q: t, month: '2031-12' })).total).toBe(0);
    // masukan rusak diabaikan
    for (const bad of ['2031-13', '2031-3', "2031-03'; drop table bookings;--", '']) {
      expect((await listReservations(db(), { q: t, month: bad })).total, bad).toBe(7);
    }
    expect((await listReservations(db(), { q: t, tripId: s.trip.id })).total).toBe(6);
    expect((await listReservations(db(), { q: t, tripId: 'bukan-uuid' })).total).toBe(7);
    expect((await listReservations(db(), { q: t, tripId: uuidv7() })).total).toBe(0);
  });

  it('halaman: urutan terbaru dulu, tanpa tumpang tindih, halaman berlebih dijepit ke yang terakhir', async () => {
    const t = tag();
    await seed(t);
    const p1 = await listReservations(db(), { q: t, pageSize: 3, page: 1 });
    const p2 = await listReservations(db(), { q: t, pageSize: 3, page: 2 });
    const p3 = await listReservations(db(), { q: t, pageSize: 3, page: 3 });
    const ids = [...p1.items, ...p2.items, ...p3.items].map((i) => i.id);
    expect(ids).toHaveLength(7);
    expect(new Set(ids).size).toBe(7);
    const dates = [...p1.items, ...p2.items, ...p3.items].map((i) => i.createdAt.getTime());
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    const far = await listReservations(db(), { q: t, pageSize: 3, page: 99 });
    expect(far.page).toBe(3);
    expect(far.items.map((i) => i.id)).toEqual(p3.items.map((i) => i.id));
    expect((await listReservations(db(), { q: t, page: -5, pageSize: 3 })).page).toBe(1);
    expect((await listReservations(db(), { q: t, pageSize: 100000 })).pageSize).toBe(100);
  });

  it('Private Trip tanpa jadwal tampil dengan trip kosong', async () => {
    const t = tag();
    const s = await seed(t);
    const r = await listReservations(db(), { q: `Pribadi ${t}` });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ id: s.priv.id, tripTitle: null, departureDate: null });
  });

  it('pilihan trip untuk filter hanya berisi trip yang punya booking', async () => {
    const t = tag();
    const s = await seed(t);
    const empty = await makeTrip({ title: `Kosong ${t}` });
    const list = await listTripsWithBookings(db());
    expect(list.map((x) => x.id)).toContain(s.trip.id);
    expect(list.map((x) => x.id)).not.toContain(empty.id);
  });
});

describe('detail reservasi', () => {
  it('id tidak valid, tidak ada, atau draf: null (tanpa galat)', async () => {
    const t = tag();
    const s = await seed(t);
    expect(await getReservation(db(), 'bukan-uuid')).toBeNull();
    expect(await getReservation(db(), "'; drop table bookings;--")).toBeNull();
    expect(await getReservation(db(), uuidv7())).toBeNull();
    expect(await getReservation(db(), s.draft.id)).toBeNull();
  });

  it('memuat jadwal, peserta berurutan, pembayaran, sisa tagihan, dan riwayat dari audit; token akses tidak ikut', async () => {
    const t = tag();
    const s = await seed(t);
    const staff = await createStaffUser(db(), {
      email: `adm-${t}@uji.example`,
      name: 'Salsa Uji',
      role: 'admin_ops',
      password: 'sandi-uji-yang-cukup-panjang',
    });
    await db()
      .insert(bookingParticipants)
      .values([
        {
          bookingId: s.confirmed.id,
          position: 2,
          fullName: 'Dimas Setiawan',
          specialNeeds: 'Vegetarian',
        },
        { bookingId: s.confirmed.id, position: 1, fullName: 'Laras Setiawati' },
      ]);
    const [dp, balance] = await db()
      .insert(payments)
      .values([
        {
          bookingId: s.confirmed.id,
          kind: 'dp',
          provider: 'manual',
          method: 'transfer',
          amount: 750_000,
          status: 'paid',
          verifiedBy: staff.id,
          verifiedAt: new Date(),
          paidAt: new Date(),
        },
        {
          bookingId: s.confirmed.id,
          kind: 'balance',
          provider: 'manual',
          amount: 1_750_000,
          status: 'pending',
        },
      ])
      .returning();
    await writeAudit(db(), {
      action: 'booking.created',
      entity: 'booking',
      entityId: s.confirmed.id,
    });
    await writeAudit(db(), {
      actorId: staff.id,
      action: 'payment.approved',
      entity: 'payment',
      entityId: dp!.id,
    });
    // peristiwa milik booking lain tidak boleh bocor ke riwayat ini
    await writeAudit(db(), {
      action: 'booking.created',
      entity: 'booking',
      entityId: s.pending.id,
    });
    await writeAudit(db(), {
      action: 'payment.approved',
      entity: 'payment',
      entityId: balance!.id.replace(/.$/, '0'),
    });

    const d = await getReservation(db(), s.confirmed.id);
    expect(d).not.toBeNull();
    expect(d!.booking.code).toBe(s.confirmed.code);
    expect(Object.keys(d!.booking)).not.toContain('accessTokenHash');
    expect(d!.trip).toMatchObject({ title: `Trip ${t}`, durationDays: 2, nights: 1 });
    expect(d!.schedule).toMatchObject({ departureDate: '2031-03-14', capacity: 4 });
    expect(d!.participants.map((p) => p.fullName)).toEqual(['Laras Setiawati', 'Dimas Setiawan']);
    expect(d!.payments.map((p) => p.kind)).toEqual(['dp', 'balance']);
    expect(d!.payments[0]).toMatchObject({ verifiedByName: 'Salsa Uji', hasProof: false });
    expect(d!.paidAmount).toBe(750_000);
    expect(d!.remainingAmount).toBe(2_500_000 - 750_000);
    expect(d!.events.map((e) => e.action)).toEqual(['booking.created', 'payment.approved']);
    expect(d!.events[1]!.actorName).toBe('Salsa Uji');
  });

  it('Private Trip tanpa jadwal tetap bisa dibuka (trip dan jadwal kosong)', async () => {
    const t = tag();
    const s = await seed(t);
    const d = await getReservation(db(), s.priv.id);
    expect(d).not.toBeNull();
    expect(d!.trip).toBeNull();
    expect(d!.schedule).toBeNull();
    expect(d!.remainingAmount).toBe(s.priv.totalAmount);
  });
});
