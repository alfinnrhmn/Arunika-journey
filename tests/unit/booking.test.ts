import { describe, expect, it } from 'vitest';
import { bookability } from '../../src/features/booking/schedule';
import {
  contactSchema,
  fieldIssues,
  normalizePhone,
  participantSchema,
  partySchema,
} from '../../src/features/booking/schemas';

describe('normalizePhone', () => {
  it.each([
    ['0812 3456 7890', '081234567890'],
    ['+62 812-3456-7890', '081234567890'],
    ['62812.3456.7890', '081234567890'],
    ['(0812) 3456 7890', '081234567890'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('contactSchema', () => {
  it('menormalkan nama, email (huruf kecil), dan nomor', () => {
    const r = contactSchema.parse({
      name: '  Nadia Putri ',
      email: ' Nadia@Example.COM ',
      phone: '+62 812 3456 7890',
    });
    expect(r).toEqual({ name: 'Nadia Putri', email: 'nadia@example.com', phone: '081234567890' });
  });

  it('menunjuk bidang yang salah dengan pesan berbahasa Indonesia', () => {
    const r = contactSchema.safeParse({ name: 'N', email: 'bukan-email', phone: '123' });
    expect(r.success).toBe(false);
    if (r.success) return;
    const issues = fieldIssues(r.error, 'contact');
    expect(Object.keys(issues).sort()).toEqual(['contact.email', 'contact.name', 'contact.phone']);
    expect(issues['contact.phone']).toMatch(/WhatsApp/);
  });

  it('menolak nomor yang bukan ponsel Indonesia', () => {
    for (const phone of ['0212345678', '08123', '081234567890123456', 'abcdefghij'])
      expect(contactSchema.safeParse({ name: 'Nadia', email: 'a@b.co', phone }).success).toBe(
        false,
      );
  });
});

describe('participantSchema dan partySchema', () => {
  it('catatan kosong menjadi null; jenis hanya dewasa atau anak', () => {
    expect(
      participantSchema.parse({ fullName: 'Budi', kind: 'adult', specialNeeds: '  ' }).specialNeeds,
    ).toBeNull();
    expect(participantSchema.safeParse({ fullName: 'Budi', kind: 'infant' }).success).toBe(false);
  });

  it('minimal 1 dewasa dan total kursi dibatasi Pengaturan', () => {
    const party = partySchema(8);
    expect(party.safeParse({ adults: 2, children: 1 }).success).toBe(true);
    expect(party.safeParse({ adults: 0, children: 2 }).success).toBe(false);
    expect(party.safeParse({ adults: 5, children: 4 }).success).toBe(false);
    expect(party.safeParse({ adults: 1.5, children: 0 }).success).toBe(false);
    expect(partySchema(3).safeParse({ adults: 2, children: 2 }).success).toBe(false);
  });
});

describe('bookability (jadwal dapat dipesan?)', () => {
  const base = { status: 'open' as const, departureDate: '2027-01-09', bookingCutoffDays: 0 };

  it('terbuka dan di masa depan: ok', () => {
    expect(bookability(base, new Date('2026-12-01T03:00:00Z'))).toBe('ok');
  });

  it('penuh dibedakan dari tidak tersedia (penuh = kuota tidak mencukupi di UI)', () => {
    expect(bookability({ ...base, status: 'full' })).toBe('full');
    for (const status of ['draft', 'closed', 'cancelled'] as const)
      expect(bookability({ ...base, status })).toBe('not_open');
  });

  it('lewat tanggal berangkat: past; "hari ini" mengikuti Asia/Jakarta, bukan UTC', () => {
    expect(bookability(base, new Date('2027-01-10T03:00:00Z'))).toBe('past');
    // 8 Jan 18:00 UTC = 9 Jan 01:00 WIB: hari keberangkatan, masih boleh bila tanpa cutoff
    expect(bookability(base, new Date('2027-01-08T18:00:00Z'))).toBe('ok');
    // 9 Jan 18:00 UTC = 10 Jan 01:00 WIB: sudah lewat di Jakarta walau di UTC masih 9 Jan
    expect(bookability(base, new Date('2027-01-09T18:00:00Z'))).toBe('past');
  });

  it('batas pemesanan H-n: tutup pada hari H-n', () => {
    const s = { ...base, bookingCutoffDays: 3 }; // berangkat 9 Jan => tutup sejak 6 Jan
    expect(bookability(s, new Date('2027-01-05T03:00:00Z'))).toBe('ok');
    expect(bookability(s, new Date('2027-01-06T03:00:00Z'))).toBe('ok'); // 6 Jan masih boleh (H-3)
    expect(bookability(s, new Date('2027-01-07T03:00:00Z'))).toBe('cutoff');
  });
});
