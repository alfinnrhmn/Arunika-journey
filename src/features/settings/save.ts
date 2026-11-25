import { sql } from 'drizzle-orm';
import { writeAudit } from '../../server/audit';
import type { getDb } from '../../server/db';
import { settings } from '../../server/db/schema';
import {
  BOOKING_SETTING_KEYS,
  bookingSettingSchemas,
  getBookingSettings,
  type BookingSettings,
  type ManualAccount,
} from '../booking/settings';

type Db = ReturnType<typeof getDb>;

/**
 * Menyimpan Pengaturan booking (SY-02) oleh Owner. Izin `pengaturan.kelola` diperiksa pemanggil (halaman dan
 * endpoint), bukan di sini. Perubahan hanya memengaruhi booking BARU: booking yang sudah berjalan memakai nilai
 * yang dibekukan saat dibuat (DP, harga), jadi tidak ada yang perlu dimigrasi.
 *
 * Setiap pengaturan yang berubah ditulis dalam satu transaksi bersama catatan audit (nilai sebelum dan sesudah),
 * sehingga keduanya berhasil atau gagal bersama. Pengaturan yang tidak berubah tidak ditulis dan tidak dicatat.
 */
export const MAX_MANUAL_ACCOUNTS = 5;

export type SettingsErrors = Partial<Record<keyof BookingSettings, string>> & {
  /** Pesan per baris rekening, sesuai urutan baris yang dikirim. */
  accountRows?: Record<number, string>;
};

export type ParsedSettingsForm =
  | { ok: true; values: BookingSettings }
  | { ok: false; errors: SettingsErrors; raw: RawSettingsForm };

/** Isian mentah untuk mengisi ulang form saat ada galat (nilai yang diketik pengguna tidak hilang). */
export interface RawSettingsForm {
  dpPercent: string;
  holdMinutes: string;
  maxParticipants: string;
  draftHours: string;
  accounts: { bank: string; number: string; holder: string }[];
}

const WHOLE = /^\d{1,6}$/;
const ACCOUNT_NUMBER = /^[0-9][0-9 .-]{3,38}[0-9]$/;

const text = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === 'string' ? v : '';
};
const list = (form: FormData, name: string) =>
  form.getAll(name).map((v) => (typeof v === 'string' ? v : ''));

export type SettingsTab = 'booking' | 'pembayaran';

const TAB_FIELDS: Record<SettingsTab, string[]> = {
  booking: ['dp_percent', 'hold_minutes', 'max_participants', 'draft_hours'],
  pembayaran: ['bank', 'nomor', 'pemegang'],
};

/**
 * Membentuk form lengkap dari kiriman SATU tab: kolom milik tab itu diambil dari kiriman, kolom tab lain diambil
 * dari nilai tersimpan SAAT INI. Kolom tab lain yang ikut terkirim (tersembunyi, diisi saat halaman dimuat)
 * sengaja diabaikan: kalau dipakai, menyimpan satu tab dari halaman yang sudah basi (jendela kedua, atau Owner
 * lain yang baru menyimpan) akan diam-diam mengembalikan perubahan di tab lain.
 */
export function formForTab(submitted: FormData, tab: SettingsTab, current: BookingSettings) {
  const out = new FormData();
  for (const name of TAB_FIELDS[tab]) {
    for (const v of submitted.getAll(name)) if (typeof v === 'string') out.append(name, v);
  }
  if (tab === 'booking') {
    for (const a of current.manualAccounts) {
      out.append('bank', a.bank);
      out.append('nomor', a.number);
      out.append('pemegang', a.holder);
    }
  } else {
    out.append('dp_percent', String(current.dpPercent));
    out.append('hold_minutes', String(current.holdMinutes));
    out.append('max_participants', String(current.maxParticipants));
    out.append('draft_hours', String(current.draftHours));
  }
  return out;
}

