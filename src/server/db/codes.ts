import { sql } from 'drizzle-orm';
import type { getDb } from './index';
import { codeCounters } from './schema';

type Db = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export type Executor = Db | Tx;

export type CodeKind = 'ARJ' | 'RQ';

/** Periode YYMM menurut zona Asia/Jakarta (bukan UTC): 31 Des 17:00 UTC sudah Januari di Jakarta. */
export function jakartaPeriod(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: '2-digit',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return `${year}${month}`;
}

/**
 * Kode berikutnya: ARJ-2611-0150 (booking) atau RQ-2611-0042 (permintaan). Nomor urut di-reset
 * tiap bulan dan dinaikkan atomik, jadi permintaan bersamaan tidak pernah mendapat nomor yang sama.
 * Panggil di dalam transaksi pembuatan booking/permintaan agar nomor ikut batal bila transaksi gagal.
 */
export async function nextCode(db: Executor, kind: CodeKind, now: Date = new Date()) {
  const period = jakartaPeriod(now);
  const [row] = await db
    .insert(codeCounters)
    .values({ kind, period, last: 1 })
    .onConflictDoUpdate({
      target: [codeCounters.kind, codeCounters.period],
      set: { last: sql`${codeCounters.last} + 1` },
    })
    .returning({ last: codeCounters.last });
  return `${kind}-${period}-${String(row!.last).padStart(4, '0')}`;
}
