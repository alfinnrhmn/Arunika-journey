import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';

// Tes integrasi WAJIB punya database. Tanpa TEST_DATABASE_URL tes GAGAL, bukan dilewati,
// agar CI tidak pernah lulus diam-diam tanpa menguji apa pun.
const testUrl = process.env.TEST_DATABASE_URL;

type Db = typeof import('../../src/server/db');
let db: Db;

beforeAll(async () => {
  expect(testUrl, 'TEST_DATABASE_URL wajib diatur untuk tes integrasi').toBeTruthy();
  // Pagar pengaman: jangan pernah menjalankan tes terhadap database pengembangan/produksi.
  expect(new URL(testUrl!).pathname, 'nama database uji harus mengandung "test"').toMatch(/test/);
  process.env.DATABASE_URL = testUrl;
  db = await import('../../src/server/db');
});

afterAll(async () => {
  await db?.closeDb();
});

describe('database', () => {
  it('terhubung ke PostgreSQL 17', async () => {
    const result = await db.getDb().execute(sql`show server_version_num`);
    const version = Number(result.rows[0]?.server_version_num);
    expect(version).toBeGreaterThanOrEqual(170000);
  });

  it('transaksi dapat di-rollback', async () => {
    await db.getDb().execute(sql`create temp table uji_rollback (id int)`);
    await expect(
      db.getDb().transaction(async (tx) => {
        await tx.execute(sql`insert into uji_rollback values (1)`);
        throw new Error('batalkan');
      }),
    ).rejects.toThrow('batalkan');
    const rows = await db.getDb().execute(sql`select count(*)::int as n from uji_rollback`);
    expect(rows.rows[0]?.n).toBe(0);
  });
});
