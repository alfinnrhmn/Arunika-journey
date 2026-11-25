import { afterAll, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { and, eq } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { auditLogs, bookings, media, payments, tripSchedules } from '../../src/server/db/schema';
import { createDraft, saveDetails, startPayment, submitProof } from '../../src/features/booking';
import {
  countAwaitingVerification,
  getPaymentReview,
  getProofFile,
  listPayments,
} from '../../src/features/payments';
import { localStorage } from '../../src/server/storage';
import { createStaffUser } from '../../src/server/auth/users';
import type { Staff } from '../../src/server/auth/session';
import { POST as approve } from '../../src/pages/dashboard/pembayaran/[id]/setujui';
import { POST as reject } from '../../src/pages/dashboard/pembayaran/[id]/tolak';
import { GET as proofFile } from '../../src/pages/dashboard/pembayaran/[id]/bukti';
import { makeSchedule, makeTrip } from './factories';

afterAll(async () => {
  await closeDb();
  await rm('./uploads/_test', { recursive: true, force: true });
});

const db = () => getDb();
const uid = () => uuidv7().slice(-12);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(300, 9),
]);

async function makeStaff(role: 'owner' | 'admin_ops' = 'admin_ops'): Promise<Staff> {
  const email = `staf-${uid()}@uji.example`;
  const u = await createStaffUser(db(), {
    email,
    name: 'Admin Uji',
    role,
    password: 'sandi-uji-yang-cukup-panjang',
  });
  return { id: u.id, name: 'Admin Uji', email, role };
}

/** Booking pending_payment dengan bukti transfer terunggah (masuk antrean verifikasi). */
async function awaiting(capacity = 8, withProof = true) {
  const trip = await makeTrip({
    status: 'published',
    basePrice: 1_250_000,
    title: `Trip ${uid()}`,
  });
  const schedule = await makeSchedule(trip.id, {
    departureDate: '2030-06-10',
    returnDate: '2030-06-11',
    capacity,
  });
  const { token } = await createDraft(db(), { scheduleId: schedule.id, adults: 2, children: 0 });
  const saved = await saveDetails(db(), token, {
    contact: { name: 'Nadia Putri', email: `tamu-${uid()}@uji.example`, phone: '081234567890' },
    participants: [
      { fullName: 'Nadia Putri', kind: 'adult' },
      { fullName: 'Budi Santoso', kind: 'adult', specialNeeds: 'Alergi udang' },
    ],
    accepted: true,
  });
  expect(saved.ok).toBe(true);
  const started = await startPayment(db(), token);
  let paymentId = started.payment.id;
  if (withProof) {
    const proof = await submitProof(db(), localStorage(), {
      code: started.booking.code,
      token: started.accessToken,
      data: PNG,
      mime: 'image/png',
    });
    paymentId = proof.payment.id;
  }
  return { trip, schedule, started, paymentId };
}

const ctx = (id: string, staff?: Staff, form?: Record<string, string>) =>
  ({
    params: { id },
    locals: staff ? { staff } : {},
    request: new Request('http://localhost:4321/x', {
      method: 'POST',
      body: form ? new URLSearchParams(form) : undefined,
    }),
  }) as never;
const where = (r: Response) => r.headers.get('Location');
const seats = async (id: string) =>
  (await db().select().from(tripSchedules).where(eq(tripSchedules.id, id)))[0]!.seatsTaken;
const bookingOf = async (id: string) =>
  (await db().select().from(bookings).where(eq(bookings.id, id)))[0]!;

