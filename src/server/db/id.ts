import { randomBytes } from 'node:crypto';

/**
 * UUID v7 (RFC 9562): 48 bit waktu (ms) + versi + acak. Terurut menurut waktu sehingga indeks
 * primary key tetap lokal. Dibuat di aplikasi karena PostgreSQL 17 belum punya uuidv7().
 */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // versi 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // varian RFC 4122
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
