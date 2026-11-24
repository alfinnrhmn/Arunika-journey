/**
 * Perhitungan harga (PRD 7.1). Fungsi murni: dipakai server (sumber kebenaran) dan dipratinjau di
 * island, jadi hasilnya harus identik di keduanya. Tanpa float: semua rupiah bilangan bulat.
 *
 * - total = jumlah peserta x harga; harga SUDAH termasuk PPN, tidak ada baris pajak terpisah.
 * - Anak memakai `childPrice`; bila belum ditentukan klien, anak membayar harga dewasa.
 * - DP = persentase dari total, dibulatkan KE ATAS ke kelipatan Rp 1.000, dan tidak pernah melebihi total.
 */

export const DP_ROUNDING_STEP = 1_000;

export interface PriceInput {
  /** Harga per orang dewasa (IDR, termasuk PPN). */
  unitPrice: number;
  /** Harga per anak; kosong = sama dengan dewasa (harga anak belum ditentukan klien). */
  childPrice?: number | null;
  adults: number;
  children?: number;
  /** Persentase DP, 0-100 (bawaan 30, bisa diubah di Pengaturan). */
  dpPercent: number;
}

export interface PriceLine {
  label: string;
  qty: number;
  unitPrice: number;
  amount: number;
}

export interface PriceResult {
  lines: PriceLine[];
  seatCount: number;
  total: number;
  dpPercent: number;
  dp: number;
  /** Sisa pelunasan setelah DP. */
  balance: number;
}

const isInt = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n);

/** Pembulatan ke atas ke kelipatan `step` tanpa float: ceil(n / step) * step. */
export function roundUpTo(n: number, step: number): number {
  if (!isInt(n) || n < 0) throw new RangeError('n harus bilangan bulat >= 0');
  if (!isInt(step) || step < 1) throw new RangeError('step harus bilangan bulat >= 1');
  return Math.ceil(n / step) * step;
}

export function calcPrice(input: PriceInput): PriceResult {
  const { unitPrice, childPrice, adults, children = 0, dpPercent } = input;

  if (!isInt(unitPrice) || unitPrice < 0)
    throw new RangeError('unitPrice harus bilangan bulat >= 0');
  if (childPrice != null && (!isInt(childPrice) || childPrice < 0)) {
    throw new RangeError('childPrice harus bilangan bulat >= 0');
  }
  if (!isInt(adults) || adults < 1) throw new RangeError('minimal 1 dewasa');
  if (!isInt(children) || children < 0)
    throw new RangeError('jumlah anak harus bilangan bulat >= 0');
  if (!isInt(dpPercent) || dpPercent < 0 || dpPercent > 100) {
    throw new RangeError('dpPercent harus bilangan bulat 0-100');
  }

  const childUnit = childPrice ?? unitPrice;
  const lines: PriceLine[] = [
    { label: 'Dewasa', qty: adults, unitPrice, amount: adults * unitPrice },
  ];
  if (children > 0) {
    lines.push({
      label: 'Anak',
      qty: children,
      unitPrice: childUnit,
      amount: children * childUnit,
    });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  if (!Number.isSafeInteger(total)) throw new RangeError('total melebihi batas bilangan aman');

  // total * dpPercent / 100, dibulatkan ke atas ke kelipatan Rp 1.000, dibatasi total.
  // Perkalian dulu lalu bagi dengan ceil agar tidak ada galat desimal.
  const rawDp = Math.ceil((total * dpPercent) / 100);
  const dp = Math.min(roundUpTo(rawDp, DP_ROUNDING_STEP), total);

  return {
    lines,
    seatCount: adults + children,
    total,
    dpPercent,
    dp,
    balance: total - dp,
  };
}