describe('antrean verifikasi (domain)', () => {
  it('pembayaran dengan bukti masuk tab verifikasi dengan data booking, dan pindah ke riwayat setelah diputuskan', async () => {
    const before = await countAwaitingVerification(db());
    const a = await awaiting();

    expect(await countAwaitingVerification(db())).toBe(before + 1);
    const queue = await listPayments(db(), 'verifikasi', 500);
    const item = queue.find((p) => p.id === a.paymentId)!;
    expect(item).toMatchObject({
      status: 'needs_verification',
      kind: 'dp',
      amount: 750_000,
      code: a.started.booking.code,
      contactName: 'Nadia Putri',
      seatCount: 2,
      totalAmount: 2_500_000,
      tripTitle: a.trip.title,
      departureDate: '2030-06-10',
      hasProof: true,
    });
    expect((await listPayments(db(), 'riwayat', 500)).some((p) => p.id === a.paymentId)).toBe(
      false,
    );

    const admin = await makeStaff();
    expect(where(await approve(ctx(a.paymentId, admin)))).toBe(
      '/dashboard/pembayaran?hasil=disetujui',
    );
    expect((await listPayments(db(), 'verifikasi', 500)).some((p) => p.id === a.paymentId)).toBe(
      false,
    );
    expect(
      (await listPayments(db(), 'riwayat', 500)).find((p) => p.id === a.paymentId),
    ).toMatchObject({
      status: 'paid',
      bookingStatus: 'confirmed',
    });
    expect(await countAwaitingVerification(db())).toBe(before);
  });

  it('pembayaran yang belum ada buktinya tidak masuk antrean', async () => {
    const a = await awaiting(8, false);
    expect((await listPayments(db(), 'verifikasi', 500)).some((p) => p.id === a.paymentId)).toBe(
      false,
    );
  });

  it('tinjauan memuat peserta, kontak, rincian harga, dan berkas bukti; id tidak dikenal: null', async () => {
    const a = await awaiting();
    const r = (await getPaymentReview(db(), a.paymentId))!;
    expect(r.payment).toMatchObject({
      code: a.started.booking.code,
      amount: 750_000,
      hasProof: true,
    });
    expect(r.booking).toMatchObject({ adults: 2, children: 0, dpPercent: 30, dpAmount: 750_000 });
    expect(r.booking.contactPhone).toBe('081234567890');
    expect(r.participants.map((p) => [p.fullName, p.specialNeeds])).toEqual([
      ['Nadia Putri', null],
      ['Budi Santoso', 'Alergi udang'],
    ]);
    expect(r.proof).toMatchObject({ mime: 'image/png', size: PNG.length });
    expect(r.decidedBy).toBeNull();
    expect(await getPaymentReview(db(), uuidv7())).toBeNull();
  });
});

