import { afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';

// Pagar database uji (TEST_DATABASE_URL wajib, nama mengandung "test") ada di setup-env.ts.
afterAll(async () => {
  await closeDb();
});

describe('database', () => {
  it('terhubung ke PostgreSQL 17', async () => {
    const result = await getDb().execute(sql`show server_version_num`);
    const version = Number(result.rows[0]?.server_version_num);
    expect(version).toBeGreaterThanOrEqual(170000);
  });

  it('transaksi dapat di-rollback', async () => {
    await getDb().execute(sql`create temp table uji_rollback (id int)`);
    await expect(
      getDb().transaction(async (tx) => {
        await tx.execute(sql`insert into uji_rollback values (1)`);
        throw new Error('batalkan');
      }),
    ).rejects.toThrow('batalkan');
    const rows = await getDb().execute(sql`select count(*)::int as n from uji_rollback`);
    expect(rows.rows[0]?.n).toBe(0);
  });
});
