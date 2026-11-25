import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
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

/**
 * Tabel autentikasi untuk Better Auth (email + sandi untuk pengguna internal; tanpa pendaftaran publik).
 * Nama tabel jamak dan ID UUID v7 mengikuti tabel lain; pemetaan model ada di src/server/auth/auth.ts.
 * Tabel two_factors ditambahkan saat 2FA dipasang.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    /** Token sesi di cookie; unik. */
    token: text('token').notNull().unique(),
    expiresAt: tstz('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps(),
  },
  (t) => [index('sessions_user_idx').on(t.userId), index('sessions_expires_idx').on(t.expiresAt)],
);

/** Kredensial per pengguna. Untuk email + sandi: providerId = 'credential' dan password berisi hash (bukan sandi). */
export const accounts = pgTable(
  'accounts',
  {
    id: pk(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: tstz('access_token_expires_at'),
    refreshTokenExpiresAt: tstz('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex('accounts_provider_account_unique').on(t.providerId, t.accountId),
    index('accounts_user_idx').on(t.userId),
  ],
);

/** Token verifikasi sekali pakai (undangan, reset sandi). */
export const verifications = pgTable(
  'verifications',
  {
    id: pk(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: tstz('expires_at').notNull(),
    ...timestamps(),
  },
  (t) => [index('verifications_identifier_idx').on(t.identifier)],
);

/**
 * Rahasia TOTP dan kode cadangan untuk 2FA (plugin two-factor Better Auth). Kolom `secret` dan `backup_codes`
 * tersimpan terenkripsi (kunci dari BETTER_AUTH_SECRET); jangan membacanya langsung. `verified` bernilai false
 * sampai pengguna berhasil memasukkan kode pertama saat aktivasi; penghitung kegagalan dan `locked_until` dipakai
 * pengunci akun untuk verifikasi yang gagal berulang.
 */
export const twoFactors = pgTable(
  'two_factors',
  {
    id: pk(),
    secret: text('secret').notNull(),
    backupCodes: text('backup_codes').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    verified: boolean('verified').notNull().default(true),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    lockedUntil: tstz('locked_until'),
    ...timestamps(),
  },
  // Satu baris 2FA per pengguna. Tanpa indeks pada `secret`: isinya terenkripsi sehingga tidak pernah dicari.
  (t) => [uniqueIndex('two_factors_user_unique').on(t.userId)],
);
