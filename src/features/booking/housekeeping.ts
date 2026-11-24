import { getDb } from '../../server/db';
import { expireHolds } from './expire';
import { purgeExpiredDrafts } from './draft';

/**
 * Pelepasan hold dan pembuangan draf kedaluwarsa secara OPORTUNISTIK: dipanggil saat halaman booking atau
 * detail trip dimuat, paling sering sekali per `intervalMs` per proses. Ini menjaga kursi tidak bocor walau
 * worker terjadwal (pg-boss) belum berjalan; saat worker ada, ia tetap boleh memanggil `expireHolds` sendiri
 * karena fungsinya idempotent dan aman paralel. Kegagalan di sini tidak boleh mengganggu halaman.
 */
let lastRun = 0;
let running: Promise<void> | null = null;

export function maybeHousekeep(intervalMs = 30_000): void {
  const now = Date.now();
  if (running || now - lastRun < intervalMs) return;
  lastRun = now;
  running = (async () => {
    try {
      const db = getDb();
      await expireHolds(db);
      await purgeExpiredDrafts(db);
    } catch (e) {
      console.error('[booking] housekeeping gagal:', e instanceof Error ? e.message : e);
    } finally {
      running = null;
    }
  })();
}
