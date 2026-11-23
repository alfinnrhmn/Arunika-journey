import { boolean, pgEnum, pgTable, text } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { check } from 'drizzle-orm/pg-core';
import { pk, timestamps, tstz } from './_helpers';

/** Dua peran internal (keputusan klien): Owner dan Admin Operasional. */
export const userRole = pgEnum('user_role', ['owner', 'admin_ops']);
export const userStatus = pgEnum('user_status', ['invited', 'active', 'disabled']);

/**
 * Pengguna internal. Kolom inti mengikuti kebutuhan Better Auth; tabel session, account,
 * verification, dan two_factor ditambahkan saat autentikasi dipasang. Tidak ada pendaftaran publik.
 */
export const users = pgTable(
  'users',
  {
    id: pk(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: userRole('role').notNull().default('admin_ops'),
    status: userStatus('status').notNull().default('invited'),
    twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
    lastLoginAt: tstz('last_login_at'),
    ...timestamps(),
  },
  (t) => [check('users_email_lowercase', sql`${t.email} = lower(${t.email})`)],
);