describe('endpoint aksi admin', () => {
  it('menyetujui: booking Confirmed, tercatat atas nama staf yang menyetujui; dua kali ditolak', async () => {
    const admin = await makeStaff();
    const a = await awaiting();
    expect(where(await approve(ctx(a.paymentId, admin)))).toBe(
      '/dashboard/pembayaran?hasil=disetujui',
    );

    expect((await bookingOf(a.started.booking.id)).status).toBe('confirmed');
    const [p] = await db().select().from(payments).where(eq(payments.id, a.paymentId));
    expect(p).toMatchObject({ status: 'paid', verifiedBy: admin.id });
    const [log] = await db()
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entityId, a.paymentId), eq(auditLogs.action, 'payment.approved')));
    expect(log!.actorId).toBe(admin.id);
    expect((await getPaymentReview(db(), a.paymentId))!.decidedBy).toBe('Admin Uji');

    expect(where(await approve(ctx(a.paymentId, admin)))).toBe(
      '/dashboard/pembayaran?galat=status',
    );
  });

  it('tanpa sesi staf: dialihkan ke halaman masuk dan tidak ada yang berubah', async () => {
    const a = await awaiting();
    const res = await approve(ctx(a.paymentId));
    expect(res.status).toBe(303);
    expect(where(res)).toBe('/dashboard/masuk');
    const res2 = await reject(ctx(a.paymentId, undefined, { alasan: 'Tidak sesuai' }));
    expect(where(res2)).toBe('/dashboard/masuk');
    expect((await bookingOf(a.started.booking.id)).status).toBe('pending_payment');
    expect(
      (await db().select().from(payments).where(eq(payments.id, a.paymentId)))[0]!.status,
    ).toBe('needs_verification');
  });

  it('id tidak valid atau tidak dikenal: galat dengan kunci tetap, tanpa efek', async () => {
    const admin = await makeStaff();
    expect(where(await approve(ctx('bukan-uuid', admin)))).toBe(
      '/dashboard/pembayaran?galat=tidak-ditemukan',
    );
    expect(where(await approve(ctx(uuidv7(), admin)))).toBe(
      '/dashboard/pembayaran?galat=tidak-ditemukan',
    );
    expect(where(await reject(ctx(uuidv7(), admin, { alasan: 'Alasan cukup' })))).toBe(
      '/dashboard/pembayaran?galat=tidak-ditemukan',
    );
  });

  it('menolak: alasan wajib; penolakan melepas kursi dan mengubah booking menjadi expired', async () => {
    const admin = await makeStaff('owner');
    const a = await awaiting(4);
    expect(await seats(a.schedule.id)).toBe(2);

    // alasan terlalu pendek atau kosong: kembali ke panel itu, tanpa efek
    expect(where(await reject(ctx(a.paymentId, admin, { alasan: ' ' })))).toBe(
      `/dashboard/pembayaran?pilih=${a.paymentId}&galat=alasan`,
    );
    expect(where(await reject(ctx(a.paymentId, admin, { alasan: 'x'.repeat(501) })))).toBe(
      `/dashboard/pembayaran?pilih=${a.paymentId}&galat=alasan`,
    );
    expect((await bookingOf(a.started.booking.id)).status).toBe('pending_payment');

    expect(
      where(await reject(ctx(a.paymentId, admin, { alasan: 'Nominal transfer tidak sesuai' }))),
    ).toBe('/dashboard/pembayaran?hasil=ditolak');
    expect((await bookingOf(a.started.booking.id)).status).toBe('expired');
    expect(await seats(a.schedule.id)).toBe(0);
    expect(
      (await listPayments(db(), 'riwayat', 500)).find((p) => p.id === a.paymentId)?.status,
    ).toBe('rejected');
  });
});

describe('penyajian bukti transfer', () => {
  it('staf berizin menerima berkas dengan header keamanan; jenis konten dari database', async () => {
    const admin = await makeStaff();
    const a = await awaiting();
    const res = await proofFile(ctx(a.paymentId, admin));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('Content-Security-Policy')).toContain('sandbox');
    expect(res.headers.get('Content-Disposition')).toMatch(
      /^inline; filename="bukti-transfer\.png"$/,
    );
    expect(Buffer.from(await res.arrayBuffer()).equals(PNG)).toBe(true);
  });

  it('tanpa sesi staf: dialihkan, berkas tidak diberikan', async () => {
    const a = await awaiting();
    const res = await proofFile(ctx(a.paymentId));
    expect(res.status).toBe(303);
    expect(where(res)).toBe('/dashboard/masuk');
  });

  it('id bukan UUID, pembayaran tanpa bukti, atau jenis berkas di luar daftar: 404', async () => {
    const admin = await makeStaff();
    expect((await proofFile(ctx('../../etc/passwd', admin))).status).toBe(404);
    const noProof = await awaiting(8, false);
    expect((await proofFile(ctx(noProof.paymentId, admin))).status).toBe(404);

    const a = await awaiting();
    const file = (await getProofFile(db(), a.paymentId))!;
    await db().update(media).set({ mime: 'text/html' }).where(eq(media.storageKey, file.key));
    expect((await proofFile(ctx(a.paymentId, admin))).status).toBe(404);
  });

  it('kunci penyimpanan yang mencoba keluar dari folder unggahan ditolak (404), bukan dibaca', async () => {
    const admin = await makeStaff();
    const a = await awaiting();
    const file = (await getProofFile(db(), a.paymentId))!;
    await db()
      .update(media)
      .set({ storageKey: '../../package.json' })
      .where(eq(media.storageKey, file.key));
    const res = await proofFile(ctx(a.paymentId, admin));
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('"name"');
  });
});
