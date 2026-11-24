/**
 * Peningkatan progresif untuk halaman pesanan. Halaman sudah lengkap tanpa berkas ini (batas waktu tertulis,
 * form biasa); di sini hanya hitung mundur, salin nomor rekening, tombol cetak, dan pratinjau berkas.
 * Status sebenarnya selalu diputuskan server, bukan jam klien: setelah waktu habis kita berhenti dan
 * menyarankan muat ulang, tidak mengubah status sendiri.
 */

const pad = (n: number) => String(n).padStart(2, '0');

function initCountdown() {
  document.querySelectorAll<HTMLElement>('[data-countdown]').forEach((el) => {
    const iso = el.dataset.countdown;
    const deadline = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(deadline)) return;
    const card = el.closest<HTMLElement>('.bs-fig');
    const hint = card?.querySelector<HTMLElement>('[data-count-hint]');

    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (left === 0) {
        el.textContent = 'Waktu habis';
        card?.setAttribute('data-state', 'lapsed');
        if (hint) {
          hint.hidden = false;
          hint.setAttribute('role', 'status');
        }
        document
          .querySelectorAll<HTMLButtonElement>('[data-proof-submit]')
          .forEach((b) => (b.disabled = true));
        return false;
      }
      el.textContent = `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
      return true;
    };

    if (!tick()) return;
    const timer = window.setInterval(() => {
      if (!tick()) window.clearInterval(timer);
    }, 1000);
  });
}

function initCopy() {
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    // Tombol hanya berguna dengan JS, jadi baru ditampilkan di sini.
    btn.hidden = false;
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy ?? '');
        btn.textContent = 'Tersalin';
      } catch {
        btn.textContent = 'Salin manual';
      }
      window.setTimeout(() => (btn.textContent = label), 2000);
    });
  });
}

function initPrint() {
  document.querySelectorAll<HTMLButtonElement>('[data-print]').forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener('click', () => window.print());
  });
}

const MAX_BYTES = 5 * 1024 * 1024;
const size = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

function initProofForm() {
  document.querySelectorAll<HTMLFormElement>('[data-proof-form]').forEach((form) => {
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    const out = form.querySelector<HTMLOutputElement>('[data-proof-picked]');
    const submit = form.querySelector<HTMLButtonElement>('[data-proof-submit]');
    if (!input || !out) return;
    const label = submit?.querySelector('span')?.textContent ?? '';

    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.setCustomValidity('');
      if (!file) {
        out.textContent = '';
        return;
      }
      // Pemeriksaan ramah di klien; yang resmi tetap di server (jenis, isi, dan ukuran berkas).
      if (file.size > MAX_BYTES) {
        input.setCustomValidity('Ukuran berkas maksimal 5 MB.');
        out.textContent = `${file.name} (${size(file.size)}) melebihi 5 MB. Pilih berkas yang lebih kecil.`;
        out.dataset.state = 'bad';
        return;
      }
      out.dataset.state = 'ok';
      out.textContent = `Dipilih: ${file.name} (${size(file.size)})`;
    });

    // Kembali lewat riwayat (bfcache) tidak boleh meninggalkan tombol terkunci.
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && submit) {
        submit.disabled = false;
        const l = submit.querySelector('span');
        if (l) l.textContent = label;
      }
    });

    // Cegah klik ganda: setiap kiriman dihitung oleh pembatas laju di server.
    form.addEventListener('submit', () => {
      if (!submit || !form.checkValidity()) return;
      window.setTimeout(() => {
        submit.disabled = true;
        const l = submit.querySelector('span');
        if (l) l.textContent = 'Mengirim...';
      }, 0);
    });
  });
}

initCountdown();
initCopy();
initPrint();
initProofForm();
