/**
 * Peningkatan progresif alur booking (langkah 1 sampai 3). Seluruh alur berjalan tanpa berkas ini; di sini
 * hanya: pratinjau harga langsung, penghitung peserta, sakelar "Peserta 1 sama dengan pemesan", fokus ke
 * kesalahan pertama, dan mencegah klik ganda tombol bayar. Angka pratinjau memakai `calcPrice` (fungsi murni
 * yang sama dengan server); nilai yang disimpan dan ditagih tetap dihitung ulang server.
 */
import { calcPrice } from '../features/pricing/pricing';
import { formatRupiah } from '../lib/format';

const $ = <T extends Element>(root: ParentNode, sel: string) => root.querySelector<T>(sel);
const $$ = <T extends Element>(root: ParentNode, sel: string) =>
  Array.from(root.querySelectorAll<T>(sel));

const intOf = (v: string | undefined | null, fallback = 0) => {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

/** Isi rincian harga; hanya angka dan label tetap, jadi aman disusun sebagai HTML. */
function priceHtml(p: ReturnType<typeof calcPrice>): string {
  const lines = p.lines
    .map(
      (l) =>
        `<div class="row"><span>${formatRupiah(l.unitPrice)} × ${l.qty} ${l.label === 'Anak' ? 'anak' : 'peserta'}</span><span>${formatRupiah(l.amount)}</span></div>`,
    )
    .join('');
  return (
    `<div class="bf-ps-h">Rincian harga</div>${lines}` +
    `<div class="row"><span>Biaya tambahan</span><span>Tidak ada</span></div>` +
    `<div class="row total"><span>Total</span><strong>${formatRupiah(p.total)}</strong></div>` +
    `<div class="dp"><div class="row"><span>DP (${p.dpPercent}%)</span><strong>${formatRupiah(p.dp)}</strong></div>` +
    `<p>Sisa ${formatRupiah(p.balance)} dilunasi sesuai jadwal pelunasan [diisi klien].</p></div>`
  );
}

function setupPreview(form: HTMLFormElement) {
  const mode = form.dataset.bfMode;
  if (mode !== 'party' && mode !== 'replace') return;
  const dpPercent = intOf(form.dataset.dp, 30);
  const max = intOf(form.dataset.max, 8);
  const childRaw = form.dataset.childPrice ?? '';
  const childPrice = childRaw === '' ? null : intOf(childRaw);
  const summary = document.querySelector<HTMLElement>('[data-bf-summary]');
  const submit = $<HTMLButtonElement>(form, '[data-bf-submit]');
  const quota = $<HTMLElement>(form, '[data-bf-quota]');
  const adultsInput = $<HTMLInputElement>(form, 'input[name="peserta"]');
  const childrenInput = $<HTMLInputElement>(form, 'input[name="anak"]');
  const radios = $$<HTMLInputElement>(form, 'input[name="jadwal"]');

  const party = () => ({
    adults: intOf(adultsInput?.value, 1),
    children: intOf(childrenInput?.value, 0),
  });

  function update() {
    const checked = radios.find((r) => r.checked);
    const { adults, children } = party();
    const seats = adults + children;
    const valid = adults >= 1 && children >= 0 && seats <= max;
    // Counter: tombol kurang/tambah mengikuti batas jumlah total.
    for (const box of $$<HTMLElement>(form, '[data-bf-count]')) {
      const input = $<HTMLInputElement>(box, 'input')!;
      const [minus, plus] = $$<HTMLButtonElement>(box, '[data-bf-step]');
      const min = intOf(input.min, 0);
      if (minus) minus.disabled = intOf(input.value) <= min;
      if (plus) plus.disabled = seats >= max;
    }
    if (!checked) {
      if (submit) submit.disabled = true;
      return;
    }
    const left = intOf(checked.dataset.left);
    const date = checked.dataset.date ?? '';
    const over = seats > left;
    if (quota) {
      quota.dataset.tone = over ? 'error' : 'ok';
      const text = $<HTMLElement>(quota, '[data-bf-quota-text]');
      if (text) {
        text.textContent = over
          ? `Anda memilih ${seats} peserta, tetapi hanya tersisa ${left} kursi pada ${date}.`
          : `Kuota tersedia untuk ${seats} peserta pada ${date} (sisa ${left} kursi). Kuota dikunci saat pembayaran dimulai.`;
      }
    }
    if (submit) {
      submit.disabled = over || !valid;
      if (mode === 'replace') {
        const label = $<HTMLElement>(submit, '[data-bf-label]');
        if (label) label.textContent = `Lanjut dengan ${date}`;
      }
    }
    if (summary) {
      const dateEl = $<HTMLElement>(summary, '[data-bf-sum-date]');
      if (dateEl) dateEl.textContent = date;
      const partyEl = $<HTMLElement>(summary, '[data-bf-sum-party]');
      if (partyEl) {
        partyEl.textContent =
          children > 0 ? `${adults} dewasa, ${children} anak` : `${adults} dewasa`;
      }
      const priceEl = $<HTMLElement>(summary, '[data-bf-price]');
      if (priceEl && valid) {
        try {
          priceEl.innerHTML = priceHtml(
            calcPrice({
              unitPrice: intOf(checked.dataset.price),
              childPrice,
              adults,
              children,
              dpPercent,
            }),
          );
        } catch {
          /* masukan di luar batas: biarkan rincian terakhir, server yang memutuskan */
        }
      }
    }
  }

  // Tombol bulat: ubah angka lalu hitung ulang; klik terhadap input sendiri tidak diperlukan.
  form.addEventListener('click', (e) => {
    const btn = (e.target as Element).closest<HTMLButtonElement>('[data-bf-step]');
    if (!btn || btn.disabled) return;
    const box = btn.closest<HTMLElement>('[data-bf-count]');
    const input = box && $<HTMLInputElement>(box, 'input');
    if (!input) return;
    const min = intOf(input.min, 0);
    const next = intOf(input.value) + intOf(btn.dataset.bfStep);
    const { adults, children } = party();
    const total = adults + children + intOf(btn.dataset.bfStep);
    if (next < min || total > max) return;
    input.value = String(next);
    update();
  });
  form.addEventListener('change', update);
  form.addEventListener('input', update);
  update();
}

/** Sakelar "Peserta 1 sama dengan pemesan": menyalin nama pemesan ke peserta 1 selama menyala. */
function setupSameAsBooker(form: HTMLFormElement) {
  const label = $<HTMLElement>(form, '[data-bf-same]');
  const toggle = label && $<HTMLInputElement>(label, 'input');
  const booker = $<HTMLInputElement>(form, '#f-nama');
  const first = $<HTMLInputElement>(form, '[data-bf-person-name]');
  if (!label || !toggle || !booker || !first) return;
  label.hidden = false;
  const norm = (s: string) => s.trim().toLowerCase();
  // Menyala dari awal bila peserta 1 masih kosong atau sudah sama dengan pemesan.
  toggle.checked = first.value.trim() === '' || norm(first.value) === norm(booker.value);
  const hint = document.getElementById(`${first.id}-note`);
  const originalHint = hint?.textContent ?? '';
  const apply = () => {
    first.readOnly = toggle.checked;
    if (toggle.checked) first.value = booker.value;
    if (hint && first.getAttribute('aria-invalid') !== 'true') {
      hint.textContent = toggle.checked ? 'Terisi otomatis dari data pemesan.' : originalHint;
    }
  };
  toggle.addEventListener('change', apply);
  booker.addEventListener('input', () => {
    if (toggle.checked) first.value = booker.value;
  });
  apply();
}

/** Fokus ke isian bermasalah pertama (atau kotak pemberitahuan) setelah server merender ulang halaman. */
function focusFirstProblem() {
  const alert = document.querySelector<HTMLElement>('[data-bf-alert]');
  if (!alert) return;
  const invalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
  const target = invalid ?? alert;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'center', behavior: 'auto' });
}

