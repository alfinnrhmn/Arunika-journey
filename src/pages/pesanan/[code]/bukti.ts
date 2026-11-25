import type { APIRoute } from 'astro';
import { getDb } from '../../../server/db';
import { clientIp, rateLimit } from '../../../server/rate-limit';
import { localStorage } from '../../../server/storage';
import {
  attempt,
  isBookingCode,
  PROOF_MAX_BYTES,
  readAccessToken,
  submitProof,
} from '../../../features/booking';
import { proofErrorKey, type ProofErrorKey } from '../../../components/booking/status/lib';

/**
 * Unggah bukti transfer (POST-Redirect-GET). Hasil selalu dikembalikan ke halaman pesanan lewat redirect 303:
 * sukses `?bukti=ok`, galat `?galat=<kunci>` (kunci tetap, teksnya dipetakan di halaman). Jenis, isi, dan ukuran
 * berkas diputuskan oleh domain (`submitProof`), bukan dipercaya dari klien.
 */

/** Badan yang jelas melebihi batas ditolak sebelum dibaca ke memori (sisa ruang untuk bidang form lain). */
const BODY_LIMIT = PROOF_MAX_BYTES + 512 * 1024;

const back = (code: string, query: string) =>
  new Response(null, { status: 303, headers: { Location: `/pesanan/${code}?${query}` } });
const fail = (code: string, key: ProofErrorKey) => back(code, `galat=${key}`);

export const POST: APIRoute = async ({ params, request, cookies }) => {
  const code = (params.code ?? '').toUpperCase();
  // Kode divalidasi sebelum dipakai di kunci pembatas laju, nama cookie, atau URL.
  if (!isBookingCode(code))
    return new Response(null, { status: 303, headers: { Location: '/cek-status' } });

  // Tanpa cookie akses langsung ke Cek Status; permintaan seperti itu tidak menghabiskan jatah laju milik pemilik
  // booking yang berbagi IP (kantor, Wi-Fi bersama).
  const token = readAccessToken(cookies, code);
  if (!token) {
    return new Response(null, {
      status: 303,
      headers: { Location: `/cek-status?kode=${encodeURIComponent(code)}` },
    });
  }

  const limit = rateLimit(`bukti:${clientIp(request)}:${code}`, 5, 10 * 60_000);
  if (!limit.allowed) {
    return new Response(
      `<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Terlalu sering | Arunika Journey</title><body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 24px;color:#2b2623"><h1 style="font-weight:500">Terlalu banyak percobaan</h1><p>Anda sudah beberapa kali mengunggah bukti dalam waktu singkat. Tunggu sekitar ${Math.ceil(limit.retryAfter / 60)} menit, lalu <a href="/pesanan/${code}">kembali ke halaman pesanan</a>.</p></body></html>`,
      {
        status: 429,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Retry-After': String(limit.retryAfter),
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > BODY_LIMIT) return fail(code, 'ukuran');

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get('bukti');
  } catch {
    // Badan bukan multipart/form-data yang sah.
    return fail(code, 'tanpa-berkas');
  }
  if (!(file instanceof File) || file.size === 0) return fail(code, 'tanpa-berkas');
  // Ukuran dicek lagi di sini agar berkas besar tidak sempat disalin ke Buffer; batas resminya tetap di domain.
  if (file.size > PROOF_MAX_BYTES) return fail(code, 'ukuran');

  const data = Buffer.from(await file.arrayBuffer());
  const result = await attempt(() =>
    submitProof(getDb(), localStorage(), { code, token, data, mime: file.type }),
  );
  if (!result.ok) {
    // Token tidak cocok (cookie lama atau sudah dicabut): jalan keluarnya Cek Status, bukan pesan galat.
    if (result.error.code === 'booking_not_found') {
      return new Response(null, {
        status: 303,
        headers: { Location: `/cek-status?kode=${encodeURIComponent(code)}` },
      });
    }
    return fail(code, proofErrorKey(result.error));
  }
  return back(code, 'bukti=ok');
};
