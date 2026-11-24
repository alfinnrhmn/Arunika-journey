import type { Executor } from './db/codes';
import { auditLogs } from './db/schema';

/**
 * Menulis log audit (append-only; dijaga trigger database). Panggil di transaksi yang sama dengan perubahan
 * yang dicatat agar keduanya berhasil atau gagal bersama. `actorId` kosong untuk aksi sistem/pelanggan.
 * Jangan memasukkan data pribadi pelanggan (email, telepon, nama) ke `diff`.
 */
export async function writeAudit(
  db: Executor,
  entry: {
    actorId?: string | null;
    action: string;
    entity: string;
    entityId: string;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
  },
) {
  await db.insert(auditLogs).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    diff: { before: entry.before, after: entry.after },
    ip: entry.ip ?? null,
  });
}
