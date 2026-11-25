// Kenyamanan halaman Pengaturan. Form tetap bisa disimpan tanpa berkas ini; di sini hanya:
// - bar "Ada perubahan yang belum disimpan" (pelacak form kotor),
// - tambah dan hapus baris rekening transfer,
// - contoh hitungan DP yang ikut berubah saat persen diketik (memakai fungsi harga yang sama dengan server).
import { calcPrice } from '../features/pricing/pricing';
import { formatRupiah } from '../lib/format';
import './dashboard';

for (const el of document.querySelectorAll<HTMLElement>('[data-js-only]')) el.hidden = false;

const form = document.querySelector<HTMLFormElement>('form[data-settings]');
if (form) {
  const bar = form.querySelector<HTMLElement>('[data-dirty]');
  const snapshot = () => JSON.stringify(Array.from(new FormData(form).entries()));
  const initial = snapshot();
  const refresh = () => {
    if (bar) bar.hidden = snapshot() === initial;
  };
  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);

  form.querySelector('[data-discard]')?.addEventListener('click', () => {
    // Muat ulang dari server: mengembalikan isian, baris rekening, dan contoh hitungan sekaligus.
    window.location.assign(
      window.location.pathname + window.location.search.replace(/&?tersimpan=\d+/, ''),
    );
  });

  // Rekening: baris di luar yang terlihat disembunyikan; tombol Tambah membukanya satu per satu.
  const rows = Array.from(form.querySelectorAll<HTMLElement>('[data-account-row]'));
  const addButton = form.querySelector<HTMLButtonElement>('[data-add-account]');
  const syncAdd = () => {
    if (addButton) addButton.hidden = !rows.some((r) => r.hidden);
  };
  syncAdd();
  addButton?.addEventListener('click', () => {
    const next = rows.find((r) => r.hidden);
    if (!next) return;
    next.hidden = false;
    syncAdd();
    next.querySelector<HTMLInputElement>('input')?.focus();
  });
  for (const row of rows) {
    row.querySelector('[data-remove-account]')?.addEventListener('click', () => {
      // "Hapus" = kosongkan baris (server membuang baris kosong). Baris disembunyikan bila masih ada baris lain terlihat.
      for (const input of row.querySelectorAll<HTMLInputElement>('input')) {
        input.value = '';
        input.removeAttribute('aria-invalid');
      }
      if (rows.filter((r) => !r.hidden).length > 1) row.hidden = true;
      syncAdd();
      refresh();
    });
  }

  // Contoh hitungan: harga contoh tetap (2 peserta x Rp 1.250.000), DP dari isian bila sah.
  const dp = form.querySelector<HTMLInputElement>('#dp_percent');
  if (dp) {
    dp.addEventListener('input', () => {
      const n = /^\d{1,3}$/.test(dp.value.trim()) ? Number(dp.value) : NaN;
      if (!(n >= 0 && n <= 100)) return;
      const r = calcPrice({ unitPrice: 1_250_000, adults: 2, children: 0, dpPercent: n });
      const set = (sel: string, text: string) => {
        const el = document.querySelector(sel);
        if (el) el.textContent = text;
      };
      set('[data-ex-pct]', String(r.dpPercent));
      set('[data-ex-dp]', formatRupiah(r.dp));
      set('[data-ex-balance]', formatRupiah(r.balance));
    });
  }
}
