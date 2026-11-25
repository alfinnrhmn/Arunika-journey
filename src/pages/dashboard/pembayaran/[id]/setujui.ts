import type { APIRoute } from 'astro';
import { attempt, approvePayment } from '../../../../features/booking';
import { getDb } from '../../../../server/db';
import { guard, isUuid, seeOther } from '../../../../server/auth/guard';

/**
 * Setujui bukti transfer (DB-04). Izin `pembayaran.verifikasi` (Owner dan Admin Operasional). Hasil dikembalikan
 * ke antrean lewat redirect 303 dengan kunci tetap (bukan teks dari masukan): `hasil=disetujui|perlu-perhatian`
 * atau `galat=tidak-ditemukan|status`. `perlu-perhatian` berarti kursi sudah habis dan booking masuk antrean tindakan.
 */
export const POST: APIRoute = async ({ params, locals }) => {
  const g = guard(locals, 'pembayaran.verifikasi');
  if ('response' in g) return g.response;

  const id = params.id ?? '';
  if (!isUuid(id)) return seeOther('/dashboard/pembayaran?galat=tidak-ditemukan');

  const result = await attempt(() =>
    approvePayment(getDb(), { paymentId: id, actorId: g.staff.id }),
  );
  if (!result.ok) {
    const key = result.error.code === 'payment_not_found' ? 'tidak-ditemukan' : 'status';
    return seeOther(`/dashboard/pembayaran?galat=${key}`);
  }
  return seeOther(
    `/dashboard/pembayaran?hasil=${result.value.status === 'confirmed' ? 'disetujui' : 'perlu-perhatian'}`,
  );
};
