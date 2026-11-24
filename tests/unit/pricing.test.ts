import { describe, expect, it } from 'vitest';
import { calcPrice, roundUpTo } from '../../src/features/pricing/pricing';
import { seatLabel, seatStatus, seatsLeft } from '../../src/features/schedules/seats';
import {
  formatDateShort,
  formatDuration,
  formatRupiah,
  todayInJakarta,
} from '../../src/lib/format';

describe('calcPrice', () => {
  it('contoh desain: 2 dewasa x Rp 1.250.000, DP 30% = Rp 750.000', () => {
    const r = calcPrice({ unitPrice: 1_250_000, adults: 2, dpPercent: 30 });
    expect(r.total).toBe(2_500_000);
    expect(r.dp).toBe(750_000);
    expect(r.balance).toBe(1_750_000);
    expect(r.seatCount).toBe(2);
    expect(r.lines).toEqual([{ label: 'Dewasa', qty: 2, unitPrice: 1_250_000, amount: 2_500_000 }]);
  });

  it('harga jadwal yang menimpa (9 Jan 2027: Rp 1.350.000) dihitung lewat unitPrice', () => {
    const r = calcPrice({ unitPrice: 1_350_000, adults: 2, dpPercent: 30 });
    expect(r.total).toBe(2_700_000);
    expect(r.dp).toBe(810_000);
  });

  it('DP dibulatkan KE ATAS ke kelipatan Rp 1.000', () => {
    // 1.650.000 x 30% = 495.000 (pas); 1.550.000 x 30% = 465.000 (pas); 1.333.000 x 30% = 399.900 -> 400.000
    expect(calcPrice({ unitPrice: 1_333_000, adults: 1, dpPercent: 30 }).dp).toBe(400_000);
    // 1.001 x 50% = 500,5 -> 501 -> 1.000
    expect(calcPrice({ unitPrice: 1_001, adults: 1, dpPercent: 50 }).dp).toBe(1_000);
  });

  it('DP tidak pernah melebihi total', () => {
    // total 500, DP 100% = 500 -> bulat ke atas 1.000 -> dibatasi 500
    const r = calcPrice({ unitPrice: 500, adults: 1, dpPercent: 100 });
    expect(r.dp).toBe(500);
    expect(r.balance).toBe(0);
  });

  it('DP 0% dan 100%', () => {
    expect(calcPrice({ unitPrice: 1_000_000, adults: 2, dpPercent: 0 }).dp).toBe(0);
    expect(calcPrice({ unitPrice: 1_000_000, adults: 2, dpPercent: 100 }).dp).toBe(2_000_000);
  });

  it('anak memakai childPrice; bila kosong memakai harga dewasa', () => {
    const withChild = calcPrice({
      unitPrice: 1_250_000,
      childPrice: 900_000,
      adults: 2,
      children: 1,
      dpPercent: 30,
    });
    expect(withChild.total).toBe(3_400_000);
    expect(withChild.seatCount).toBe(3);
    expect(withChild.lines.map((l) => l.label)).toEqual(['Dewasa', 'Anak']);

    const noChildPrice = calcPrice({
      unitPrice: 1_250_000,
      childPrice: null,
      adults: 1,
      children: 2,
      dpPercent: 30,
    });
    expect(noChildPrice.total).toBe(3_750_000);
  });

  it('tidak ada float: hasil selalu bilangan bulat', () => {
    for (const unit of [1, 7, 333, 1_234_567]) {
      for (const pct of [1, 7, 30, 33, 99]) {
        const r = calcPrice({ unitPrice: unit, adults: 3, children: 1, dpPercent: pct });
        expect(
          Number.isInteger(r.total) && Number.isInteger(r.dp) && Number.isInteger(r.balance),
        ).toBe(true);
        expect(r.dp + r.balance).toBe(r.total);
      }
    }
  });

  it('menolak masukan tidak valid', () => {
    const ok = { unitPrice: 1_000, adults: 1, dpPercent: 30 };
    expect(() => calcPrice({ ...ok, adults: 0 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, adults: 1.5 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, children: -1 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, unitPrice: -1 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, unitPrice: 1.5 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, dpPercent: 101 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, dpPercent: -1 })).toThrow(RangeError);
    expect(() => calcPrice({ ...ok, childPrice: -5 })).toThrow(RangeError);
  });
});

describe('roundUpTo', () => {
  it('membulatkan ke atas', () => {
    expect(roundUpTo(0, 1000)).toBe(0);
    expect(roundUpTo(1, 1000)).toBe(1000);
    expect(roundUpTo(1000, 1000)).toBe(1000);
    expect(roundUpTo(1001, 1000)).toBe(2000);
  });
});

describe('status kursi', () => {
  it('ok / few / full sesuai desain (1-5 kuning, 0 penuh)', () => {
    expect(seatStatus(9)).toBe('ok');
    expect(seatStatus(6)).toBe('ok');
    expect(seatStatus(5)).toBe('few');
    expect(seatStatus(1)).toBe('few');
    expect(seatStatus(0)).toBe('full');
    expect(seatStatus(-3)).toBe('full');
  });
  it('label dan sisa kursi', () => {
    expect(seatLabel(9)).toBe('Sisa 9 kursi');
    expect(seatLabel(0)).toBe('Penuh');
    expect(seatsLeft(16, 7)).toBe(9);
    expect(seatsLeft(4, 9)).toBe(0);
  });
});

describe('format Indonesia', () => {
  it('rupiah', () => {
    expect(formatRupiah(1_250_000)).toBe('Rp 1.250.000');
    expect(formatRupiah(650_000)).toBe('Rp 650.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(5_000_000_000)).toBe('Rp 5.000.000.000');
  });
  it('tanggal singkat persis seperti desain', () => {
    expect(formatDateShort('2026-12-12')).toBe('Sab, 12 Des 2026');
    expect(formatDateShort('2026-12-18')).toBe('Jum, 18 Des 2026');
    expect(formatDateShort('2027-02-14')).toBe('Min, 14 Feb 2027');
    expect(formatDateShort('2027-01-09')).toBe('Sab, 9 Jan 2027');
  });
  it('tanggal tidak valid ditolak', () => {
    expect(() => formatDateShort('12/12/2026')).toThrow(RangeError);
  });
  it('durasi', () => {
    expect(formatDuration(2, 1)).toBe('2 hari 1 malam');
    expect(formatDuration(1, 0)).toBe('1 hari');
    expect(formatDuration(4, 3)).toBe('4 hari 3 malam');
  });
  it('hari ini mengikuti Asia/Jakarta', () => {
    expect(todayInJakarta(new Date('2026-11-23T16:59:00Z'))).toBe('2026-11-23');
    expect(todayInJakarta(new Date('2026-11-23T17:00:00Z'))).toBe('2026-11-24');
  });
});
