import { integer, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

/**
 * Penghitung kode per jenis dan periode (YYMM, zona Asia/Jakarta): ARJ-2611-0150, RQ-2611-0042.
 * Nomor urut di-reset tiap bulan. Dinaikkan atomik lewat INSERT ... ON CONFLICT DO UPDATE
 * (lihat db/codes.ts), sehingga permintaan bersamaan tidak pernah mendapat nomor yang sama.
 */
export const codeCounters = pgTable(
  'code_counters',
  {
    kind: text('kind').notNull(),
    period: text('period').notNull(),
    last: integer('last').notNull(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.period] })],
);
