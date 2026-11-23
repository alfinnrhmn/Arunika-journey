import { sql } from 'drizzle-orm';
import {
  boolean,
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
import { pk, timestamps, tstz } from './_helpers';
import { trips } from './catalog';
import { users } from './users';

export const outboxChannel = pgEnum('outbox_channel', ['email', 'whatsapp']);
export const outboxStatus = pgEnum('outbox_status', ['pending', 'sent', 'failed']);
export const messageStatus = pgEnum('message_status', ['new', 'replied']);

/** Template email berversi dengan variabel ({{kode_booking}}, {{nama}}, ...). */
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: pk(),
    key: text('key').notNull().unique(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    active: boolean('active').notNull().default(true),
    version: integer('version').notNull().default(1),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [check('email_templates_version_positive', sql`${t.version} > 0`)],
);

/** Antrean notifikasi keluar (outbox) dengan retry; dikirim oleh worker pg-boss. */
export const outbox = pgTable(
  'outbox',
  {
    id: pk(),
    channel: outboxChannel('channel').notNull().default('email'),
    template: text('template').notNull(),
    toAddress: text('to_address').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: outboxStatus('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    scheduledAt: tstz('scheduled_at').notNull().defaultNow(),
    sentAt: tstz('sent_at'),
    ...timestamps(),
  },
  (t) => [
    check('outbox_attempts_nonnegative', sql`${t.attempts} >= 0`),
    index('outbox_status_scheduled_idx').on(t.status, t.scheduledAt),
  ],
);

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: pk(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    topic: text('topic').notNull(),
    message: text('message').notNull(),
    status: messageStatus('status').notNull().default('new'),
    repliedAt: tstz('replied_at'),
    ...timestamps(),
  },
  (t) => [index('contact_messages_status_idx').on(t.status, t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: pk(),
    email: text('email').notNull(),
    consentAt: tstz('consent_at').notNull(),
    unsubscribedAt: tstz('unsubscribed_at'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('newsletter_subscribers_email_unique').on(sql`lower(${t.email})`)],
);

/** Pengaturan aplikasi (DP, durasi hold, maks peserta, kontak, rekening manual, SEO default). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').$type<unknown>().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: tstz('updated_at').notNull().defaultNow(),
});

/**
 * Log audit: hanya ditambah, tidak pernah diubah atau dihapus (dijaga trigger database,
 * lihat migrasi audit_logs_immutable). Perubahan status penting menulisnya dalam transaksi yang sama.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: pk(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'restrict' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: text('entity_id'),
    diff: jsonb('diff').$type<{ before?: unknown; after?: unknown }>(),
    ip: text('ip'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entity, t.entityId),
    index('audit_logs_created_idx').on(t.createdAt),
  ],
);

/** Event funnel first-party (sumber metrik abandonment per tahap di Ringkasan). */
export const checkoutEvents = pgTable(
  'checkout_events',
  {
    id: pk(),
    sessionId: text('session_id').notNull(),
    event: text('event').notNull(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    step: smallint('step'),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('checkout_events_event_created_idx').on(t.event, t.createdAt),
    index('checkout_events_session_idx').on(t.sessionId),
  ],
);
