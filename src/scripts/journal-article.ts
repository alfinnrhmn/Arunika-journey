// Peningkatan untuk detail Journal (halaman tetap lengkap tanpa skrip ini):
// 1. "Salin tautan": baru ditampilkan bila Clipboard tersedia, menyalin alamat halaman tanpa layanan pihak ketiga.
// 2. "Di cerita ini": subjudul yang sedang dibaca ditandai aria-current.
const share = document.querySelector<HTMLElement>('[data-share]');
const btn = share?.querySelector<HTMLButtonElement>('[data-copy]');
if (share && btn && typeof navigator.clipboard?.writeText === 'function') {
  const label = btn.querySelector<HTMLElement>('[data-copy-label]');
  const status = share.querySelector<HTMLElement>('[data-copy-status]');
  let timer: number | undefined;
  share.hidden = false;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0]);
      if (label) label.textContent = 'Tautan disalin';
      if (status) status.textContent = 'Tautan cerita disalin.';
    } catch {
      if (label) label.textContent = 'Gagal menyalin';
      if (status) status.textContent = 'Tautan tidak dapat disalin. Salin dari bilah alamat.';
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (label) label.textContent = 'Salin tautan';
      if (status) status.textContent = '';
    }, 2500);
  });
}

const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]'));
const heads = links
  .map((a) => document.getElementById(a.hash.slice(1)))
  .filter((el): el is HTMLElement => !!el);
if (links.length && heads.length === links.length) {
  // Subjudul terakhir yang sudah melewati sepertiga atas layar dianggap sedang dibaca.
  let queued = false;
  const update = () => {
    queued = false;
    let cur = 0;
    heads.forEach((h, i) => {
      if (h.getBoundingClientRect().top <= window.innerHeight * 0.33) cur = i;
    });
    links.forEach((a, i) => {
      if (i === cur) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  };
  const queue = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
}
