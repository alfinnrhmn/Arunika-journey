// Interaksi halaman Home (slideshow hero, panel destinasi, daftar Journal, karusel testimoni).
// Diport dari prototipe Doop. Bagian desktop (slideshow, destinasi, testimoni besar) tampil di mobile (< 768) dan
// desktop (>= 1280); di tablet 768-1279 bagian itu disembunyikan (kelas hd) dan timernya tidur, jadi tidak ada
// kerja latar yang menguras baterai. Parallax foto hanya di >= 1280 (di mobile fotonya diam, hemat baterai).
// Karusel ulasan tablet ada di blok terakhir.

/* Kontrol berupa <div>/<span> (bilah destinasi, panah, daftar jenis trip, segmen hero) dibuat dapat dipakai papan ketik:
   role=button, tabindex=0, label, Enter dan Spasi sama dengan klik. */
function kbd(el, label) {
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  if (label) el.setAttribute('aria-label', label);
  el.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      el.click();
    }
  });
}

(function () {
  var $ = function (s, r) {
      return (r || document).querySelector(s);
    },
    $$ = function (s, r) {
      return Array.prototype.slice.call((r || document).querySelectorAll(s));
    },
    // Tampilan bagian desktop (mobile dan desktop), dan khusus desktop lebar (parallax).
    show = window.matchMedia('(max-width: 767px), (min-width: 1280px)'),
    wide = window.matchMedia('(min-width: 1280px)');
  function setText(box, txt) {
    var w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT),
      n;
    while ((n = w.nextNode())) {
      if (n.nodeValue.trim()) {
        n.nodeValue = txt;
        return;
      }
    }
  }
  function restart(el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }
  /* 1. hero slideshow: wipe + slow zoom-out, auto advance, segment bar */
  var hs = $$('.hslide'),
    hseg = $$('.hseg'),
    hnames = ['Yogyakarta', 'Bromo', 'Dieng', 'Karimunjawa'],
    hi = 0;
  function hshow(n) {
    var p = hi;
    hi = (n + hs.length) % hs.length;
    hs.forEach(function (s, i) {
      s.classList.remove('on', 'prev');
      if (i === hi) s.classList.add('on');
      else if (i === p && p !== hi) s.classList.add('prev');
    });
    hseg.forEach(function (g, i) {
      g.classList.remove('run', 'done');
      if (i < hi) g.classList.add('done');
      if (i === hi) {
        void g.offsetWidth;
        g.classList.add('run');
      }
    });
    $('#hlabel').textContent = hnames[hi];
    $('#hnum').textContent = '0' + (hi + 1) + ' / 0' + hs.length;
  }
  hseg.forEach(function (g, i) {
    kbd(g, 'Slide ' + (i + 1) + ': ' + hnames[i]);
    g.addEventListener('click', function () {
      hshow(i);
      clearInterval(ht);
      ht = setInterval(hnext, 6000);
    });
  });
  function hnext() {
    if (show.matches) hshow(hi + 1);
  }
  var ht = setInterval(hnext, 6000);
  /* 2. destinations: pindah otomatis saat bar progres penuh (animationend); jeda saat section di luar layar */
  var D = [
    {
      t: 'Bromo',
      d: 'Matahari terbit di atas lautan kabut, jip 4×4 melintasi lautan pasir, dan kawah yang masih mengepulkan asap.',
      b: 'Lihat trip ke Bromo',
    },
    {
      t: 'Dieng',
      d: 'Kabut pagi di dataran tinggi, candi tua, dan telaga berwarna yang paling indah sebelum siang.',
      b: 'Lihat trip ke Dieng',
    },
    {
      t: 'Yogyakarta',
      d: 'Candi, keraton, dan pasar pagi. Kota yang paling enak dijelajahi dengan langkah pelan.',
      b: 'Lihat trip ke Yogyakarta',
    },
    {
      t: 'Karimunjawa',
      d: 'Gugusan pulau dengan laut tenang, snorkeling di terumbu dangkal, dan senja di dermaga kayu.',
      b: 'Lihat trip ke Karimunjawa',
    },
    {
      t: 'Ijen',
      d: 'Berjalan malam menuju api biru, lalu turun saat fajar mewarnai danau kawah.',
      b: 'Lihat trip ke Ijen',
    },
    {
      t: 'Lainnya',
      d: 'Rute kami terus bertambah. Ceritakan tujuan Anda lewat Request a Quote dan kami susun proposalnya.',
      b: 'Request a Quote',
    },
  ];
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  var dbg = $$('.dbg'),
    dpan = $$('.dpan'),
    bar = $$('#dbar>div'),
    di = 0;
  bar.forEach(function (b, i) {
    b.style.position = 'relative';
    b.style.cursor = 'pointer';
    var f = document.createElement('i');
    f.className = 'dfill';
    b.appendChild(f);
    kbd(b, 'Destinasi ' + D[i].t);
    b.addEventListener('click', function () {
      dgo(i);
    });
    f.addEventListener('animationend', function () {
      // Bar penuh: lanjut ke destinasi berikutnya. Dengan "kurangi gerakan" animasi selesai seketika, jadi
      // tidak ada pergantian otomatis (hanya manual lewat bar dan panah).
      if (!calm.matches && i === di) dgo(di + 1);
    });
  });
  function dgo(n) {
    di = (n + D.length) % D.length;
    var x = D[di];
    dbg.forEach(function (e, i) {
      e.classList.toggle('on', i === di);
    });
    dpan.forEach(function (e, i) {
      e.classList.toggle('on', i === di);
    });
    bar.forEach(function (b, i) {
      var on = i === di;
      b.style.opacity = on ? '1' : '.6';
      b.style.paddingTop = on ? '14px' : '15px';
      b.style.borderTop = on
        ? '2px solid color-mix(in srgb,var(--color-paper) 30%,transparent)'
        : '1px solid color-mix(in srgb,var(--color-paper) 30%,transparent)';
      var f = b.querySelector('.dfill');
      f.classList.remove('run');
      if (on) {
        void f.offsetWidth;
        f.classList.add('run');
      }
    });
    $('#dcount').textContent = 'Destinasi · 0' + (di + 1) + ' dari 06';
    var t = $('#dtitle');
    t.textContent = x.t;
    t.classList.toggle('dlong', x.t.length > 9);
    restart(t, 'swap');
    var d = $('#ddesc');
    d.textContent = x.d;
    restart(d, 'swap2');
    setText($('#dbtn'), x.b);
    restart($('#dbtn'), 'swap2');
  }
  var ar = $('#darrows');
  if (ar) {
    ar.children[0].style.cursor = 'pointer';
    ar.children[1].style.cursor = 'pointer';
    kbd(ar.children[0], 'Destinasi sebelumnya');
    kbd(ar.children[1], 'Destinasi berikutnya');
    ar.children[0].addEventListener('click', function () {
      dgo(di - 1);
    });
    ar.children[1].addEventListener('click', function () {
      dgo(di + 1);
    });
  }
  /* Bar progres hanya berjalan saat section Destinasi terlihat; di luar layar dijeda. */
  var dst = $('#dst');
  dst.classList.add('dpaused');
  new IntersectionObserver(
    function (es) {
      dst.classList.toggle('dpaused', !es[0].isIntersecting);
    },
    { threshold: 0.4 },
  ).observe(dst);
  dgo(0);
  /* 3. parallax inside the A family affair images (Kudanil ParallaxImage, eased) */
  var L = $$('.fpx').map(function (e) {
    return { el: e, y: 0 };
  });
  // Loop hanya berjalan saat bagian desktop tampil (>= 1280px); di bawahnya berhenti dan menyala lagi bila
  // jendela diperlebar.
  var raf = 0;
  function tick() {
    if (!wide.matches) {
      raf = 0;
      return;
    }
    var vh = window.innerHeight;
    L.forEach(function (o) {
      var b = o.el.parentElement.getBoundingClientRect();
      var p = (b.top + b.height / 2 - vh / 2) / (vh / 2 + b.height / 2);
      p = Math.max(-1, Math.min(1, p));
      var t = -p * 0.09 * b.height;
      o.y += (t - o.y) * 0.09;
      o.el.style.setProperty('--py', o.y.toFixed(2) + 'px');
    });
    raf = requestAnimationFrame(tick);
  }
  function startParallax() {
    if (!raf && wide.matches) raf = requestAnimationFrame(tick);
  }
  wide.addEventListener('change', startParallax);
  startParallax();
})();

