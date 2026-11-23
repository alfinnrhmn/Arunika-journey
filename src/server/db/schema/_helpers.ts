import { bigint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from '../id';

/** Primary key UUID v7 yang dibuat di aplikasi. */
export const pk = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** created_at dan updated_at (timestamptz, UTC; ditampilkan sebagai Asia/Jakarta di UI). */
export const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Rupiah sebagai bilangan bulat (bigint, mode number: aman sampai 2^53). */
export const idr = (name: string) => bigint(name, { mode: 'number' });

export const tstz = (name: string) => timestamp(name, { withTimezone: true });
