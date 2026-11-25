import { describe, expect, it } from 'vitest';
import { ABILITIES, can, type Ability } from '../../src/server/auth/permissions';
import { guard, isUuid } from '../../src/server/auth/guard';
import { safeNext } from '../../src/server/auth/session';
import { isSameOriginRequest } from '../../src/server/auth/origin';
import { twoFactorGate } from '../../src/server/auth/two-factor-gate';

const staff = (role: 'owner' | 'admin_ops') => ({
  id: 'u1',
  name: 'Uji',
  email: 'uji@uji.example',
  role,
  twoFactorEnabled: true,
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

describe('isSameOriginRequest (CSRF dashboard)', () => {
  const SITE = ['http://localhost:4321'];
  const req = (method: string, headers: Record<string, string> = {}) =>
    new Request('http://localhost:4321/dashboard/pembayaran/x/setujui', { method, headers });

  it('metode aman selalu lolos', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS'])
      expect(isSameOriginRequest(req(method), SITE)).toBe(true);
  });

  it('POST dengan Origin situs sendiri lolos', () => {
    expect(isSameOriginRequest(req('POST', { origin: 'http://localhost:4321' }), SITE)).toBe(true);
  });

  it('POST dengan Origin situs lain ditolak, juga tanpa badan atau tipe konten (celah checkOrigin Astro)', () => {
    expect(isSameOriginRequest(req('POST', { origin: 'https://situs-lain.com' }), SITE)).toBe(
      false,
    );
    expect(
      isSameOriginRequest(req('DELETE', { origin: 'http://localhost:4321.situs-lain.com' }), SITE),
    ).toBe(false);
    expect(isSameOriginRequest(req('POST', { origin: 'null' }), SITE)).toBe(false);
  });

  it('tanpa Origin: hanya lolos bila browser menyatakan same-origin', () => {
    expect(isSameOriginRequest(req('POST'), SITE)).toBe(false);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'cross-site' }), SITE)).toBe(false);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'same-site' }), SITE)).toBe(false);
    expect(isSameOriginRequest(req('POST', { 'sec-fetch-site': 'same-origin' }), SITE)).toBe(true);
  });
});

describe('twoFactorGate (2FA wajib)', () => {
  const on = { twoFactorEnabled: true };
  const off = { twoFactorEnabled: false };

  it('staf ber-2FA boleh ke mana saja di dashboard', () => {
    for (const p of [
      '/dashboard',
      '/dashboard/pembayaran',
      '/dashboard/keamanan/2fa',
      '/dashboard/keluar',
    ]) {
      expect(twoFactorGate(on, p), p).toBe('ok');
    }
  });

  it('staf tanpa 2FA hanya boleh ke halaman aktivasi dan keluar; semua lainnya diarahkan ke aktivasi', () => {
    expect(twoFactorGate(off, '/dashboard/keamanan/2fa')).toBe('ok');
    expect(twoFactorGate(off, '/dashboard/keamanan/2fa/')).toBe('ok');
    expect(twoFactorGate(off, '/dashboard/keluar')).toBe('ok');
    for (const p of [
      '/dashboard',
      '/dashboard/pembayaran',
      '/dashboard/pembayaran/abc/setujui',
      '/dashboard/pembayaran/abc/bukti',
      '/dashboard/keamanan',
      '/dashboard/keamanan/2fa-lain',
    ]) {
      expect(twoFactorGate(off, p), p).toBe('setup');
    }
  });
});
