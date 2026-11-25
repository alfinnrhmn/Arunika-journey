/**
 * Reset 2FA seorang staf (pemulihan bila ponsel dan kode cadangan hilang, atau Owner sendiri terkunci).
 *
 *   npm run user:reset-2fa -- --email owner@contoh.id
 *
 * Menghapus rahasia 2FA, mencabut semua sesinya, dan mencatat di log audit. Saat masuk berikutnya orang itu
 * diwajibkan mengaktifkan 2FA lagi. Hanya dijalankan oleh yang punya akses ke server/database.
 */
import { eq } from 'drizzle-orm';
import { closeDb, getDb } from '../src/server/db';
import { users } from '../src/server/db/schema';
import { resetTwoFactor } from '../src/server/auth/two-factor';

const i = process.argv.indexOf('--email');
const email = i >= 0 ? process.argv[i + 1]?.trim().toLowerCase() : undefined;
if (!email) {
  console.error('Pemakaian: npm run user:reset-2fa -- --email <email>');
  process.exit(1);
}

try {
  const db = getDb();
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (!user) {
    console.error('Gagal: email tidak terdaftar');
    process.exitCode = 1;
  } else {
    await resetTwoFactor(db, { userId: user.id, actorId: null, via: 'cli' });
    console.log(
      `2FA direset untuk ${email}. Semua sesinya dicabut; ia harus mengaktifkan 2FA lagi saat masuk.`,
    );
  }
} finally {
  await closeDb();
}
