import type { APIRoute } from 'astro';
import { getProofFile } from '../../../../features/payments';
import { getDb } from '../../../../server/db';
import { guard, isUuid } from '../../../../server/auth/guard';
import { localStorage } from '../../../../server/storage';

/**
 * Menyajikan berkas bukti transfer HANYA kepada staf berizin `pembayaran.verifikasi`. Berkas tidak berada di
 * folder publik; rute ini satu-satunya jalan membacanya. Jenis konten diambil dari catatan database (sudah
 * divalidasi saat unggah, termasuk tanda tangan byte), bukan dari nama berkas, dan `nosniff` mencegah browser
 * menafsirkan ulang. Gambar disajikan dengan CSP `sandbox` agar tidak bisa menjalankan skrip.
 */
const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export const GET: APIRoute = async ({ params, locals }) => {
  const g = guard(locals, 'pembayaran.verifikasi');
  if ('response' in g) return g.response;

  const id = params.id ?? '';
  if (!isUuid(id)) return new Response('Tidak ditemukan', { status: 404 });
  const proof = await getProofFile(getDb(), id);
  const ext = proof ? EXT[proof.mime] : undefined;
  // Jenis di luar daftar tidak pernah disajikan, walau tercatat di database.
  if (!proof || !ext) return new Response('Tidak ditemukan', { status: 404 });

  let data: Buffer;
  try {
    data = await localStorage().get(proof.key);
  } catch {
    return new Response('Berkas tidak tersedia', { status: 404 });
  }

  const headers: Record<string, string> = {
    'Content-Type': proof.mime,
    'Content-Length': String(data.length),
    'Content-Disposition': `inline; filename="bukti-transfer.${ext}"`,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  if (proof.mime !== 'application/pdf')
    headers['Content-Security-Policy'] = "default-src 'none'; sandbox";
  return new Response(new Uint8Array(data), { headers });
};
