import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { idr, pk, timestamps, tstz } from './_helpers';
import { cancellationPolicies, tripSchedules, tripType } from './catalog';
import { media } from './media';
import { proposals } from './quotes';
import { users } from './users';

export const bookingStatus = pgEnum('booking_status', [
  'draft',
  'pending_payment',
  'confirmed',
  'completed',
  'expired',
  'cancelled',
  'refunded',
  'needs_attention',
]);
/** Status pelunasan terpisah dari status booking; kosong bila belum ada sisa tagihan. */
export const balanceStatus = pgEnum('balance_status', ['due', 'paid', 'overdue']);
export const bookingSource = pgEnum('booking_source', ['web', 'manual']);
export const participantKind = pgEnum('participant_kind', ['adult', 'child', 'infant']);
export const paymentKind = pgEnum('payment_kind', ['dp', 'balance']);
export const paymentStatus = pgEnum('payment_status', [
  'pending',
  'needs_verification',
  'paid',
  'failed',
  'expired',
  'rejected',
  'refunded',
  'partially_refunded',
]);
export const refundStatus = pgEnum('refund_status', [
  'pending_approval',
  'approved',
  'processed',
  'rejected',
]);

/**
 * Booking Open Trip (kode ARJ-YYMM-NNNN) dan Private Trip dari proposal. Harga dan DP adalah snapshot
 * saat hold dibuat. `schedule_id` kosong untuk Private Trip (tanpa kuota; tanggal dari proposal).
 */
export const bookings = pgTable(
  'bookings',
  {
    id: pk(),
    code: text('code').notNull().unique(),
    scheduleId: uuid('schedule_id').references(() => tripSchedules.id, { onDelete: 'restrict' }),
    type: tripType('type').notNull(),
    status: bookingStatus('status').notNull().default('draft'),
    balanceStatus: balanceStatus('balance_status'),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    adults: integer('adults').notNull(),
    children: integer('children').notNull().default(0),
    seatCount: integer('seat_count').notNull(),
    priceLines: jsonb('price_lines')
      .$type<{ label: string; qty: number; unitPrice: number; amount: number }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    totalAmount: idr('total_amount').notNull(),
    dpPercent: integer('dp_percent').notNull(),
    dpAmount: idr('dp_amount').notNull(),
    holdExpiresAt: tstz('hold_expires_at'),
    /** Versi dokumen legal yang disetujui pemesan: { terms, privacy, refund, acceptedAt }. */
    legalAcceptance: jsonb('legal_acceptance').$type<{
      terms: number;
      privacy: number;
      refund: number;
      acceptedAt: string;
    }>(),
    /** Kebijakan batal yang berlaku saat booking dibuat (snapshot versi). */
    cancellationPolicyId: uuid('cancellation_policy_id').references(() => cancellationPolicies.id, {
      onDelete: 'restrict',
    }),
    source: bookingSource('source').notNull().default('web'),
    proposalId: uuid('proposal_id').references(() => proposals.id, { onDelete: 'restrict' }),
    /** Hash token akses (lanjutkan booking / halaman status). Token mentah tidak disimpan. */
    accessTokenHash: text('access_token_hash').unique(),
    notes: text('notes'),
    ...timestamps(),
  },
  (t) => [
    // Open Trip wajib terikat jadwal agar kuota selalu terhitung.
    check(
      'bookings_open_requires_schedule',
      sql`${t.type} = 'private' or ${t.scheduleId} is not null`,
    ),
    check('bookings_adults_positive', sql`${t.adults} >= 1 and ${t.children} >= 0`),
    check('bookings_seat_count', sql`${t.seatCount} = ${t.adults} + ${t.children}`),
    check(
      'bookings_amounts',
      sql`${t.totalAmount} >= 0 and ${t.dpAmount} between 0 and ${t.totalAmount}`,
    ),
    check('bookings_dp_percent', sql`${t.dpPercent} between 0 and 100`),
    index('bookings_status_hold_idx').on(t.status, t.holdExpiresAt),
    index('bookings_schedule_idx').on(t.scheduleId),
    index('bookings_contact_email_idx').on(sql`lower(${t.contactEmail})`),
  ],
);

