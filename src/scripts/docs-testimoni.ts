// Penyempurna deret ulasan di /dokumentasi: tanpa skrip ini deret tetap bisa digulir (scroll-snap, papan ketik
// lewat fokus pada daftar). Di sini tombol sebelumnya/berikutnya dan penghitung ditampilkan dan disinkronkan.

// Menjadikan berkas ini modul (cakupan sendiri), agar nama fungsi tidak bentrok dengan skrip lain.
export {};

function init(): void {
  const track = document.querySelector<HTMLElement>('[data-tm-track]');
  const nav = document.querySelector<HTMLElement>('[data-tm-nav]');
  if (!track || !nav) return;
  const slides = Array.from(track.querySelectorAll<HTMLElement>('[data-tm-slide]'));
  const prev = nav.querySelector<HTMLButtonElement>('[data-tm-prev]');
  const next = nav.querySelector<HTMLButtonElement>('[data-tm-next]');
  const cur = nav.querySelector<HTMLElement>('[data-tm-cur]');
  if (!slides.length || !prev || !next || !cur) return;

  nav.hidden = false;

  const index = () => {
    const x = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    slides.forEach((s, i) => {
      if (s.offsetLeft <= x) best = i;
    });
    return best;
  };
  const go = (i: number) => {
    const n = (i + slides.length) % slides.length;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.scrollTo({ left: slides[n].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => go(index() - 1));
  next.addEventListener('click', () => go(index() + 1));

  let raf = 0;
  track.addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        cur.textContent = String(index() + 1);
      });
    },
    { passive: true },
  );
}

init();
