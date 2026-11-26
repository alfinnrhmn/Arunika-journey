// Peningkatan kecil untuk daftar Journal di mobile: rel chip topik bisa digulir ke samping, jadi chip yang
// sedang dipilih digulirkan ke tampilan agar tidak tersembunyi di luar layar. Tanpa skrip ini halaman tetap bekerja.
const rail = document.querySelector<HTMLElement>('[data-chips]');
const current = rail?.querySelector<HTMLElement>('[aria-current="true"]');
if (rail && current && rail.scrollWidth > rail.clientWidth) {
  const target = current.offsetLeft - (rail.clientWidth - current.offsetWidth) / 2;
  rail.scrollLeft = Math.max(0, target);
}
