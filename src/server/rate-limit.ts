/**
 * Pembatas laju sederhana (jendela tetap) di memori proses, untuk melindungi rute publik yang bisa ditebak
 * (Cek Status, unggah bukti). Cukup untuk satu instance; bila nanti ada beberapa instance di belakang load
 * balancer, ganti penyimpanannya ke Postgres/Redis dengan antarmuka yang sama.
 *
 * Kunci memuat IP dan nama aksi. IP diambil dari header proxy tepercaya oleh pemanggil; jangan memasukkan
 * data pribadi pelanggan (email, telepon) ke dalam kunci.
 */
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export interface RateResult {
  allowed: boolean;
  remaining: number;
  /** Detik sampai jendela berikutnya (untuk header Retry-After). */
  retryAfter: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateResult {
  // Bersihkan bucket kedaluwarsa sesekali agar peta tidak tumbuh tanpa batas.
  if (buckets.size > 5_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return {
    allowed: b.count <= limit,
    remaining: Math.max(0, limit - b.count),
    retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

/** IP klien dari request; di belakang proxy tepercaya (Caddy/Traefik) memakai header X-Forwarded-For. */
export function clientIp(request: Request, fallback = 'unknown'): string {
  const fwd = request.headers.get('x-forwarded-for');
  return fwd?.split(',')[0]?.trim() || fallback;
}
