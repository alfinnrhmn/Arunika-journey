/**
 * Parallax foto: isi kotak foto bergeser perlahan mengikuti gulir (foto "ikut turun"), dengan rumus dan
 * kehalusan yang sama seperti `.fpx` di Home (src/scripts/home.js): posisi dihitung dari jarak pusat kotak ke
 * tengah layar, digeser paling jauh 9% tinggi kotak, lalu didekati bertahap (easing 0.09).
 *
 * Pemakaian: bungkus <img> dalam elemen `[data-parallax]` (position: absolute, top/bottom -9%, transform
 * translate3d(0, var(--py), 0)) di dalam kotak ber-`overflow: hidden`. Skrip hanya mengisi variabel CSS `--py`.
 *
 * Gerakan mati bila pengguna memilih "kurangi gerakan"; loop rAF hanya berjalan selagi kotak terlihat di layar
 * dan media query cocok, dan berhenti sendiri di luar itu.
 */
export function initParallax(selector = '[data-parallax]', media = '(min-width: 1024px)'): void {
  const els = [...document.querySelectorAll<HTMLElement>(selector)];
  const wide = window.matchMedia(media);
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!els.length) return;

  const state = els.map((el) => ({ el, y: 0, visible: false }));
  let raf = 0;

  const active = () => wide.matches && !calm.matches;

  function tick(): void {
    raf = 0;
    if (!active() || !state.some((s) => s.visible)) return;
    const vh = window.innerHeight;
    for (const s of state) {
      if (!s.visible || !s.el.parentElement) continue;
      const b = s.el.parentElement.getBoundingClientRect();
      const p = Math.max(
        -1,
        Math.min(1, (b.top + b.height / 2 - vh / 2) / (vh / 2 + b.height / 2)),
      );
      const target = -p * 0.09 * b.height;
      s.y += (target - s.y) * 0.09;
      s.el.style.setProperty('--py', `${s.y.toFixed(2)}px`);
    }
    raf = requestAnimationFrame(tick);
  }
  const start = () => {
    if (!raf && active()) raf = requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = state.find((x) => x.el.parentElement === e.target);
      if (s) s.visible = e.isIntersecting;
    }
    start();
  });
  for (const s of state) if (s.el.parentElement) io.observe(s.el.parentElement);

  const reset = () => {
    if (active()) return start();
    for (const s of state) {
      s.y = 0;
      s.el.style.removeProperty('--py');
    }
  };
  wide.addEventListener('change', reset);
  calm.addEventListener('change', reset);
}
