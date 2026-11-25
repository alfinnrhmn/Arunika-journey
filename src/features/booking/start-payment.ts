import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { writeAudit } from '../../server/audit';
import type { getDb } from '../../server/db';
import { nextCode } from '../../server/db/codes';
import {
  bookingDrafts,
  bookingParticipants,
  bookings,
  cancellationPolicies,
  legalDocuments,
  payments,
  tripSchedules,
} from '../../server/db/schema';
import { queueEmail } from '../../server/outbox';
import { formatRupiah } from '../../lib/format';
import { holdSeats } from '../schedules/quota';
import { hashToken, newToken } from './draft';
import { BookingError } from './errors';
import { bookability, loadSchedule, priceFor, seatsRemaining } from './schedule';
import { contactSchema, fieldIssues, participantSchema, type ParticipantInput } from './schemas';
import { getBookingSettings } from './settings';

type Db = ReturnType<typeof getDb>;

/** Versi terbit terbaru tiap dokumen legal; 1 bila belum ada yang terbit (dokumen masih draf di dev). */
async function currentLegalVersions(tx: Parameters<Parameters<Db['transaction']>[0]>[0]) {
  const rows = await tx
    .select({ type: legalDocuments.type, version: sql<number>`max(${legalDocuments.version})` })
    .from(legalDocuments)
    .where(eq(legalDocuments.status, 'published'))
    .groupBy(legalDocuments.type);
  const v = new Map(rows.map((r) => [r.type, Number(r.version)]));
  return {
    terms: v.get('terms') ?? 1,
    privacy: v.get('privacy') ?? 1,
    refund: v.get('refund') ?? 1,
  };
}

/**
 * Memulai pembayaran (transfer manual): inilah saat kursi DIKUNCI (BK-02), kode ARJ dialokasikan, dan harga
 * serta DP DIBEKUKAN sebagai snapshot (PRD 7.1). Semuanya satu transaksi: bila apa pun gagal, kursi dan
 * nomor kode ikut batal. Harga, total, DP, dan kuota dihitung di server; tidak ada nilai dari klien yang dipercaya.
 *
 * Galat bertipe (`BookingError`): draft_not_found, draft_incomplete, party_invalid, schedule_not_found,
 * schedule_unavailable, quota_insufficient, active_hold_exists.
 */
