import type { APIRoute } from 'astro';
import { attempt, rejectPayment } from '../../../../features/booking';
import { getDb } from '../../../../server/db';
import { guard, isUuid, seeOther } from '../../../../server/auth/guard';

/**
 * Tolak bukti transfer dengan alasan wajib (DB-04). Penolakan melepas hold kursi (PRD 7.2) dan pelanggan diberi
 * tahu lewat email beserta alasannya. Hasil lewat redirect 303 dengan kunci tetap: `hasil=ditolak` atau
 * `galat=tidak-ditemukan|status|alasan` (alasan terlalu pendek: kembali ke panel pembayaran itu lewat `pilih`).
 */
const MIN_REASON = 3;
const MAX_REASON = 500;

export const POST: APIRoute = async ({ params, request, locals }) => {
  const g = guard(locals, 'pembayaran.verifikasi');
  if ('response' in g) return g.response;

  const id = params.id ?? '';
  if (!isUuid(id)) return seeOther('/dashboard/pembayaran?galat=tidak-ditemukan');

  let reason = '';
  try {
    reason = String((await request.formData()).get('alasan') ?? '').trim();
  } catch {
    // Badan bukan form yang sah: diperlakukan sebagai alasan kosong.
  }
  if (reason.length < MIN_REASON || reason.length > MAX_REASON) {
    return seeOther(`/dashboard/pembayaran?pilih=${id}&galat=alasan`);
  }

  const result = await attempt(() =>
    rejectPayment(getDb(), { paymentId: id, actorId: g.staff.id, reason }),
  );
  if (!result.ok) {
    const key = result.error.code === 'payment_not_found' ? 'tidak-ditemukan' : 'status';
    return seeOther(`/dashboard/pembayaran?galat=${key}`);
  }
  return seeOther('/dashboard/pembayaran?hasil=ditolak');
};
