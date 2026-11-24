import { describe, expect, it } from 'vitest';
import { uuidv7 } from '../../src/server/db/id';
import { jakartaPeriod } from '../../src/server/db/codes';

describe('uuidv7', () => {
  it('berformat UUID versi 7 varian RFC 4122', () => {
    const id = uuidv7();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('menyimpan waktu pada 48 bit pertama', () => {
    const t = Date.UTC(2026, 10, 23, 5, 0, 0);
    const id = uuidv7(t);
    const hex = id.replace(/-/g, '').slice(0, 12);
    expect(parseInt(hex, 16)).toBe(t);
  });

  it('terurut menurut waktu dan unik', () => {
    const ids = Array.from({ length: 1000 }, (_, i) => uuidv7(1_700_000_000_000 + i));
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(1000);
  });
});

describe('jakartaPeriod', () => {
  it('mengikuti zona Asia/Jakarta', () => {
    expect(jakartaPeriod(new Date('2026-11-23T05:00:00Z'))).toBe('2611');
    expect(jakartaPeriod(new Date('2026-11-30T16:59:59Z'))).toBe('2611');
    expect(jakartaPeriod(new Date('2026-11-30T17:00:00Z'))).toBe('2612');
  });

  it('pergantian tahun', () => {
    expect(jakartaPeriod(new Date('2026-12-31T17:00:00Z'))).toBe('2701');
  });
});
