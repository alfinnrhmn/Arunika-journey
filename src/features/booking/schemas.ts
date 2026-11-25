import { z } from 'zod';

/**
 * Skema validasi form booking. Dipakai server (sumber kebenaran) dan boleh dipakai island untuk validasi
 * inline; pesan dalam Bahasa Indonesia dan menunjuk bidang yang salah, bukan hanya "tidak valid".
 */

/** Nomor WhatsApp/telepon Indonesia: 08xx, 628xx, atau +628xx; spasi, titik, dan strip diabaikan. */
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s().-]/g, '');
  if (cleaned.startsWith('+62')) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith('62')) return `0${cleaned.slice(2)}`;
  return cleaned;
}

export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Nama minimal 2 huruf').max(100, 'Nama maksimal 100 karakter'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'Email terlalu panjang')
    .pipe(z.email('Format email belum benar, contoh: nama@email.com')),
  phone: z
    .string()
    .transform(normalizePhone)
    .pipe(z.string().regex(/^08\d{8,12}$/, 'Nomor WhatsApp belum benar, contoh: 0812 3456 7890')),
});
export type Contact = z.infer<typeof contactSchema>;

export const participantSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Nama peserta minimal 2 huruf')
    .max(100, 'Nama maksimal 100 karakter'),
  kind: z.enum(['adult', 'child']),
  specialNeeds: z
    .string()
    .trim()
    .max(300, 'Catatan maksimal 300 karakter')
    .nullish()
    .transform((v) => (v ? v : null)),
});
export type ParticipantInput = z.infer<typeof participantSchema>;

/** Jumlah peserta: minimal 1 dewasa; total kursi dibatasi Pengaturan (bawaan 8). */
export const partySchema = (maxParticipants: number) =>
  z
    .object({
      adults: z.number().int('Jumlah dewasa harus bilangan bulat').min(1, 'Minimal 1 dewasa'),
      children: z.number().int('Jumlah anak harus bilangan bulat').min(0),
    })
    .refine((p) => p.adults + p.children <= maxParticipants, {
      message: `Maksimal ${maxParticipants} peserta per booking`,
      path: ['adults'],
    });

/** Mengubah hasil `safeParse` menjadi peta { bidang: pesan } untuk ditampilkan di samping input. */
export function fieldIssues(error: z.ZodError, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = [prefix, ...issue.path].filter((p) => p !== '').join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
