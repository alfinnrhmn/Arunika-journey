// Kenyamanan dashboard. Semua aksi tetap bekerja tanpa berkas ini (form HTML biasa); di sini hanya:
// - tombol alasan cepat yang mengisi kolom alasan penolakan (muncul hanya bila JS aktif),
// - konfirmasi sebelum menyetujui pembayaran,
// - mencegah kirim ganda (tombol dinonaktifkan setelah form dikirim).

for (const box of document.querySelectorAll<HTMLElement>('[data-presets]')) box.hidden = false;

document.addEventListener('click', (event) => {
  const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-preset]');
  if (!button) return;
  const target = document.getElementById(button.getAttribute('aria-controls') ?? '');
  if (!(target instanceof HTMLTextAreaElement)) return;
  target.value = button.dataset.preset ?? '';
  target.focus();
});

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-once]')) {
  form.addEventListener('submit', (event) => {
    const message = form.dataset.confirm;
    if (message && !window.confirm(message)) {
      event.preventDefault();
      return;
    }
    // Ditunda satu tick agar pengiriman form tidak terganggu penonaktifan tombol.
    setTimeout(() => {
      for (const b of form.querySelectorAll<HTMLButtonElement>('button[type=submit]')) {
        b.disabled = true;
      }
    }, 0);
  });
}

// Filter daftar (pilihan bulan dan trip): terapkan begitu berubah. Tombol "Terapkan" tetap ada untuk tanpa JS.
for (const form of document.querySelectorAll<HTMLFormElement>('form[data-autosubmit]')) {
  form.addEventListener('change', (event) => {
    const el = event.target as HTMLElement;
    if (
      el instanceof HTMLSelectElement ||
      (el instanceof HTMLInputElement && el.type === 'month')
    ) {
      form.requestSubmit();
    }
  });
}

// Detail reservasi: salin kontak pemesan (email dan telepon) ke papan klip. Hanya ada bila JS aktif.
for (const el of document.querySelectorAll<HTMLElement>('[data-js-only]')) el.hidden = false;
document
  .querySelector<HTMLButtonElement>('[data-copy-contact]')
  ?.addEventListener('click', async (e) => {
    const button = e.currentTarget as HTMLButtonElement;
    const lines = Array.from(document.querySelectorAll('[data-contact] [data-copy]')).map((n) =>
      (n.textContent ?? '').trim(),
    );
    const label = button.textContent ?? '';
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      button.textContent = 'Tersalin';
    } catch {
      button.textContent = 'Gagal menyalin';
    }
    setTimeout(() => (button.textContent = label), 1800);
  });
