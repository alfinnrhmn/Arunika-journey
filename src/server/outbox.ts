import type { Executor } from './db/codes';
import { outbox } from './db/schema';

/**
 * Mengantrekan email ke tabel `outbox` di transaksi yang sama dengan perubahan bisnisnya, sehingga email
 * tidak pernah terkirim untuk transaksi yang dibatalkan dan tidak pernah hilang bila pengirim sedang mati.
 * Pengirimnya (pg-boss + penyedia email) dikerjakan terpisah dan membaca antrean ini.
 */
export async function queueEmail(
  db: Executor,
  email: { template: string; to: string; payload: Record<string, unknown>; scheduledAt?: Date },
) {
  await db.insert(outbox).values({
    channel: 'email',
    template: email.template,
    toAddress: email.to,
    payload: email.payload,
    ...(email.scheduledAt ? { scheduledAt: email.scheduledAt } : {}),
  });
}
