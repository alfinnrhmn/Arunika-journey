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

/**
 * Pemeriksaan TANPA menambah hitungan: apakah kunci ini masih boleh mencoba? Dipakai bersama
 * `rateLimitFail` untuk pembatas yang hanya menghitung percobaan GAGAL (mis. masuk): login yang berhasil tidak
 * boleh memakan jatah, kalau tidak staf yang berbagi IP (satu kantor, satu Wi-Fi) saling mengunci.
 */
export function rateLimitPeek(key: string, limit: number, now: number = Date.now()): RateResult {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) return { allowed: true, remaining: limit, retryAfter: 1 };
  return {
    allowed: b.count < limit,
    remaining: Math.max(0, limit - b.count),
    retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
  };
}

/** Mencatat satu kegagalan pada kunci (membuka jendela baru bila belum ada atau sudah lewat). */
export function rateLimitFail(key: string, windowMs: number, now: number = Date.now()): void {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) buckets.set(key, { count: 1, resetAt: now + windowMs });
  else b.count += 1;
}

/** Menghapus hitungan sebuah kunci (mis. email yang berhasil masuk). Jangan dipakai untuk kunci IP. */
export function rateLimitReset(key: string): void {
  buckets.delete(key);
}