(function () {
  var it = Array.prototype.slice.call(document.querySelectorAll('.jit')),
    im = Array.prototype.slice.call(document.querySelectorAll('.jp')),
    cur = 0;
  function sel(n) {
    if (n === cur) return;
    var p = cur;
    cur = n;
    it.forEach(function (e, i) {
      e.classList.toggle('on', i === cur);
    });
    im.forEach(function (e, i) {
      e.classList.remove('on', 'prev');
      if (i === cur) e.classList.add('on');
      else if (i === p) e.classList.add('prev');
    });
  }
  it.forEach(function (e, i) {
    kbd(e);
    e.addEventListener('mouseenter', function () {
      sel(i);
    });
    e.addEventListener('click', function () {
      sel(i);
    });
  });
})();

(function () {
  var s = Array.prototype.slice.call(document.querySelectorAll('.tslide')),
    show = window.matchMedia('(max-width: 767px), (min-width: 1280px)'),
    c = 0,
    t;
  function go(n) {
    var p = c;
    c = (n + s.length) % s.length;
    if (c === p) return;
    s.forEach(function (e, i) {
      e.classList.remove('on', 'prev');
      if (i === c) e.classList.add('on');
      else if (i === p) e.classList.add('prev');
    });
    document.getElementById('tcur').textContent = c + 1;
  }
  function auto() {
    clearInterval(t);
    t = setInterval(function () {
      if (show.matches) go(c + 1);
    }, 8000);
  }
  function prev() {
    go(c - 1);
    auto();
  }
  function next() {
    go(c + 1);
    auto();
  }
  var bp = document.getElementById('tprev'),
    bn = document.getElementById('tnext');
  bp.addEventListener('click', prev);
  bn.addEventListener('click', next);
  // Tombol berupa <span role="button">: Enter dan Spasi bekerja seperti klik.
  [
    [bp, prev],
    [bn, next],
  ].forEach(function (p) {
    p[0].addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        p[1]();
      }
    });
  });
  // Geser jari pada kartu testimoni (mobile); kartu adalah tautan, jadi geseran tidak dianggap ketukan.
  var card = document.querySelector('.tm-card'),
    x0 = null;
  if (card) {
    card.addEventListener(
      'touchstart',
      function (e) {
        x0 = e.touches[0].clientX;
      },
      { passive: true },
    );
    card.addEventListener(
      'touchend',
      function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        x0 = null;
        if (Math.abs(dx) > 40) {
          if (e.cancelable) e.preventDefault();
          if (dx < 0) next();
          else prev();
        }
      },
      { passive: false },
    );
  }
  auto();
})();

/* Karusel ulasan untuk tablet 768-1279px (HomeCompact): satu kartu terlihat, tombol sebelumnya/berikutnya dan
   geser jari. Tanpa pergantian otomatis, jadi tidak ada gerakan yang tidak diminta pengguna. */
(function () {
  var root = document.querySelector('[data-rq]');
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-rq-slide]')),
    count = root.querySelector('[data-rq-count]'),
    stage = root.querySelector('.hc-rq-stage'),
    cur = 0;
  if (slides.length < 2) return;
  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }
  function go(n) {
    cur = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) {
      s.classList.toggle('on', i === cur);
      s.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
    });
    if (count) count.textContent = pad(cur + 1) + ' / ' + pad(slides.length);
  }
  root.querySelector('[data-rq-prev]').addEventListener('click', function () {
    go(cur - 1);
  });
  root.querySelector('[data-rq-next]').addEventListener('click', function () {
    go(cur + 1);
  });
  var x0 = null;
  stage.addEventListener(
    'touchstart',
    function (e) {
      x0 = e.touches[0].clientX;
    },
    { passive: true },
  );
  stage.addEventListener(
    'touchend',
    function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) go(cur + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );
})();
