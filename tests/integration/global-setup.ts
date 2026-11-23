import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/**
 * Sekali per proses tes: kosongkan database uji lalu terapkan SEMUA migrasi dari nol.
 * Dengan begitu tes menguji skema yang benar-benar dihasilkan migrasi (bukan skema TypeScript),
 * dan migrasi yang rusak langsung menggagalkan CI.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL wajib diatur untuk tes integrasi');
  // Pagar pengaman: jangan pernah mengosongkan database pengembangan atau produksi.
  if (!/test/.test(new URL(url).pathname)) {
    throw new Error('Nama database uji harus mengandung "test"; setup menolak melanjutkan');
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await pool.query('drop schema if exists drizzle cascade');
    await pool.query('drop schema if exists public cascade');
    await pool.query('create schema public');
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}
