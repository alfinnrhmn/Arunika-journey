import { afterAll, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';
import { closeDb, getDb } from '../../src/server/db';
import { uuidv7 } from '../../src/server/db/id';
import { auditLogs, users } from '../../src/server/db/schema';
import { expectPgError } from './factories';

afterAll(async () => {
  await closeDb();
});

describe('log audit append-only', () => {
  it('menerima entri baru', async () => {
    const entityId = uuidv7();
    await getDb()
      .insert(auditLogs)
      .values({
        action: 'schedule.price_changed',
        entity: 'trip_schedule',
        entityId,
        diff: { before: 1_250_000, after: 1_350_000 },
      });
    const rows = await getDb().select().from(auditLogs).where(eq(auditLogs.entityId, entityId));
    expect(rows).toHaveLength(1);
  });

  it('menolak UPDATE, DELETE, dan TRUNCATE', async () => {
    const entityId = uuidv7();
    await getDb().insert(auditLogs).values({ action: 'x', entity: 'e', entityId });

    // restrict_violation = 23001
    await expectPgError(
      getDb().update(auditLogs).set({ action: 'diubah' }).where(eq(auditLogs.entityId, entityId)),
      '23001',
    );
    await expectPgError(getDb().delete(auditLogs).where(eq(auditLogs.entityId, entityId)), '23001');
    await expectPgError(getDb().execute(sql`truncate audit_logs`), '23001');

    const rows = await getDb().select().from(auditLogs).where(eq(auditLogs.entityId, entityId));
    expect(rows[0]?.action).toBe('x');
  });

  it('pengguna yang punya jejak audit tidak bisa dihapus permanen', async () => {
    const [user] = await getDb()
      .insert(users)
      .values({ email: `audit-${uuidv7()}@example.com`, name: 'Reza', role: 'owner' })
      .returning();
    await getDb().insert(auditLogs).values({ actorId: user!.id, action: 'login', entity: 'user' });

    await expectPgError(getDb().delete(users).where(eq(users.id, user!.id)), '23503');
  });
});
