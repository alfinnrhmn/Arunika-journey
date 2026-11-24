// Menerapkan migrasi Drizzle saat container start (dipanggil oleh entrypoint.sh).
// Aman dijalankan berulang. Tidak ada migrasi = tidak melakukan apa pun.
// Produksi tidak pernah menjalankan migrasi "down"; pemulihan memakai backup.
import { existsSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

const folder = new URL('../drizzle', import.meta.url).pathname;
const journal = `${folder}/meta/_journal.json`;

if (!existsSync(journal)) {
  console.log('Belum ada migrasi, dilewati.');
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL belum diatur');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: folder });
  console.log('Migrasi selesai.');
} catch (err) {
  console.error('Migrasi gagal:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