/** Satu kali kirim: tombol dimatikan sesaat setelah klik agar klik ganda tidak membuat dua permintaan. */
function setupSingleSubmit(form: HTMLFormElement) {
  if (form.dataset.bfMode !== 'pay') return;
  form.addEventListener('submit', () => {
    const btn = $<HTMLButtonElement>(form, '[data-bf-submit]');
    if (!btn) return;
    // Ditunda satu giliran supaya pengiriman form tetap berjalan.
    setTimeout(() => {
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
    });
  });
}

function init() {
  for (const form of $$<HTMLFormElement>(document, 'form[data-bf-form]')) {
    setupPreview(form);
    setupSameAsBooker(form);
    setupSingleSubmit(form);
  }
  focusFirstProblem();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// Tombol Kembali browser memulihkan halaman dari cache: hitung ulang pratinjau dari nilai form yang dipulihkan.
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  for (const form of $$<HTMLFormElement>(document, 'form[data-bf-form]')) {
    form.dispatchEvent(new Event('change'));
    // Halaman bayar yang dipulihkan setelah Kembali: tombol boleh dipakai lagi.
    const pay = $<HTMLButtonElement>(form, '[data-bf-submit]');
    if (pay && form.dataset.bfMode === 'pay') {
      pay.disabled = false;
      pay.removeAttribute('aria-busy');
    }
  }
});
