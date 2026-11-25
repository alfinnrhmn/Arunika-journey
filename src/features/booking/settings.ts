import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import type { Executor } from '../../server/db/codes';
import { settings } from '../../server/db/schema';

/**
 * Pengaturan booking dari tabel `settings` (SY-02). Angka dari klien belum final, jadi setiap nilai punya
 * bawaan; nilai yang rusak (salah tipe atau di luar batas) diabaikan dan memakai bawaan, tidak pernah
 * membuat halaman error.
 */
export interface ManualAccount {
  bank: string;
  number: string;
  holder: string;
}

export interface BookingSettings {
  /** Persentase DP, 0-100. Sampel desain 30. */
  dpPercent: number;
  /** Lama hold kursi sejak pembayaran dimulai. Usulan 120 menit. */
  holdMinutes: number;
  /** Maksimal peserta (kursi) per booking. Desain: 8. */
  maxParticipants: number;
  /** Lama draf booking disimpan sebelum dibuang. */
  draftHours: number;
  /** Rekening tujuan transfer manual. Kosong sampai klien mengisinya. */
  manualAccounts: ManualAccount[];
}

export const DEFAULT_BOOKING_SETTINGS: BookingSettings = {
  dpPercent: 30,
  holdMinutes: 120,
  maxParticipants: 8,
  draftHours: 24,
  manualAccounts: [],
};

const KEYS = {
  dpPercent: 'dp_percent',
  holdMinutes: 'hold_minutes',
  maxParticipants: 'max_participants_per_booking',
  draftHours: 'draft_hours',
  manualAccounts: 'manual_accounts',
} as const;

const schemas = {
  dpPercent: z.number().int().min(0).max(100),
  holdMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
  maxParticipants: z.number().int().min(1).max(50),
  draftHours: z
    .number()
    .int()
    .min(1)
    .max(24 * 14),
  manualAccounts: z.array(
    z.object({
      bank: z.string().trim().min(1).max(60),
      number: z.string().trim().min(1).max(40),
      holder: z.string().trim().min(1).max(100),
    }),
  ),
} satisfies Record<keyof BookingSettings, z.ZodType>;

export async function getBookingSettings(db: Executor): Promise<BookingSettings> {
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(inArray(settings.key, Object.values(KEYS)));
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const out = { ...DEFAULT_BOOKING_SETTINGS };
  for (const name of Object.keys(KEYS) as (keyof BookingSettings)[]) {
    const raw = byKey.get(KEYS[name]);
    if (raw === undefined) continue;
    const parsed = schemas[name].safeParse(raw);
    if (parsed.success) (out as Record<string, unknown>)[name] = parsed.data;
  }
  return out;
}

/** Dipakai fungsi simpan Pengaturan agar validasi tulis sama persis dengan validasi baca. */
export const BOOKING_SETTING_KEYS = KEYS;
export const bookingSettingSchemas = schemas;
