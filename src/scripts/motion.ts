// Titik masuk gerak untuk halaman publik. Tidak melakukan apa pun (dan tidak mengunduh GSAP) bila
// halaman tidak punya elemen `data-motion` / `data-follow-list`.
import { initMotion } from '../lib/motion';
import { initFollow } from '../lib/motion/follow';

// Gambar pengikut kursor: murni JS+CSS, tidak butuh GSAP.
initFollow();

// Gerak hanya pemanis: bila GSAP gagal dimuat, halaman tetap utuh. Galatnya dicatat di konsol (bukan
// dibiarkan jadi unhandled rejection yang diam) supaya mudah dilacak.
initMotion().catch((err: unknown) => console.warn('[motion] gagal memuat gerak scroll:', err));
