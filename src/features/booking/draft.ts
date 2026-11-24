import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import type { Executor } from '../../server/db/codes';
import { bookingDrafts } from '../../server/db/schema';
import { BookingError } from './errors';
import { requireBookable, seatsRemaining } from './schedule';
import {
  contactSchema,
  fieldIssues,
  participantSchema,
  partySchema,
  type Contact,
  type ParticipantInput,
} from './schemas';
import { getBookingSettings } from './settings';

/**
 * Draf booking di server (BK-12). Cookie hanya memuat token acak; di database hanya hash-nya yang tersimpan,
 * jadi bocornya isi tabel tidak memberi akses ke draf siapa pun.
 */
export type Draft = typeof bookingDrafts.$inferSelect;

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('base64url');

/** Kunci cookie draf dan lama hidupnya mengikuti Pengaturan (draftHours); lihat halaman yang memasangnya. */
export const DRAFT_COOKIE = 'arj_draft';

export async function getDraft(db: Executor, token: string, now: Date = new Date()) {
  if (!token) return null;
  const [row] = await db
    .select()
    .from(bookingDrafts)
    .where(and(eq(bookingDrafts.tokenHash, hashToken(token)), gt(bookingDrafts.expiresAt, now)));
  return row ?? null;
}

/**
 * Membuat draf dari langkah 1 (jadwal dan jumlah peserta). Divalidasi di server: jadwal harus terbuka,
 * jumlah peserta dalam batas, dan sisa kursi cukup. Kuota di sini hanya informasi; penguncian sebenarnya
 * terjadi saat pembayaran dimulai (`startPayment`).
 */
export async function createDraft(
  db: Executor,
  input: { scheduleId: string; adults: number; children: number },
  now: Date = new Date(),
) {
  const settings = await getBookingSettings(db);
  const party = partySchema(settings.maxParticipants).safeParse({
    adults: input.adults,
    children: input.children,
  });
  if (!party.success) {
    throw new BookingError('party_invalid', party.error.issues[0]!.message, {
      issues: fieldIssues(party.error),
    });
  }
  const { schedule } = await requireBookable(db, input.scheduleId, now);
  const left = seatsRemaining(schedule);
  const seats = input.adults + input.children;
  if (seats > left) {
    throw new BookingError('quota_insufficient', 'Sisa kursi tidak cukup untuk jumlah peserta', {
      seatsLeft: left,
      requested: seats,
    });
  }

  const token = newToken();
  const [draft] = await db
    .insert(bookingDrafts)
    .values({
      tokenHash: hashToken(token),
      scheduleId: input.scheduleId,
      adults: input.adults,
      children: input.children,
      participants: [],
      expiresAt: new Date(now.getTime() + settings.draftHours * 3_600_000),
    })
    .returning();
  return { token, draft: draft! };
}

/** Mengubah jadwal/jumlah peserta di draf (kembali ke langkah 1). Data pemesan yang sudah diisi dipertahankan. */
export async function updateParty(
  db: Executor,
  token: string,
  input: { scheduleId: string; adults: number; children: number },
  now: Date = new Date(),
) {
  const draft = await getDraft(db, token, now);
  if (!draft)
    throw new BookingError('draft_not_found', 'Draf booking tidak ditemukan atau sudah berakhir');
  const settings = await getBookingSettings(db);
  const party = partySchema(settings.maxParticipants).safeParse({
    adults: input.adults,
    children: input.children,
  });
  if (!party.success) {
    throw new BookingError('party_invalid', party.error.issues[0]!.message, {
      issues: fieldIssues(party.error),
    });
  }
  const { schedule } = await requireBookable(db, input.scheduleId, now);
  const seats = input.adults + input.children;
  const left = seatsRemaining(schedule);
  if (seats > left) {
    throw new BookingError('quota_insufficient', 'Sisa kursi tidak cukup untuk jumlah peserta', {
      seatsLeft: left,
      requested: seats,
    });
  }
  // Susunan peserta mengikuti jumlah baru: nama yang sudah diisi tetap, kelebihannya dibuang.
  const kinds = [
    ...Array<'adult'>(input.adults).fill('adult'),
    ...Array<'child'>(input.children).fill('child'),
  ];
  const participants = kinds.map((kind, i) => ({
    fullName: draft.participants[i]?.fullName ?? '',
    kind,
    specialNeeds: draft.participants[i]?.specialNeeds ?? null,
  }));
  const [row] = await db
    .update(bookingDrafts)
    .set({
      scheduleId: input.scheduleId,
      adults: input.adults,
      children: input.children,
      participants,
    })
    .where(eq(bookingDrafts.id, draft.id))
    .returning();
  return row!;
}

export interface DetailsInput {
  contact: unknown;
  participants: unknown[];
  accepted: boolean;
}

/**
 * Menyimpan langkah 2 (data pemesan, peserta, persetujuan). Mengembalikan peta kesalahan per bidang
 * (`contact.email`, `participants.0.fullName`, `accepted`) bila belum valid; data yang valid tetap
 * disimpan sebagian sehingga pengunjung tidak kehilangan isian (BK-04 dan BK-05).
 */
export async function saveDetails(
  db: Executor,
  token: string,
  input: DetailsInput,
  now: Date = new Date(),
): Promise<
  { ok: true; draft: Draft } | { ok: false; issues: Record<string, string>; draft: Draft }
> {
  const draft = await getDraft(db, token, now);
  if (!draft)
    throw new BookingError('draft_not_found', 'Draf booking tidak ditemukan atau sudah berakhir');

  const issues: Record<string, string> = {};
  const contact = contactSchema.safeParse(input.contact);
  if (!contact.success) Object.assign(issues, fieldIssues(contact.error, 'contact'));

  const seats = draft.adults + draft.children;
  const participants: ParticipantInput[] = [];
  if (input.participants.length !== seats) {
    issues.participants = `Isi data untuk ${seats} peserta`;
  }
  input.participants.forEach((raw, i) => {
    const p = participantSchema.safeParse(raw);
    if (p.success) {
      participants.push(p.data);
    } else {
      Object.assign(issues, fieldIssues(p.error, `participants.${i}`));
    }
  });
  // Jenis tiap peserta mengikuti jumlah dewasa/anak di langkah 1; klien tidak boleh mengubahnya.
  const adultsGiven = participants.filter((p) => p.kind === 'adult').length;
  if (participants.length === seats && adultsGiven !== draft.adults) {
    issues.participants = 'Jumlah dewasa dan anak tidak sesuai dengan langkah 1';
  }
  if (!input.accepted) {
    issues.accepted =
      'Setujui syarat dan ketentuan, kebijakan privasi, dan kebijakan batal untuk melanjutkan';
  }

  const [saved] = await db
    .update(bookingDrafts)
    .set({
      ...(contact.success ? { contact: contact.data as Contact } : {}),
      participants: participants.length === seats ? participants : draft.participants,
      acceptedAt: input.accepted ? (draft.acceptedAt ?? now) : null,
    })
    .where(eq(bookingDrafts.id, draft.id))
    .returning();

  if (Object.keys(issues).length > 0) return { ok: false, issues, draft: saved! };
  return { ok: true, draft: saved! };
}

/** Membuang draf yang sudah kedaluwarsa (dipanggil job berkala). */
export async function purgeExpiredDrafts(db: Executor, now: Date = new Date()) {
  const rows = await db
    .delete(bookingDrafts)
    .where(lt(bookingDrafts.expiresAt, now))
    .returning({ id: bookingDrafts.id });
  return rows.length;
}
