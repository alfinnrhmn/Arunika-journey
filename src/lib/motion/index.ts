/**
 * Gerak berbasis scroll (spesifikasi: DS 18). Dibaca dari atribut `data-motion`:
 *
 *   data-motion="open"   bingkai foto membuka dari jendela kecil di tengah sampai penuh layar, sementara
 *                        fotonya mengecil dari 1,2 ke 1 (zoom). Dipasang pada pembungkus yang berisi
 *                        <img>; induk langsungnya (setinggi layar) ditahan (pin) selama satu tinggi layar
 *                        scroll, jadi halaman baru lanjut setelah gambar memenuhi layar.
 *
 *   data-motion="zoom"   foto membesar perlahan mengikuti scroll (scrub). Atribut opsional:
 *                        data-zoom-from (bawaan 1), data-zoom-to (bawaan 1.2),
 *                        data-zoom-scope = selektor elemen pemicu (bawaan: induk langsung).
 *
 * Aturan: GSAP dan ScrollTrigger dimuat dengan dynamic import dan HANYA bila halaman memang punya
 * elemen bergerak (halaman transaksi tidak mengunduh GSAP sama sekali). Bila pengguna memilih
 * "kurangi gerakan" (prefers-reduced-motion), tidak ada animasi: foto tampil pada keadaan akhir.
 * Hanya `transform` dan `clip-path` yang dianimasikan.
 *
 * Layar: gerak scroll berat (pin, zoom) hanya hidup di >= 1280px (komposisi desktop). Di bawahnya elemen
 * `data-motion` ada di bagian yang disembunyikan, jadi GSAP tidak diunduh sama sekali sampai jendela
 * diperlebar melewati 1280px; saat jendela diperkecil kembali, `gsap.matchMedia` mematikan semua ScrollTrigger
 * dan membersihkan pin-spacer, lalu menghitung ulang.
 *
 * Catatan: jangan menaruh `overflow: hidden` pada induk yang memuat animasi berbasis CSS
 * `animation-timeline: view()`. Elemen itu menjadi wadah scroll sendiri dan timeline-nya tidak pernah
 * bergerak (inilah sebabnya animasi bawaan desain untuk gambar gunung mati dan diganti modul ini).
 */

/** Gerak scroll hanya untuk komposisi desktop (sama dengan batas kelas hc/hd di home.css). */
const WIDE = '(min-width: 1280px)';

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && value !== undefined && value !== '' ? n : fallback;
};

// Jendela awal pada desain: 14% atas/bawah, 37,35% kiri/kanan, sudut 8px.
const OPEN_FROM = 'inset(14% 37.35% 14% 37.35% round 8px)';
const OPEN_TO = 'inset(0% 0% 0% 0% round 0px)';

export async function initMotion(root: ParentNode = document): Promise<(() => void) | undefined> {
  const zooms = [...root.querySelectorAll<HTMLElement>('[data-motion="zoom"]')];
  const opens = [...root.querySelectorAll<HTMLElement>('[data-motion="open"]')];
  if (zooms.length === 0 && opens.length === 0) return undefined;
  // "Kurangi gerakan": tidak ada animasi, jadi GSAP tidak perlu diunduh sama sekali.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

  const wide = window.matchMedia(WIDE);
  if (!wide.matches) {
    // Layar kecil: tunggu sampai jendela melebar, baru unduh GSAP dan pasang gerak.
    let teardown: (() => void) | undefined;
    const onChange = () => {
      if (!wide.matches || teardown) return;
      wide.removeEventListener('change', onChange);
      initMotion(root).then((t) => (teardown = t));
    };
    wide.addEventListener('change', onChange);
    return () => {
      wide.removeEventListener('change', onChange);
      teardown?.();
    };
  }

  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add(`${WIDE} and (prefers-reduced-motion: no-preference)`, () => {
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

    for (const el of opens) {
      const img = el.querySelector('img');
      // Bingkai (induk langsung, setinggi layar) ditahan di atas layar selama bukaan berjalan; halaman
      // baru lanjut bergulir setelah gambar memenuhi layar. Induk yang ditahan, bukan `el`, karena induk
      // ber-overflow:hidden akan memotong ruang tambahan milik pin.
      const frame = el.parentElement ?? el;
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: frame,
          start: 'top top',
          // Jarak scroll selama gambar ditahan: satu tinggi layar.
          end: '+=100%',
          pin: frame,
          anticipatePin: 1,
          scrub: 0.6,
        },
      });
      tl.fromTo(el, { clipPath: OPEN_FROM }, { clipPath: OPEN_TO }, 0);
      if (img) tl.fromTo(img, { scale: 1.2 }, { scale: 1 }, 0);
    }
  });

  // Gambar dan font yang memuat belakangan mengubah tinggi halaman; hitung ulang titik pemicu.
  const refresh = () => ScrollTrigger.refresh();
  if (document.readyState === 'complete') refresh();
  else window.addEventListener('load', refresh, { once: true });
  // Melewati 1280px (bagian desktop tampil atau hilang) mengubah tinggi halaman: hitung ulang setelah tata
  // letak baru terpasang. Pemicu sendiri dibuat dan dibuang oleh gsap.matchMedia di atas.
  const onWide = () => requestAnimationFrame(refresh);
  wide.addEventListener('change', onWide);

  return () => {
    window.removeEventListener('load', refresh);
    wide.removeEventListener('change', onWide);
    mm.revert();
  };
}
