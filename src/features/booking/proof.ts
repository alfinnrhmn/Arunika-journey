import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { writeAudit } from '../../server/audit';
import type { getDb } from '../../server/db';
import { bookings, media, payments } from '../../server/db/schema';
import type { ObjectStorage } from '../../server/storage';
import { hashToken } from './draft';
import { BookingError } from './errors';

type Db = ReturnType<typeof getDb>;

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

const TYPES: Record<string, { ext: string; matches: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': {
    ext: 'png',
    matches: (b) => b[0] === 0x89 && b.subarray(1, 4).toString('latin1') === 'PNG',
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  'application/pdf': { ext: 'pdf', matches: (b) => b.subarray(0, 4).toString('latin1') === '%PDF' },
};

/** Memeriksa jenis DAN isi berkas (tanda tangan byte), bukan hanya MIME yang dikirim klien. */
export function validateProofFile(data: Buffer, mime: string) {
  const type = TYPES[mime];
  if (!type) {
    throw new BookingError('proof_invalid', 'Format berkas harus JPG, PNG, WebP, atau PDF');
  }
  if (data.length === 0) throw new BookingError('proof_invalid', 'Berkas kosong');
  if (data.length > PROOF_MAX_BYTES) {
    throw new BookingError('proof_invalid', 'Ukuran berkas maksimal 5 MB');
  }
  if (!type.matches(data)) {
    throw new BookingError('proof_invalid', 'Isi berkas tidak sesuai dengan formatnya');
  }
  return type;
}

/**
 * Pelanggan mengunggah bukti transfer (BK-09). Pembayaran masuk antrean verifikasi (`needs_verification`);
 * booking TETAP `pending_payment` dan kursi tetap tertahan. Confirmed hanya setelah admin menyetujui.
 * Hanya pemegang token akses booking yang dapat mengunggah, dan hanya selama hold berlaku.
 */
export async function submitProof(
  db: Db,
  storage: ObjectStorage,
  input: { code: string; token: string; data: Buffer; mime: string },
  now: Date = new Date(),
) {
  const type = validateProofFile(input.data, input.mime);

  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.code, input.code), eq(bookings.accessTokenHash, hashToken(input.token))),
    );
  if (!booking) throw new BookingError('booking_not_found', 'Booking tidak ditemukan');
  if (booking.status !== 'pending_payment') {
    throw new BookingError('invalid_state', 'Booking ini tidak sedang menunggu pembayaran', {
      status: booking.status,
    });
  }
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) {
    throw new BookingError('hold_expired', 'Batas waktu pembayaran sudah lewat');
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.bookingId, booking.id),
        eq(payments.kind, 'dp'),
        inArray(payments.status, ['pending', 'needs_verification']),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (!payment) throw new BookingError('payment_not_found', 'Tagihan DP tidak ditemukan');

  // Simpan berkas dulu; baris database dibuat setelahnya. Berkas yatim tidak berbahaya, baris tanpa berkas berbahaya.
  const key = `proofs/${booking.code}/${randomUUID()}.${type.ext}`;
  await storage.put(key, input.data, input.mime);

  return db.transaction(async (tx) => {
    const [file] = await tx
      .insert(media)
      .values({ storageKey: key, mime: input.mime, size: input.data.length, tags: ['bukti-bayar'] })
      .returning();
    const [updated] = await tx
      .update(payments)
      .set({ proofMediaId: file!.id, status: 'needs_verification', method: 'bank_transfer' })
      .where(eq(payments.id, payment.id))
      .returning();
    await writeAudit(tx, {
      action: 'payment.proof_submitted',
      entity: 'payment',
      entityId: payment.id,
      before: { status: payment.status },
      after: { status: 'needs_verification', bookingCode: booking.code },
    });
    return { payment: updated!, mediaId: file!.id };
  });
}
