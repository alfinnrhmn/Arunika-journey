// Kenyamanan layar 2FA. Semuanya bekerja tanpa berkas ini (form HTML biasa); di sini hanya:
// - kirim otomatis setelah 6 digit kode TOTP diketik/ditempel,
// - tombol salin dan unduh kode cadangan (muncul hanya bila JS aktif).
// Rahasia (kunci, kode cadangan) hanya dibaca dari DOM saat tombol ditekan: tidak ditulis ke localStorage, URL,
// cookie, atau atribut apa pun.
import './dashboard';

for (const el of document.querySelectorAll<HTMLElement>('[data-js-only]')) el.hidden = false;

const totp = document.querySelector<HTMLInputElement>('form[data-kind="totp"] input[name="kode"]');
if (totp) {
  totp.addEventListener('input', () => {
    const digits = totp.value.replace(/\D/g, '').slice(0, 6);
    if (digits !== totp.value) totp.value = digits;
    if (digits.length === 6) totp.form?.requestSubmit();
  });
}

function backupCodes(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-backup-codes] li')).map((li) =>
    (li.textContent ?? '').trim(),
  );
}

const flash = (button: HTMLButtonElement, text: string) => {
  const label = button.dataset.label ?? button.textContent ?? '';
  button.dataset.label = label;
  button.textContent = text;
  setTimeout(() => (button.textContent = label), 1800);
};

document
  .querySelector<HTMLButtonElement>('[data-copy-codes]')
  ?.addEventListener('click', async (e) => {
    const button = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(backupCodes().join('\n'));
      flash(button, 'Tersalin');
    } catch {
      // Tanpa izin papan klip: pilih daftarnya agar bisa disalin manual.
      const list = document.querySelector('[data-backup-codes]');
      if (list) window.getSelection()?.selectAllChildren(list);
      flash(button, 'Pilih lalu salin');
    }
  });

document
  .querySelector<HTMLButtonElement>('[data-download-codes]')
  ?.addEventListener('click', (e) => {
    const text = `Kode cadangan Arunika Dashboard\nSimpan di tempat aman. Setiap kode hanya berlaku sekali.\n\n${backupCodes().join('\n')}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kode-cadangan-arunika.txt';
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    flash(e.currentTarget as HTMLButtonElement, 'Terunduh');
  });
