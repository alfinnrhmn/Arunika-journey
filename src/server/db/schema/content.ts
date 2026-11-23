import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { pk, timestamps, tstz } from './_helpers';
import { bookings } from './booking';
import { contentStatus, trips, tripSchedules } from './catalog';
import { media } from './media';
import { users } from './users';

export const postStatus = pgEnum('post_status', ['draft', 'scheduled', 'published', 'archived']);
export const moderationStatus = pgEnum('moderation_status', ['pending', 'approved', 'rejected']);
/** Menunggu verifikasi, terverifikasi (tampil di situs), atau disembunyikan. */
export const testimonialStatus = pgEnum('testimonial_status', ['pending', 'verified', 'hidden']);
export const legalDocType = pgEnum('legal_doc_type', ['terms', 'privacy', 'refund', 'legality']);
export const legalDocStatus = pgEnum('legal_doc_status', ['draft', 'published']);

/** Halaman CMS dengan section berskema tetap (bukan page builder). */
export const pages = pgTable('pages', {
  id: pk(),
  key: text('key').notNull().unique(),
  content: jsonb('content').$type<Record<string, unknown>>().notNull(),
  status: contentStatus('status').notNull().default('draft'),
  publishedAt: tstz('published_at'),
  ...timestamps(),
});

export const pageVersions = pgTable(
  'page_versions',
  {
    id: pk(),
    pageId: uuid('page_id')
      .notNull()
      .references(() => pages.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<Record<string, unknown>>().notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: tstz('created_at').notNull().defaultNow(),
  },
  (t) => [unique('page_versions_unique').on(t.pageId, t.version)],
);

export const topics = pgTable('topics', {
  id: pk(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  position: smallint('position').notNull().default(0),
  showInFilter: boolean('show_in_filter').notNull().default(true),
  ...timestamps(),
});

export const tags = pgTable('tags', {
  id: pk(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  ...timestamps(),
});

export const posts = pgTable(
  'posts',
  {
    id: pk(),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    /** Tiptap JSON (sumber) dan HTML tersanitasi (untuk render). */
    body: jsonb('body').$type<Record<string, unknown>>(),
    bodyHtml: text('body_html'),
    coverMediaId: uuid('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    topicId: uuid('topic_id').references(() => topics.id, { onDelete: 'set null' }),
    status: postStatus('status').notNull().default('draft'),
    publishAt: tstz('publish_at'),
    publishedAt: tstz('published_at'),
    seo: jsonb('seo').$type<{ title?: string; description?: string; ogMediaId?: string }>(),
    deletedAt: tstz('deleted_at'),
    ...timestamps(),
  },
  (t) => [
    check(
      'posts_scheduled_has_time',
      sql`${t.status} <> 'scheduled' or ${t.publishAt} is not null`,
    ),
    index('posts_status_published_idx').on(t.status, t.publishedAt),
    index('posts_topic_idx').on(t.topicId),
  ],
);

export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      // Tag yang masih dipakai tidak bisa dihapus (CM-03).
      .references(() => tags.id, { onDelete: 'restrict' }),
  },
  (t) => [primaryKey({ columns: [t.postId, t.tagId] })],
);

/** Dokumentasi per trip/tanggal dengan moderasi sebelum tampil. */
export const documentationItems = pgTable(
  'documentation_items',
  {
    id: pk(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    scheduleId: uuid('schedule_id').references(() => tripSchedules.id, { onDelete: 'set null' }),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'restrict' }),
    caption: text('caption'),
    status: moderationStatus('status').notNull().default('pending'),
    deletedAt: tstz('deleted_at'),
    ...timestamps(),
  },
  (t) => [
    index('documentation_items_status_idx').on(t.status),
    index('documentation_items_trip_idx').on(t.tripId),
  ],
);

export const testimonials = pgTable(
  'testimonials',
  {
    id: pk(),
    bookingId: uuid('booking_id').references(() => bookings.id, { onDelete: 'set null' }),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    rating: smallint('rating').notNull(),
    status: testimonialStatus('status').notNull().default('pending'),
    deletedAt: tstz('deleted_at'),
    ...timestamps(),
  },
  (t) => [
    check('testimonials_rating_range', sql`${t.rating} between 1 and 5`),
    index('testimonials_status_idx').on(t.status),
  ],
);

/** Dokumen legal berversi. Terbit hanya oleh Owner; booking menyimpan versi yang disetujui. */
export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: pk(),
    type: legalDocType('type').notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: legalDocStatus('status').notNull().default('draft'),
    effectiveAt: tstz('effective_at'),
    publishedBy: uuid('published_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps(),
  },
  (t) => [
    unique('legal_documents_type_version_unique').on(t.type, t.version),
    check('legal_documents_version_positive', sql`${t.version} > 0`),
    check(
      'legal_documents_published_recorded',
      sql`${t.status} <> 'published' or (${t.effectiveAt} is not null and ${t.publishedBy} is not null)`,
    ),
  ],
);
