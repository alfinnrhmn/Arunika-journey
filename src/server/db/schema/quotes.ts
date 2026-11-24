import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { idr, pk, timestamps, tstz } from './_helpers';
import { users } from './users';

export const requestStatus = pgEnum('request_status', [
  'pending_review',
  'in_progress',
  'proposal_sent',
  'approved',
  'revision_requested',
  'declined',
  'converted',
  'expired',
]);
export const proposalStatus = pgEnum('proposal_status', [
  'draft',
  'sent',
  'approved',
  'rejected',
  'superseded',
]);

/** Permintaan Private Trip (Request a Quote). Kode: RQ-YYMM-NNNN. */
export const quoteRequests = pgTable(
  'quote_requests',
  {
    id: pk(),
    code: text('code').notNull().unique(),
    status: requestStatus('status').notNull().default('pending_review'),
    contactName: text('contact_name').notNull(),
    contactEmail: text('contact_email').notNull(),
    contactPhone: text('contact_phone').notNull(),
    destination: text('destination'),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    flexibleDates: boolean('flexible_dates').notNull().default(false),
    participants: integer('participants').notNull(),
    durationDays: integer('duration_days'),
    accommodation: text('accommodation'),
    activities: jsonb('activities')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    budget: text('budget'),
    notes: text('notes'),
    assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    check('quote_requests_participants_positive', sql`${t.participants} > 0`),
    check(
      'quote_requests_dates',
      sql`${t.endDate} is null or ${t.startDate} is null or ${t.endDate} >= ${t.startDate}`,
    ),
    index('quote_requests_status_idx').on(t.status),
    index('quote_requests_email_idx').on(sql`lower(${t.contactEmail})`),
  ],
);

/** Draf "simpan dan lanjutkan nanti"; tautan lanjut dikirim ke email, token disimpan sebagai hash. */
export const quoteDrafts = pgTable('quote_drafts', {
  id: pk(),
  email: text('email').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: tstz('expires_at').notNull(),
  ...timestamps(),
});

/** Proposal dari admin. Tautan pelanggan memakai token acak 128-bit, disimpan sebagai hash. */
export const proposals = pgTable(
  'proposals',
  {
    id: pk(),
    quoteRequestId: uuid('quote_request_id')
      .notNull()
      .references(() => quoteRequests.id, { onDelete: 'restrict' }),
    version: integer('version').notNull().default(1),
    itinerary: jsonb('itinerary')
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    inclusions: jsonb('inclusions')
      .$type<unknown[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Harga final (IDR, sudah termasuk PPN); tidak pernah dihitung otomatis. */
    priceTotal: idr('price_total').notNull(),
    validUntil: tstz('valid_until').notNull(),
    status: proposalStatus('status').notNull().default('draft'),
    accessTokenHash: text('access_token_hash').unique(),
    sentAt: tstz('sent_at'),
    revisionNote: text('revision_note'),
    approvedAt: tstz('approved_at'),
    approvedIp: text('approved_ip'),
    ...timestamps(),
  },
  (t) => [
    unique('proposals_request_version_unique').on(t.quoteRequestId, t.version),
    check('proposals_price_nonnegative', sql`${t.priceTotal} >= 0`),
    check('proposals_version_positive', sql`${t.version} > 0`),
    // Persetujuan wajib mencatat waktu dan IP (PT-06).
    check(
      'proposals_approval_recorded',
      sql`${t.status} <> 'approved' or (${t.approvedAt} is not null and ${t.approvedIp} is not null)`,
    ),
  ],
);
