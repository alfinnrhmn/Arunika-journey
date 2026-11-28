/**
 * Gulir halus seluruh situs publik (Lenis, gaya kudanil.com): roda mouse dan trackpad meluncur dengan inersia
 * alih-alih melompat per langkah. Lenis tetap memakai gulir asli peramban (window.scrollTo), jadi `position: sticky`,
 * IntersectionObserver, parallax (parallax.ts) dan pin GSAP ScrollTrigger (motion.ts) berjalan tanpa perubahan.
 *
 * Aturan:
 * - Mati bila pengguna memilih "kurangi gerakan" (prefers-reduced-motion) dan di layar sentuh (pointer: coarse):
 *   gulir sentuh asli sudah halus dan inersianya milik sistem. Halaman alur fokus (booking, pembayaran) menandai
 *   <body data-smooth="off"> dan juga tidak memakainya.
 * - Elemen yang bisa digulir sendiri (panel menu, dialog, laci filter, deret geser) tidak dibajak (allowNestedScroll).
 * - Saat gulir halaman dikunci (menu terbuka `hf-menu-lock`, dialog cookie `cs-lock`, laci filter yang memberi
 *   `overflow: hidden` pada <html>), Lenis dihentikan; kalau tidak, halaman di belakangnya tetap bergulir.
 * - Tautan jangkar satu halaman (`#tim`, `#kontak`) digulir halus dengan menghormati `scroll-margin-top`. Pintasan
 *   "Lewati ke konten" dan klik yang sudah dibatalkan skrip lain dibiarkan memakai perilaku bawaan (fokus tetap pindah).
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let lenis: Lenis | undefined;
const listeners = new Set<() => void>();

/** Instans Lenis yang aktif, atau undefined bila gulir halus mati di halaman ini. */
export function getLenis(): Lenis | undefined {
  return lenis;
}

/**
 * Dengarkan setiap pembaruan posisi gulir Lenis (dipakai motion.ts untuk menyelaraskan GSAP ScrollTrigger).
 * Aman dipanggil sebelum atau sesudah Lenis dibuat. Mengembalikan fungsi untuk berhenti mendengarkan.
 */
export function onSmoothScroll(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const LOCK_CLASSES = ['hf-menu-lock', 'cs-lock'];

export function initSmoothScroll(): Lenis | undefined {
  if (lenis) return lenis;
  if (document.body.dataset.smooth === 'off') return undefined;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
  if (window.matchMedia('(pointer: coarse)').matches) return undefined;

  const instance = new Lenis({
    duration: 1.15,
    wheelMultiplier: 1,
    smoothWheel: true,
    allowNestedScroll: true,
    autoRaf: true,
  });
  lenis = instance;
  instance.on('scroll', () => listeners.forEach((cb) => cb()));

  // Kunci gulir: ikuti penanda kunci yang sudah dipakai situs.
  const root = document.documentElement;
  let stopped = false;
  const syncLock = () => {
    const locked =
      LOCK_CLASSES.some((c) => root.classList.contains(c)) || root.style.overflow === 'hidden';
    if (locked === stopped) return;
    stopped = locked;
    if (locked) instance.stop();
    else instance.start();
  };
  new MutationObserver(syncLock).observe(root, {
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
  syncLock();

  // Jangkar satu halaman: gulir halus dengan margin atas yang sama seperti `scroll-margin-top` CSS.
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || a.classList.contains('hf-skip') || a.hasAttribute('download')) return;
    if (a.target && a.target !== '_self') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    if (url.search !== location.search || url.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    instance.scrollTo(target, { offset: -margin });
    history.pushState(null, '', url.hash);
  });

  return instance;
}
