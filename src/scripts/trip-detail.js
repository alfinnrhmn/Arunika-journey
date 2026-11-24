// Tip foto itinerary: gambar kecil yang mengikuti kursor di atas daftar itinerary (#iti), diganti sesuai
// baris yang disorot (atribut data-img). Diport dari prototipe Doop; bagian peragaan (#demo) dibuang.
(function () {
  var zone = document.getElementById('iti');
  if (!zone) return;
  var tip = document.createElement('div');
  tip.id = 'tip';
  tip.innerHTML = '<img alt="">';
  document.body.appendChild(tip);
  var img = tip.querySelector('img');
  var mx = 0,
    my = 0,
    x = 0,
    y = 0,
    on = false;
  function loop() {
    var nx = x + (mx - x) * 0.14,
      ny = y + (my - y) * 0.14,
      vx = nx - x;
    x = nx;
    y = ny;
    var rot = Math.max(-14, Math.min(14, vx * 1.2));
    tip.style.transform =
      'translate(' + (x + 24) + 'px,' + (y - 120) + 'px) rotate(' + rot + 'deg)';
    requestAnimationFrame(loop);
  }
  zone.addEventListener('mousemove', function (e) {
    var row = e.target.closest('.td-iti-row');
    var src = row ? row.getAttribute('data-img') : null;
    mx = e.pageX;
    my = e.pageY;
    if (!on) {
      x = mx;
      y = my;
      on = true;
      loop();
    }
    tip.style.opacity = src ? 1 : 0;
    if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
  });
  zone.addEventListener('mouseleave', function () {
    tip.style.opacity = 0;
  });
})();