/** Membaca isian form HTML (semua nilai berupa teks) dan memvalidasinya dengan skema yang sama dengan pembacaan. */
export function parseBookingSettingsForm(form: FormData): ParsedSettingsForm {
  const banks = list(form, 'bank');
  const numbers = list(form, 'nomor');
  const holders = list(form, 'pemegang');
  const rows = Math.max(banks.length, numbers.length, holders.length);
  const accounts = Array.from({ length: rows }, (_, i) => ({
    bank: (banks[i] ?? '').trim(),
    number: (numbers[i] ?? '').trim(),
    holder: (holders[i] ?? '').trim(),
  }));
  const raw: RawSettingsForm = {
    dpPercent: text(form, 'dp_percent').trim(),
    holdMinutes: text(form, 'hold_minutes').trim(),
    maxParticipants: text(form, 'max_participants').trim(),
    draftHours: text(form, 'draft_hours').trim(),
    accounts,
  };

  const errors: SettingsErrors = {};
  const whole = (
    key: 'dpPercent' | 'holdMinutes' | 'maxParticipants' | 'draftHours',
    msg: string,
  ) => {
    const s = raw[key];
    const n = WHOLE.test(s) ? Number(s) : NaN;
    const ok = Number.isFinite(n) && bookingSettingSchemas[key].safeParse(n).success;
    if (!ok) errors[key] = msg;
    return n;
  };
  const dpPercent = whole('dpPercent', 'Isi bilangan bulat dari 0 sampai 100.');
  const holdMinutes = whole('holdMinutes', 'Isi menit antara 5 dan 1440 (24 jam).');
  const maxParticipants = whole('maxParticipants', 'Isi bilangan bulat dari 1 sampai 50.');
  const draftHours = whole('draftHours', 'Isi jam antara 1 dan 336 (14 hari).');

  // Baris yang kosong seluruhnya dibuang; baris yang terisi sebagian ditolak (bukan diam-diam dilewati).
  const filled: ManualAccount[] = [];
  const rowErrors: Record<number, string> = {};
  accounts.forEach((a, i) => {
    if (!a.bank && !a.number && !a.holder) return;
    if (!a.bank || !a.number || !a.holder) {
      rowErrors[i] = 'Lengkapi nama bank, nomor rekening, dan nama pemilik.';
    } else if (!ACCOUNT_NUMBER.test(a.number)) {
      rowErrors[i] = 'Nomor rekening hanya boleh berisi angka, spasi, titik, atau tanda hubung.';
    } else if (!bookingSettingSchemas.manualAccounts.safeParse([a]).success) {
      rowErrors[i] = 'Data rekening terlalu panjang.';
    } else {
      filled.push({ bank: a.bank, number: a.number, holder: a.holder });
    }
  });
  if (filled.length + Object.keys(rowErrors).length > MAX_MANUAL_ACCOUNTS) {
    errors.manualAccounts = `Maksimal ${MAX_MANUAL_ACCOUNTS} rekening.`;
  }
  if (Object.keys(rowErrors).length > 0) errors.accountRows = rowErrors;

  if (Object.keys(errors).length > 0) return { ok: false, errors, raw };
  return {
    ok: true,
    values: { dpPercent, holdMinutes, maxParticipants, draftHours, manualAccounts: filled },
  };
}

export interface SaveSettingsResult {
  /** Nama pengaturan (kunci tabel `settings`) yang benar-benar berubah. */
  changed: string[];
}

export async function saveBookingSettings(
  db: Db,
  input: { actorId: string; values: BookingSettings; ip?: string | null },
): Promise<SaveSettingsResult> {
  return db.transaction(async (tx) => {
    // Kunci tingkat transaksi: dua Owner yang menyimpan bersamaan diproses berurutan, sehingga catatan
    // "sebelum" pada audit selalu nilai yang benar-benar tergantikan.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('settings:booking'))`);
    const current = await getBookingSettings(tx);
    const changed: string[] = [];
    for (const name of Object.keys(BOOKING_SETTING_KEYS) as (keyof BookingSettings)[]) {
      const next = input.values[name];
      if (JSON.stringify(current[name]) === JSON.stringify(next)) continue;
      const key = BOOKING_SETTING_KEYS[name];
      await tx
        .insert(settings)
        .values({ key, value: next, updatedBy: input.actorId })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: next, updatedBy: input.actorId, updatedAt: new Date() },
        });
      await writeAudit(tx, {
        actorId: input.actorId,
        action: 'settings.updated',
        entity: 'settings',
        entityId: key,
        before: current[name],
        after: next,
        ip: input.ip,
      });
      changed.push(key);
    }
    return { changed };
  });
}
