import { afterAll, describe, expect, it } from 'vitest';
import { closeDb, getDb } from '../../src/server/db';
import { nextCode } from '../../src/server/db/codes';

afterAll(async () => {
  await closeDb();
});

describe('kode booking dan permintaan', () => {
  it('berformat ARJ-YYMM-NNNN dan RQ-YYMM-NNNN dengan urutan terpisah', async () => {
    const t = new Date('2026-11-23T05:00:00Z');
    expect(await nextCode(getDb(), 'ARJ', t)).toBe('ARJ-2611-0001');
    expect(await nextCode(getDb(), 'ARJ', t)).toBe('ARJ-2611-0002');
    expect(await nextCode(getDb(), 'RQ', t)).toBe('RQ-2611-0001');
  });

  it('nomor urut di-reset tiap bulan', async () => {
    expect(await nextCode(getDb(), 'ARJ', new Date('2027-01-10T05:00:00Z'))).toBe('ARJ-2701-0001');
    expect(await nextCode(getDb(), 'ARJ', new Date('2027-02-01T05:00:00Z'))).toBe('ARJ-2702-0001');
  });

  it('batas bulan mengikuti Asia/Jakarta, bukan UTC', async () => {
    // 30 Nov 17:00 UTC = 1 Des 00:00 WIB
    expect(await nextCode(getDb(), 'ARJ', new Date('2028-11-30T17:00:00Z'))).toBe('ARJ-2812-0001');
    expect(await nextCode(getDb(), 'ARJ', new Date('2028-11-30T16:59:00Z'))).toBe('ARJ-2811-0001');
  });

  it('50 permintaan bersamaan menghasilkan kode unik tanpa celah', async () => {
    const t = new Date('2030-05-15T05:00:00Z');
    const codes = await Promise.all(
      Array.from({ length: 50 }, () => getDb().transaction((tx) => nextCode(tx, 'ARJ', t))),
    );
    expect(new Set(codes).size).toBe(50);
    const numbers = codes.map((c) => Number(c.slice(-4))).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 50 }, (_, i) => i + 1));
  });

  it('transaksi yang dibatalkan tidak menghabiskan nomor', async () => {
    const t = new Date('2031-05-15T05:00:00Z');
    expect(await nextCode(getDb(), 'RQ', t)).toBe('RQ-3105-0001');
    await expect(
      getDb().transaction(async (tx) => {
        await nextCode(tx, 'RQ', t);
        throw new Error('batal');
      }),
    ).rejects.toThrow('batal');
    expect(await nextCode(getDb(), 'RQ', t)).toBe('RQ-3105-0002');
  });
});