/**
 * Draf booking Open Trip (langkah 1 dan 2) yang disimpan di server dan dirujuk lewat cookie (BK-12), supaya
 * tombol Kembali berfungsi dan data tidak hilang. Terpisah dari `bookings` agar draf yang ditinggalkan tidak
 * menghabiskan nomor ARJ: kode booking baru dialokasikan saat hold dibuat. Token mentah hanya ada di cookie.
 */
export const bookingDrafts = pgTable(
  'booking_drafts',
  {
    id: pk(),
    /** Hash SHA-256 token cookie; token mentah tidak disimpan. */
    tokenHash: text('token_hash').notNull().unique(),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => tripSchedules.id, { onDelete: 'cascade' }),
    adults: integer('adults').notNull().default(2),
    children: integer('children').notNull().default(0),
    contact: jsonb('contact').$type<{ name: string; email: string; phone: string }>(),
    participants: jsonb('participants')
      .$type<{ fullName: string; kind: 'adult' | 'child'; specialNeeds: string | null }[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Persetujuan syarat, privasi, dan kebijakan batal (waktu dicatat; versi dokumen dicatat saat hold). */
    acceptedAt: tstz('accepted_at'),
    expiresAt: tstz('expires_at').notNull(),
    ...timestamps(),
  },
  (t) => [
    check('booking_drafts_party', sql`${t.adults} >= 1 and ${t.children} >= 0`),
    index('booking_drafts_expires_idx').on(t.expiresAt),
  ],
);

export const bookingParticipants = pgTable(
  'booking_participants',
  {
    id: pk(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    position: smallint('position').notNull(),
    fullName: text('full_name').notNull(),
    kind: participantKind('kind').notNull().default('adult'),
    specialNeeds: text('special_needs'),
  },
  (t) => [index('booking_participants_booking_idx').on(t.bookingId)],
);

/**
 * Pembayaran DP dan pelunasan. Status gateway diputuskan oleh webhook (idempotent lewat
 * `idempotency_key` dan `provider_ref` unik); transfer manual melewati antrean verifikasi admin.
 */
export const payments = pgTable(
  'payments',
  {
    id: pk(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    kind: paymentKind('kind').notNull().default('dp'),
    provider: text('provider').notNull(),
    providerRef: text('provider_ref').unique(),
    method: text('method'),
    amount: idr('amount').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    proofMediaId: uuid('proof_media_id').references(() => media.id, { onDelete: 'set null' }),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: tstz('verified_at'),
    paidAt: tstz('paid_at'),
    idempotencyKey: text('idempotency_key').unique(),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    ...timestamps(),
  },
  (t) => [
    check('payments_amount_positive', sql`${t.amount} > 0`),
    index('payments_booking_idx').on(t.bookingId),
    index('payments_status_idx').on(t.status),
    // Hanya satu pembayaran DP yang boleh berstatus lunas per booking.
    uniqueIndex('payments_one_paid_dp_per_booking')
      .on(t.bookingId)
      .where(sql`${t.kind} = 'dp' and ${t.status} = 'paid'`),
  ],
);

/** Refund selalu disetujui Owner; tidak ada refund otomatis. */
export const refunds = pgTable(
  'refunds',
  {
    id: pk(),
    paymentId: uuid('payment_id')
      .notNull()
      .references(() => payments.id, { onDelete: 'restrict' }),
    amount: idr('amount').notNull(),
    reason: text('reason').notNull(),
    status: refundStatus('status').notNull().default('pending_approval'),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    processedBy: uuid('processed_by').references(() => users.id, { onDelete: 'set null' }),
    decisionNote: text('decision_note'),
    ...timestamps(),
  },
  (t) => [
    check('refunds_amount_positive', sql`${t.amount} > 0`),
    // Refund yang disetujui atau diproses wajib mencatat siapa yang menyetujui.
    check(
      'refunds_approval_recorded',
      sql`${t.status} in ('pending_approval', 'rejected') or ${t.approvedBy} is not null`,
    ),
    index('refunds_payment_idx').on(t.paymentId),
    index('refunds_status_idx').on(t.status),
  ],
);