export async function startPayment(db: Db, token: string, now: Date = new Date()) {
  return db.transaction(async (tx) => {
    // Kunci baris draf: klik ganda atau dua tab tidak membuat dua booking dari draf yang sama.
    const [draft] = await tx
      .select()
      .from(bookingDrafts)
      .where(and(eq(bookingDrafts.tokenHash, hashToken(token)), gt(bookingDrafts.expiresAt, now)))
      .for('update');
    if (!draft)
      throw new BookingError('draft_not_found', 'Draf booking tidak ditemukan atau sudah berakhir');

    // Kelengkapan: pemesan, peserta, persetujuan.
    const issues: Record<string, string> = {};
    const contact = contactSchema.safeParse(draft.contact);
    if (!contact.success) Object.assign(issues, fieldIssues(contact.error, 'contact'));
    const seats = draft.adults + draft.children;
    const participants: ParticipantInput[] = [];
    if (draft.participants.length !== seats)
      issues.participants = `Isi data untuk ${seats} peserta`;
    draft.participants.forEach((raw, i) => {
      const p = participantSchema.safeParse(raw);
      if (p.success) participants.push(p.data);
      else Object.assign(issues, fieldIssues(p.error, `participants.${i}`));
    });
    if (!draft.acceptedAt) issues.accepted = 'Setujui syarat dan ketentuan untuk melanjutkan';
    if (Object.keys(issues).length > 0 || !contact.success) {
      throw new BookingError('draft_incomplete', 'Data booking belum lengkap', { issues });
    }
    if (participants.filter((p) => p.kind === 'adult').length !== draft.adults) {
      throw new BookingError('party_invalid', 'Jumlah dewasa dan anak tidak sesuai');
    }

    const found = await loadSchedule(tx, draft.scheduleId);
    if (!found) throw new BookingError('schedule_not_found', 'Jadwal tidak ditemukan');
    const state = bookability(found.schedule, now);
    if (state === 'full') {
      throw new BookingError('quota_insufficient', 'Jadwal ini sudah penuh', {
        seatsLeft: 0,
        requested: seats,
      });
    }
    if (state !== 'ok') {
      throw new BookingError('schedule_unavailable', 'Jadwal tidak tersedia untuk dipesan', {
        reason: state,
      });
    }

    // Satu hold aktif per email (anti penyalahgunaan hold, PRD 7.2).
    const email = contact.data.email;
    const [active] = await tx
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(sql`lower(${bookings.contactEmail})`, email),
          eq(bookings.status, 'pending_payment'),
          gt(bookings.holdExpiresAt, now),
        ),
      )
      .limit(1);
    if (active) {
      // Kode booking TIDAK disertakan: siapa pun bisa mengetik email orang lain di langkah 2, dan kode + email
      // cukup untuk lolos Cek Status. Pemilik menemukan kodenya di emailnya sendiri.
      throw new BookingError(
        'active_hold_exists',
        'Email ini masih punya booking yang menunggu pembayaran',
      );
    }

    const settings = await getBookingSettings(tx);
    const price = priceFor(
      found,
      { adults: draft.adults, children: draft.children },
      settings.dpPercent,
    );

    // Kunci kursi: satu UPDATE bersyarat atomik. 0 baris = kuota tidak cukup atau jadwal baru saja penuh/ditutup.
    const held = await holdSeats(tx, draft.scheduleId, seats);
    if (!held) {
      const [fresh] = await tx
        .select({
          status: tripSchedules.status,
          capacity: tripSchedules.capacity,
          seatsTaken: tripSchedules.seatsTaken,
        })
        .from(tripSchedules)
        .where(eq(tripSchedules.id, draft.scheduleId));
      const left = fresh ? seatsRemaining(fresh) : 0;
      if (fresh && fresh.status === 'open' && left > 0) {
        throw new BookingError(
          'quota_insufficient',
          'Sisa kursi tidak cukup untuk jumlah peserta',
          {
            seatsLeft: left,
            requested: seats,
          },
        );
      }
      throw new BookingError(
        fresh && fresh.status === 'full' ? 'quota_insufficient' : 'schedule_unavailable',
        'Jadwal tidak lagi tersedia',
        { seatsLeft: left, requested: seats },
      );
    }

    const code = await nextCode(tx, 'ARJ', now);
    const holdExpiresAt = new Date(now.getTime() + settings.holdMinutes * 60_000);
    const accessToken = newToken();
    const legal = await currentLegalVersions(tx);
    const [policy] = await tx
      .select({ id: cancellationPolicies.id })
      .from(cancellationPolicies)
      .orderBy(desc(cancellationPolicies.version))
      .limit(1);

    const [booking] = await tx
      .insert(bookings)
      .values({
        code,
        scheduleId: draft.scheduleId,
        type: 'open',
        status: 'pending_payment',
        contactName: contact.data.name,
        contactEmail: email,
        contactPhone: contact.data.phone,
        adults: draft.adults,
        children: draft.children,
        seatCount: seats,
        priceLines: price.lines,
        totalAmount: price.total,
        dpPercent: price.dpPercent,
        dpAmount: price.dp,
        holdExpiresAt,
        legalAcceptance: { ...legal, acceptedAt: draft.acceptedAt!.toISOString() },
        cancellationPolicyId: policy?.id ?? null,
        source: 'web',
        accessTokenHash: hashToken(accessToken),
      })
      .returning();

    await tx.insert(bookingParticipants).values(
      participants.map((p, i) => ({
        bookingId: booking!.id,
        position: i + 1,
        fullName: p.fullName,
        kind: p.kind,
        specialNeeds: p.specialNeeds,
      })),
    );

    const [payment] = await tx
      .insert(payments)
      .values({
        bookingId: booking!.id,
        kind: 'dp',
        provider: 'manual',
        method: 'bank_transfer',
        amount: price.dp,
        status: 'pending',
        idempotencyKey: `dp:${booking!.id}`,
      })
      .returning();

    await tx.delete(bookingDrafts).where(eq(bookingDrafts.id, draft.id));

    await writeAudit(tx, {
      action: 'booking.created',
      entity: 'booking',
      entityId: booking!.id,
      after: {
        code,
        status: 'pending_payment',
        scheduleId: draft.scheduleId,
        seats,
        total: price.total,
        dp: price.dp,
        holdExpiresAt: holdExpiresAt.toISOString(),
      },
    });

    await queueEmail(tx, {
      template: 'booking_pending_payment',
      to: email,
      payload: {
        kode_booking: code,
        nama: contact.data.name,
        paket: found.trip.title,
        tanggal: found.schedule.departureDate,
        total: formatRupiah(price.total),
        dp: formatRupiah(price.dp),
        batas_bayar: holdExpiresAt.toISOString(),
      },
    });

    return { booking: booking!, payment: payment!, accessToken, price, holdExpiresAt };
  });
}
