export type SeatStatus = 'ok' | 'few' | 'full';

/** Batas "sisa sedikit" (desain: 1-5 kursi berwarna kuning). */
export const FEW_SEATS_THRESHOLD = 5;

export function seatsLeft(capacity: number, seatsTaken: number): number {
  return Math.max(0, capacity - seatsTaken);
}

/** ok = lega, few = sisa sedikit, full = penuh. Warna selalu disertai teks (tidak hanya warna). */
export function seatStatus(left: number): SeatStatus {
  if (left <= 0) return 'full';
  if (left <= FEW_SEATS_THRESHOLD) return 'few';
  return 'ok';
}

export function seatLabel(left: number): string {
  return left <= 0 ? 'Penuh' : `Sisa ${left} kursi`;
}
