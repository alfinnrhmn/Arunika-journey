import { describe, expect, it } from 'vitest';
import { ABILITIES, can, type Ability } from '../../src/server/auth/permissions';
import { guard, isUuid } from '../../src/server/auth/guard';
import { safeNext } from '../../src/server/auth/session';

const staff = (role: 'owner' | 'admin_ops') => ({
  id: 'u1',
  name: 'Uji',
  email: 'uji@uji.example',
  role,
});

describe('matriks izin (PRD 6.7)', () => {
  it('Owner dapat melakukan semuanya', () => {
    for (const ability of Object.keys(ABILITIES) as Ability[]) {
      expect(can('owner', ability), ability).toBe(true);
    }
  });

  it('Admin Operasional dapat bekerja harian: ringkasan, reservasi, jadwal, request, verifikasi pembayaran, konten', () => {
    for (const ability of [
      'ringkasan.lihat',
      'reservasi.kelola',
      'jadwal.kelola',
      'request.kelola',
      'pembayaran.verifikasi',
      'paket.konten',
      'konten.kelola',
      'legal.draf',
    ] as const) {
      expect(can('admin_ops', ability), ability).toBe(true);
    }
  });

  it('Admin Operasional TIDAK dapat: persetujuan refund, harga paket, menerbitkan legal, pengguna, pengaturan, log audit', () => {
    for (const ability of [
      'refund.setujui',
      'paket.harga',
      'legal.terbit',
      'pengguna.kelola',
      'pengaturan.kelola',
      'audit.lihat',
    ] as const) {
      expect(can('admin_ops', ability), ability).toBe(false);
    }
  });

  it('tanpa peran atau peran tidak dikenal: ditolak', () => {
    expect(can(null, 'ringkasan.lihat')).toBe(false);
    expect(can(undefined, 'ringkasan.lihat')).toBe(false);
    // @ts-expect-error peran di luar daftar harus ditolak walau lolos tipe di runtime
    expect(can('superadmin', 'ringkasan.lihat')).toBe(false);
  });
});

describe('guard', () => {
  it('tanpa staf: ke halaman masuk', () => {
    const g = guard({}, 'pembayaran.verifikasi');
    expect('response' in g && g.response.status).toBe(303);
    expect('response' in g && g.response.headers.get('Location')).toBe('/dashboard/masuk');
  });

  it('peran tidak berizin: ke halaman Tidak ada akses; berizin: staf dikembalikan', () => {
    const denied = guard({ staff: staff('admin_ops') }, 'refund.setujui');
    expect('response' in denied && denied.response.headers.get('Location')).toBe(
      '/dashboard/tidak-ada-akses',
    );
    const ok = guard({ staff: staff('owner') }, 'refund.setujui');
    expect('staff' in ok && ok.staff.role).toBe('owner');
  });

  it('isUuid hanya menerima UUID', () => {
    expect(isUuid('01a20b96-be35-793a-b58d-817a04587e07')).toBe(true);
    for (const bad of [
      '',
      'abc',
      '../../etc/passwd',
      "1' OR '1'='1",
      '01a20b96-be35-793a-b58d-817a04587e0',
    ]) {
      expect(isUuid(bad), bad).toBe(false);
    }
  });
});

describe('safeNext (cegah open redirect setelah masuk)', () => {
  it('menerima jalur di dalam dashboard', () => {
    expect(safeNext('/dashboard')).toBe('/dashboard');
    expect(safeNext('/dashboard/pembayaran')).toBe('/dashboard/pembayaran');
    expect(safeNext('/dashboard/pembayaran?pilih=abc-123')).toBe(
      '/dashboard/pembayaran?pilih=abc-123',
    );
  });

  it.each([
    ['https://situs-lain.com'],
    ['//situs-lain.com'],
    ['/dashboard@situs-lain.com'],
    ['/dashboard/../admin'],
    ['/dashboardx'],
    ['javascript:alert(1)'],
    ['/trips'],
    [''],
  ])('menolak %s dan kembali ke /dashboard', (value) => {
    expect(safeNext(value)).toBe('/dashboard');
  });

  it('null atau undefined kembali ke /dashboard', () => {
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext(undefined)).toBe('/dashboard');
  });
});
