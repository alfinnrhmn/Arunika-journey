import { check, integer, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, timestamps, tstz } from './_helpers';
import { users } from './users';

/** Aset media. Berkas aslinya ada di object storage (R2/MinIO); varian dibuat oleh sharp. */
export const media = pgTable(
  'media',
  {
    id: pk(),
    storageKey: text('storage_key').notNull().unique(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt'),
    caption: text('caption'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    variants: jsonb('variants').$type<Record<string, { key: string; width: number }>>(),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    deletedAt: tstz('deleted_at'),
    ...timestamps(),
  },
  (t) => [check('media_size_positive', sql`${t.size} > 0`)],
);
