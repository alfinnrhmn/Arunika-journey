// Titik masuk gerak berbasis scroll untuk halaman publik. Tidak melakukan apa pun (dan tidak
// mengunduh GSAP) bila halaman tidak punya elemen `data-motion`.
import { initMotion } from '../lib/motion';

// Gerak hanya pemanis: bila GSAP gagal dimuat, halaman tetap utuh. Galatnya dicatat di konsol (bukan
// dibiarkan jadi unhandled rejection yang diam) supaya mudah dilacak.
initMotion().catch((err: unknown) => console.warn('[motion] gagal memuat gerak scroll:', err));
