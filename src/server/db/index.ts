import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool | undefined;

/** Klien database tunggal (lazy) agar impor modul ini tidak langsung membuka koneksi. */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diatur');
  pool ??= new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}

/** Menutup koneksi (dipakai tes dan proses shutdown yang rapi). */
export async function closeDb() {
  const current = pool;
  pool = undefined;
  await current?.end();
}
