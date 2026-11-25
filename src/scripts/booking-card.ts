// Kartu pemesanan di Trip Detail: pilih jadwal, atur jumlah peserta, pratinjau harga, dan tautan "Lanjut booking".
// Peningkatan progresif: markup sudah benar dari server; skrip ini hanya membuatnya interaktif. Pratinjau
// memakai `calcPrice` yang sama dengan server, tetapi yang disimpan tetap hasil hitung server saat pembayaran dimulai
// (harga, total, DP, dan kuota tidak pernah dipercaya dari klien).
import { calcPrice } from '../features/pricing/pricing';
import { formatRupiah } from '../lib/format';

const card = document.querySelector<HTMLElement>('.td-book[data-slug]');

if (card) {
  const slug = card.dataset.slug!;
  const dpPercent = Number(card.dataset.dp);
  const maxParticipants = Number(card.dataset.max);
  const threshold = Number(card.dataset.threshold);

  const rows = [...card.querySelectorAll<HTMLElement>('.td-sched[data-id]')];
  const minus = card.querySelector<HTMLButtonElement>('[data-qty="minus"]');
  const plus = card.querySelector<HTMLButtonElement>('[data-qty="plus"]');
  const nEl = card.querySelector<HTMLElement>('[data-qty-n]');
  const quota = card.querySelector<HTMLElement>('[data-quota]');
  const quotaText = card.querySelector<HTMLElement>('[data-quota-text]');
  const link = card.querySelector<HTMLAnchorElement>('[data-book-link] a');
  const ps = (name: string) => card.querySelector<HTMLElement>(`[data-ps="${name}"]`);

  // Tanpa kontrol interaktif (mis. belum ada jadwal terbuka) tidak ada yang perlu dikerjakan.
  if (rows.length && minus && plus && nEl && quota && quotaText && link) {
    let selected = rows.find((r) => r.dataset.state === 'selected') ?? rows[0]!;
    let n = Number(nEl.textContent) || 1;

    const left = () => Number(selected.dataset.left);
    const cap = () => Math.max(1, Math.min(maxParticipants, left()));

    function render() {
      n = Math.min(Math.max(n, 1), cap());
      nEl!.textContent = String(n);
      minus!.disabled = n <= 1;
      plus!.disabled = n >= cap();

      const unit = Number(selected.dataset.price);
      const price = calcPrice({ unitPrice: unit, childPrice: null, adults: n, dpPercent });
      const line = price.lines[0]!;
      const label = ps('line-label');
      if (label) label.textContent = `${formatRupiah(line.unitPrice)} × ${line.qty} peserta`;
      const amount = ps('line-amount');
      if (amount) amount.textContent = formatRupiah(line.amount);
      const total = ps('total');
      if (total) total.textContent = formatRupiah(price.total);
      const dp = ps('dp');
      if (dp) dp.textContent = formatRupiah(price.dp);
      const balance = ps('balance');
      if (balance) balance.textContent = formatRupiah(price.balance);

      // Pesan kuota: sisa sedikit berwarna kuning, selain itu hijau (aturan sama dengan render server).
      const few = left() <= threshold;
      quota!.dataset.tone = few ? 'pending' : 'ok';
      quotaText!.textContent = few
        ? `Hanya tersisa ${left()} kursi untuk jadwal ini`
        : `Kuota tersedia untuk ${n} peserta`;

      link!.href = `/booking/${encodeURIComponent(slug)}/jadwal?jadwal=${encodeURIComponent(selected.dataset.id!)}&peserta=${n}`;
    }

    function select(row: HTMLElement) {
      if (row.dataset.state === 'full') return;
      for (const r of rows) {
        if (r.dataset.state === 'full') continue;
        const on = r === row;
        r.dataset.state = on ? 'selected' : 'idle';
        r.setAttribute('aria-checked', on ? 'true' : 'false');
      }
      selected = row;
      render();
    }

    for (const row of rows) {
      row.addEventListener('click', () => select(row));
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(row);
        }
      });
    }
    minus.addEventListener('click', () => {
      n -= 1;
      render();
    });
    plus.addEventListener('click', () => {
      n += 1;
      render();
    });

    render();
  }
}

// Bilah aksi lekat (tablet/mobile): disembunyikan selama kartu pemesanan sendiri terlihat di layar, supaya tidak
// ada dua tombol "pesan" bersamaan. Tanpa JS bilah tetap tampil (sticky di dalam alur, berhenti di atas footer).
const sticky = document.querySelector<HTMLElement>('[data-sticky]');
const bookArea = document.getElementById('pesan');
if (sticky && bookArea && 'IntersectionObserver' in window) {
  new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) sticky.setAttribute('data-hidden', '');
        else sticky.removeAttribute('data-hidden');
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  ).observe(bookArea);
}
