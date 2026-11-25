// Menu penuh layar header publik (HFNavRD) di tablet dan mobile. Penyempurna: tanpa skrip ini menu tetap
// bisa dibuka lewat tautan `#hf-menu` (panel tampil dengan :target). Di sini tautan itu digantikan tombol
// <button aria-expanded aria-controls>, panel dipindah ke <body>, halaman di belakangnya dibuat `inert`,
// gulir dikunci (kelas `hf-menu-lock` di <html>, aturannya di global.css), Esc menutup, Tab berputar di
// dalam panel, dan fokus kembali ke tombol saat menutup.

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function init(): void {
  const root = document.documentElement;
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  if (!btn || !panel) return;

  // Aktifkan mode JS (CSS menukar tautan menjadi tombol) dan pindahkan panel ke <body>.
  root.classList.add('hf-js');
  document.body.appendChild(panel);
  const closers = panel.querySelectorAll<HTMLElement>('[data-menu-close]');
  closers.forEach((el) => el.setAttribute('role', 'button'));

  const desktop = window.matchMedia('(min-width: 1280px)');
  let inerted: HTMLElement[] = [];

  const isOpen = () => panel.hasAttribute('data-open');
  const focusables = () =>
    Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );

  function open(): void {
    if (isOpen()) return;
    panel!.setAttribute('data-open', '');
    btn!.setAttribute('aria-expanded', 'true');
    root.classList.add('hf-menu-lock');
    inerted = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== panel && !el.inert,
    );
    inerted.forEach((el) => {
      el.inert = true;
    });
    document.addEventListener('keydown', onKey);
    (closers[0] ?? focusables()[0])?.focus();
  }

  function close(returnFocus = true): void {
    if (!isOpen()) return;
    panel!.removeAttribute('data-open');
    btn!.setAttribute('aria-expanded', 'false');
    root.classList.remove('hf-menu-lock');
    inerted.forEach((el) => {
      el.inert = false;
    });
    inerted = [];
    document.removeEventListener('keydown', onKey);
    if (returnFocus && btn!.offsetParent !== null) btn!.focus();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panel!.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel!.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  btn.addEventListener('click', () => (isOpen() ? close() : open()));
  closers.forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      close();
    }),
  );
  // Layar melebar ke desktop saat menu terbuka: tutup tanpa merebut fokus.
  desktop.addEventListener('change', (e) => {
    if (e.matches) close(false);
  });
  // Kembali lewat riwayat (bfcache) jangan memunculkan menu yang masih terbuka.
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) close(false);
  });
  // Hash sisa dari mode tanpa JS (#hf-menu) tidak boleh membuat panel tampak terbuka; sudah ditangani
  // CSS (html.hf-js mematikan :target). Bersihkan juga hash-nya agar tombol Kembali tidak membingungkan.
  if (location.hash === '#hf-menu') {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

init();
