/**
 * Gerak berbasis scroll (spesifikasi: DS 18). Dibaca dari atribut `data-motion`:
 *
 *   data-motion="zoom"   foto membesar perlahan mengikuti scroll (scrub). Atribut opsional:
 *                        data-zoom-from (bawaan 1), data-zoom-to (bawaan 1.2),
 *                        data-zoom-scope = selektor elemen pemicu (bawaan: induk langsung).
 *
 * Aturan: GSAP dan ScrollTrigger dimuat dengan dynamic import dan HANYA bila halaman memang punya
 * elemen bergerak (halaman transaksi tidak mengunduh GSAP sama sekali). Bila pengguna memilih
 * "kurangi gerakan" (prefers-reduced-motion), tidak ada animasi: foto tampil pada keadaan akhir.
 * Hanya `transform` dan `opacity` yang dianimasikan.
 */

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== '' ? n : fallback;
};

export async function initMotion(root: ParentNode = document): Promise<(() => void) | undefined> {
  const zooms = [...root.querySelectorAll<HTMLElement>('[data-motion="zoom"]')];
  if (zooms.length === 0) return undefined;
  // "Kurangi gerakan": tidak ada animasi, jadi GSAP tidak perlu diunduh sama sekali.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    for (const el of zooms) {
      const scope = el.dataset.zoomScope ? document.querySelector(el.dataset.zoomScope) : null;
      gsap.fromTo(
        el,
        { scale: num(el.dataset.zoomFrom, 1) },
        {
          scale: num(el.dataset.zoomTo, 1.2),
          ease: 'none',
          scrollTrigger: {
            trigger: scope ?? el.parentElement ?? el,
            // Dari saat section mulai masuk dari bawah layar sampai selesai keluar di atas layar.
            start: 'top bottom',
            end: 'bottom top',
            // Angka (bukan true) memberi penghalusan: skala mengejar posisi scroll, tidak patah-patah.
            scrub: 0.6,
          },
        },
      );
    }
  });

  // Gambar dan font yang memuat belakangan mengubah tinggi halaman; hitung ulang titik pemicu.
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener('load', refresh, { once: true });

  return () => {
    window.removeEventListener('load', refresh);
    mm.revert();
  };
}
