// Interaksi halaman Home (slideshow hero, panel destinasi, daftar Journal, karusel testimoni).
// Diport apa adanya dari prototipe Doop; animasi berbasis GSAP menyusul (lihat DS 18).

(function () {
  var $ = function (s, r) {
      return (r || document).querySelector(s);
    },
    $$ = function (s, r) {
      return Array.prototype.slice.call((r || document).querySelectorAll(s));
    };
  function scrollable() {
    return document.documentElement.scrollHeight > window.innerHeight + 80;
  }
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
    g.addEventListener('click', function () {
      hshow(i);
      clearInterval(ht);
      ht = setInterval(function () {
        hshow(hi + 1);
      }, 6000);
    });
  });
  var ht = setInterval(function () {
    hshow(hi + 1);
  }, 6000);
  /* 2. destinations: swaps on scroll (production: pinned like Kudanil); auto-plays when the page cannot scroll */
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
    b.addEventListener('click', function () {
      dgo(i);
      resetAuto();
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
    t.style.fontSize = x.t.length > 9 ? '112px' : '144px';
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
    ar.children[0].addEventListener('click', function () {
      dgo(di - 1);
      resetAuto();
    });
    ar.children[1].addEventListener('click', function () {
      dgo(di + 1);
      resetAuto();
    });
  }
  var da;
  function resetAuto() {
    clearInterval(da);
    da = setInterval(function () {
      if (!scrollable()) dgo(di + 1);
    }, 5200);
  }
  resetAuto();
  dgo(0);
  window.addEventListener(
    'scroll',
    function () {
      if (!scrollable()) return;
      var r = $('#dst').getBoundingClientRect(),
        vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var p = Math.min(0.999, Math.max(0, (vh - r.top) / (vh + r.height)));
      var n = Math.floor(p * D.length);
      if (n !== di) dgo(n);
    },
    { passive: true },
  );
  /* 3. parallax inside the A family affair images (Kudanil ParallaxImage, eased) */
  var L = $$('.fpx').map(function (e) {
    return { el: e, y: 0 };
  });
  (function tick() {
    var vh = window.innerHeight;
    L.forEach(function (o) {
      var b = o.el.parentElement.getBoundingClientRect();
      var p = (b.top + b.height / 2 - vh / 2) / (vh / 2 + b.height / 2);
      p = Math.max(-1, Math.min(1, p));
      var t = -p * 0.09 * b.height;
      o.y += (t - o.y) * 0.09;
      o.el.style.setProperty('--py', o.y.toFixed(2) + 'px');
    });
    requestAnimationFrame(tick);
  })();
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
      go(c + 1);
    }, 8000);
  }
  document.getElementById('tprev').addEventListener('click', function () {
    go(c - 1);
    auto();
  });
  document.getElementById('tnext').addEventListener('click', function () {
    go(c + 1);
    auto();
  });
  auto();
})();
