/**
 * Gambar yang mengikuti kursor saat kursor berada di sebuah baris daftar (pola "hover list").
 *
 * Markup:
 *   <div data-follow-list="#pengikut">             pembungkus daftar
 *     <div data-follow="kunci-a">Nama A</div>      baris pemicu (kursor di sini memunculkan gambar A)
 *     <div data-follow="kunci-b">Nama B</div>
 *   </div>
 *   <div id="pengikut" class="follow" aria-hidden="true">   kotak pengikut (position: fixed, lihat home.css)
 *     <div class="follow-in">
 *       <img data-key="kunci-a" data-src="/foto/a.webp" alt="" />   gambar baru diunduh saat daftar mendekat
 *       <img data-key="kunci-b" data-src="/foto/b.webp" alt="" />
 *     </div>
 *   </div>
 *
 * Aturan:
 * - Hanya untuk perangkat dengan mouse (hover: hover dan pointer: fine). Di layar sentuh tidak ada apa pun.
 * - Murni JS + CSS (tanpa GSAP), jadi tidak menambah unduhan.
 * - "Kurangi gerakan": gambar tetap muncul di sisi kursor tetapi langsung di tempatnya, tanpa pengejaran.
 * - Gambar diunduh sekali, saat daftar mendekati layar (bukan saat halaman dimuat).
 */

const OFFSET = 36; // jarak gambar dari kursor
const MARGIN = 16; // jarak minimal dari tepi layar
const EASE = 0.16; // 0..1, makin besar makin cepat mengejar

export function initFollow(root: ParentNode = document): (() => void) | undefined {
  const lists = [...root.querySelectorAll<HTMLElement>('[data-follow-list]')];
  if (lists.length === 0) return undefined;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cleanups: Array<() => void> = [];

  for (const list of lists) {
    const box = document.querySelector<HTMLElement>(list.dataset.followList ?? '');
    if (!box) continue;
    const imgs = [...box.querySelectorAll<HTMLImageElement>('img[data-key]')];
    const rows = [...list.querySelectorAll<HTMLElement>('[data-follow]')];
    const size = () => ({ w: box.offsetWidth, h: box.offsetHeight });

    // Unduh gambar sekali, ketika daftar mendekati layar.
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      for (const img of imgs) if (img.dataset.src) img.src = img.dataset.src;
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          load();
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(list);

    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let active = false;

    const place = (clientX: number, clientY: number) => {
      const { w, h } = size();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Di sisi kanan kursor; berbalik ke kiri bila tidak muat.
      let x = clientX + OFFSET;
      if (x + w > vw - MARGIN) x = clientX - OFFSET - w;
      const y = Math.min(Math.max(clientY - h / 2, MARGIN), vh - h - MARGIN);
      target.x = Math.max(MARGIN, x);
      target.y = y;
    };

    const paint = () => {
      box.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
    };

    const tick = () => {
      const k = reduce ? 1 : EASE;
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      paint();
      const settled = Math.abs(target.x - cur.x) < 0.1 && Math.abs(target.y - cur.y) < 0.1;
      raf = active || !settled ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const show = (key: string, e: PointerEvent) => {
      load();
      for (const img of imgs) img.classList.toggle('on', img.dataset.key === key);
      place(e.clientX, e.clientY);
      if (!active) {
        // Pertama kali: langsung di sisi kursor, jangan terbang dari pojok layar.
        cur.x = target.x;
        cur.y = target.y;
        paint();
      }
      active = true;
      box.classList.add('on');
      start();
    };
    const hide = () => {
      active = false;
      box.classList.remove('on');
    };

    const enter = (row: HTMLElement) => (e: Event) =>
      show(row.dataset.follow ?? '', e as PointerEvent);
    const move = (e: Event) => {
      const pe = e as PointerEvent;
      if (!active) return;
      place(pe.clientX, pe.clientY);
      start();
    };

    const bound: Array<[HTMLElement, string, EventListener]> = [];
    for (const row of rows) {
      const onEnter = enter(row);
      row.addEventListener('pointerenter', onEnter);
      row.addEventListener('pointerleave', hide);
      bound.push([row, 'pointerenter', onEnter], [row, 'pointerleave', hide]);
    }
    list.addEventListener('pointermove', move);
    // Menggulir halaman memindahkan baris di bawah kursor tanpa gerak mouse; sembunyikan agar tidak tertinggal.
    window.addEventListener('scroll', hide, { passive: true });

    cleanups.push(() => {
      io.disconnect();
      cancelAnimationFrame(raf);
      for (const [el, type, fn] of bound) el.removeEventListener(type, fn);
      list.removeEventListener('pointermove', move);
      window.removeEventListener('scroll', hide);
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
