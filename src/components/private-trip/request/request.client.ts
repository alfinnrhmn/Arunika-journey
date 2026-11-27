// Penyempurna progresif alur Request a Quote (/private-trip/request). Tanpa skrip ini kedua langkah tampil
// bertumpuk dan semua kontrol asli (kolom teks, select, angka) tetap bisa diisi. Dengan skrip ini:
//  - kedua langkah bergantian di satu halaman (`?langkah=2` untuk langkah 2; tombol kembali peramban bekerja),
//  - tujuan memakai chip, peserta memakai tombol +/-, durasi sinkron antara select (desktop) dan chip (layar kecil),
//  - validasi per bidang (saat meninggalkan kolom, lalu saat mengetik) dengan galat di tempat petunjuk,
//  - ringkasan langkah 1 di langkah 2.
// Semua data hidup hanya di DOM halaman ini: TIDAK dikirim ke mana pun dan tidak disimpan (tanpa storage, tanpa
// fetch). Titik sambungan tahap BE ada di komentar RequestStep2.astro.
import { partyLimits, step2 as c } from '../../../content/private-request';
import {
  checkAnak,
  checkCerita,
  checkDewasa,
  checkDurasi,
  checkEmail,
  checkEmail2,
  checkNama,
  checkTanggal,
  checkTelepon,
  formatPeserta,
  formatWaktu,
} from './validate';

type Step = 1 | 2;

function init(): void {
  const found = document.querySelector<HTMLElement>('.pr-page');
  if (!found) return;
  const page: HTMLElement = found;
  const min = page.dataset.min ?? '';
  const sections: Record<Step, HTMLElement> = {
    1: page.querySelector<HTMLElement>('#langkah-1')!,
    2: page.querySelector<HTMLElement>('#langkah-2')!,
  };
  const live = page.querySelector<HTMLElement>('[data-pr-live]');
  const $ = <T extends HTMLElement>(id: string) => page.querySelector<T>('#' + id)!;

  // Kontrol khusus JS tampil; padanan tanpa-JS disembunyikan.
  page.querySelectorAll<HTMLElement>('[data-pr-js]').forEach((el) => (el.hidden = false));
  page.querySelectorAll<HTMLElement>('[data-pr-nojs]').forEach((el) => (el.hidden = true));

  const announce = (msg: string) => {
    if (!live) return;
    live.textContent = '';
    window.setTimeout(() => (live.textContent = msg), 30);
  };

  // ---------- Tujuan: chip + kolom cari ----------
  const dq = $<HTMLInputElement>('pr-tujuan');
  const chipsBox = page.querySelector<HTMLElement>('[data-pr-chips]')!;
  const addBtn = page.querySelector<HTMLButtonElement>('[data-pr-add]')!;
  const chipOf = (name: string) =>
    Array.from(chipsBox.querySelectorAll<HTMLButtonElement>('.pr-chip')).find(
      (b) => b.dataset.name?.toLowerCase() === name.toLowerCase(),
    );
  const selectedDest = () =>
    Array.from(chipsBox.querySelectorAll<HTMLButtonElement>('.pr-chip[aria-pressed="true"]')).map(
      (b) => b.dataset.name ?? '',
    );
  const setChip = (b: HTMLButtonElement, on: boolean) => b.setAttribute('aria-pressed', String(on));
  function toggleDest(name: string, force?: boolean): void {
    let b = chipOf(name);
    if (!b) {
      b = document.createElement('button');
      b.type = 'button';
      b.className = 'pr-chip';
      b.dataset.name = name;
      b.setAttribute('aria-pressed', 'false');
      b.textContent = name;
      chipsBox.insertBefore(b, chipsBox.querySelector('[data-unsure]'));
    }
    const on = force ?? b.getAttribute('aria-pressed') !== 'true';
    const unsure = b.hasAttribute('data-unsure');
    if (on) {
      chipsBox.querySelectorAll<HTMLButtonElement>('.pr-chip').forEach((o) => {
        if (o !== b && (unsure || o.hasAttribute('data-unsure'))) {
          setChip(o, false);
          if (!o.hasAttribute('data-builtin')) o.remove();
        }
      });
    }
    setChip(b, on);
    // Chip tambahan sendiri yang dilepas dihapus; saran bawaan tetap ada.
    if (!on && !b.hasAttribute('data-builtin')) b.remove();
    announce(`${name} ${on ? 'dipilih' : 'dilepas'}.`);
  }
  chipsBox.querySelectorAll<HTMLButtonElement>('.pr-chip').forEach((b) => {
    b.setAttribute('data-builtin', '');
  });
  chipsBox.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('.pr-chip');
    if (b?.dataset.name) toggleDest(b.dataset.name);
  });
  function filterChips(): void {
    const v = dq.value.trim().toLowerCase();
    chipsBox.querySelectorAll<HTMLButtonElement>('.pr-chip').forEach((b) => {
      const hit =
        !v ||
        b.getAttribute('aria-pressed') === 'true' ||
        (b.dataset.name ?? '').toLowerCase().includes(v);
      b.hidden = !hit;
    });
    addBtn.hidden = !v;
  }
  function addTyped(): void {
    const v = dq.value.trim().replace(/\s+/g, ' ');
    if (!v) return;
    const known = chipOf(v);
    toggleDest(known?.dataset.name ?? v, true);
    dq.value = '';
    filterChips();
  }
  dq.addEventListener('input', filterChips);
  dq.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTyped();
    }
  });
  addBtn.addEventListener('click', addTyped);
  filterChips();

  // ---------- Durasi: select (desktop) dan chip radio (layar kecil) saling sinkron ----------
  const durSel = $<HTMLSelectElement>('pr-durasi');
  const durRadios = Array.from(
    page.querySelectorAll<HTMLInputElement>('[data-pr-dur] input[type="radio"]'),
  );
  durSel.addEventListener('change', () => {
    durRadios.forEach((r) => (r.checked = r.value === durSel.value));
  });
  durRadios.forEach((r) =>
    r.addEventListener('change', () => {
      durSel.value = r.value;
      touch('durasi');
    }),
  );

  // ---------- Peserta: tombol +/- ----------
  const dewasa = $<HTMLInputElement>('pr-dewasa');
  const anak = $<HTMLInputElement>('pr-anak');
  function clampCount(el: HTMLInputElement, lo: number, hi: number): void {
    const n = parseInt(el.value, 10);
    el.value = String(Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo);
  }
  page.querySelectorAll<HTMLElement>('[data-pr-count]').forEach((box) => {
    const input = box.querySelector<HTMLInputElement>('.cv')!;
    const isAdult = box.dataset.prCount === 'dewasa';
    const [lo, hi] = isAdult
      ? [partyLimits.adultMin, partyLimits.adultMax]
      : [partyLimits.childMin, partyLimits.childMax];
    const sync = () => {
      const n = parseInt(input.value, 10);
      const minus = box.querySelector<HTMLButtonElement>('[data-pr-step="-1"]');
      const plus = box.querySelector<HTMLButtonElement>('[data-pr-step="1"]');
      if (minus) minus.disabled = !(n > lo);
      if (plus) plus.disabled = !(n < hi);
    };
    box.querySelectorAll<HTMLButtonElement>('[data-pr-step]').forEach((b) =>
      b.addEventListener('click', () => {
        const n = parseInt(input.value, 10);
        input.value = String((Number.isFinite(n) ? n : lo) + Number(b.dataset.prStep));
        clampCount(input, lo, hi);
        sync();
        touch('peserta');
      }),
    );
    input.addEventListener('input', sync);
    input.addEventListener('change', () => {
      clampCount(input, lo, hi);
      sync();
    });
    sync();
  });

  // ---------- Validasi per bidang ----------
  interface Field {
    name: string;
    wrap: HTMLElement;
    controls: HTMLElement[];
    check: () => string;
  }
  const value = (id: string) => $<HTMLInputElement>(id).value;
  const fields: Record<Step, Field[]> = { 1: [], 2: [] };
  const add = (step: Step, name: string, ids: string[], check: () => string) => {
    const wrap = page.querySelector<HTMLElement>(`[data-pr-field="${name}"]`)!;
    const controls = ids.map((id) => $(id));
    fields[step].push({ name, wrap, controls, check });
  };
  add(1, 'tanggal', ['pr-tanggal'], () => checkTanggal(value('pr-tanggal'), min));
  add(1, 'durasi', ['pr-durasi'], () => checkDurasi(durSel.value));
  add(1, 'peserta', ['pr-dewasa', 'pr-anak'], () => {
    const d = checkDewasa(parseInt(dewasa.value, 10));
    return d || checkAnak(parseInt(anak.value, 10));
  });
  add(1, 'cerita', ['pr-cerita'], () => checkCerita(value('pr-cerita')));
  add(2, 'nama', ['pr-nama'], () => checkNama(value('pr-nama')));
  add(2, 'email', ['pr-email'], () => checkEmail(value('pr-email')));
  add(2, 'email2', ['pr-email2'], () => checkEmail2(value('pr-email2'), value('pr-email')));
  add(2, 'telepon', ['pr-telepon'], () => checkTelepon(value('pr-telepon')));

  const touched = new Set<string>();
  const byName = (n: string) => [...fields[1], ...fields[2]].find((f) => f.name === n)!;

  function show(f: Field, msg: string): void {
    const err = f.wrap.querySelector<HTMLElement>('.pr-err')!;
    const hint = f.wrap.querySelector<HTMLElement>('.pr-hint');
    const hintId = hint?.id;
    f.wrap.dataset.state = msg ? 'error' : 'default';
    err.hidden = !msg;
    err.textContent = msg;
    if (hint) hint.hidden = !!msg;
    const describedBy = msg ? err.id : hintId;
    const targets = f.wrap.tagName === 'FIELDSET' ? [f.wrap] : f.controls;
    targets.forEach((el) => {
      if (msg) el.setAttribute('aria-invalid', 'true');
      else el.removeAttribute('aria-invalid');
      if (describedBy) el.setAttribute('aria-describedby', describedBy);
      else el.removeAttribute('aria-describedby');
    });
    // Kontrol di dalam fieldset ikut ditandai agar galat terbaca di kolom yang difokuskan.
    if (f.wrap.tagName === 'FIELDSET') {
      f.controls.forEach((el) => {
        if (msg) el.setAttribute('aria-invalid', 'true');
        else el.removeAttribute('aria-invalid');
      });
    }
  }
  function touch(name: string): void {
    touched.add(name);
    const f = byName(name);
    show(f, f.check());
  }
  function revalidate(name: string): void {
    if (!touched.has(name)) return;
    const f = byName(name);
    show(f, f.check());
  }
  for (const f of [...fields[1], ...fields[2]]) {
    f.controls.forEach((el) => {
      el.addEventListener('blur', () => {
        // Pindah antar kontrol dalam satu kelompok (dewasa ke anak) tidak langsung menandai galat.
        window.setTimeout(() => {
          if (f.controls.some((o) => o === document.activeElement)) return;
          touch(f.name);
        }, 0);
      });
      el.addEventListener('input', () => revalidate(f.name));
      el.addEventListener('change', () => revalidate(f.name));
    });
  }
  // Email berubah: konfirmasi ikut diperiksa ulang bila sudah pernah disentuh.
  $<HTMLInputElement>('pr-email').addEventListener('input', () => revalidate('email2'));
  // Konfirmasi email: pesan "sudah sama" tidak dipakai sebagai galat; hanya beda atau kosong.

  function validateStep(step: Step): Field | null {
    let first: Field | null = null;
    for (const f of fields[step]) {
      touched.add(f.name);
      const msg = f.check();
      show(f, msg);
      if (msg && !first) first = f;
    }
    return first;
  }
  const stepOk = (step: Step) => fields[step].every((f) => !f.check());

  // ---------- Ringkasan ----------
  function fillSummary(): void {
    const dest = selectedDest();
    const typed = dq.value.trim();
    const list = typed ? [...dest, typed] : dest;
    const tujuan = list.length ? list.join(', ') : c.summary.blank;
    const waktu = formatWaktu(value('pr-tanggal'), $<HTMLInputElement>('pr-fleksibel').checked);
    const durOpt = durSel.selectedOptions[0]?.textContent?.trim() ?? '';
    const d = parseInt(dewasa.value, 10);
    const a = parseInt(anak.value, 10);
    const data: Record<string, string> = {
      tujuan,
      waktu: waktu || c.summary.blank,
      durasi: durSel.value ? durOpt : c.summary.blank,
      peserta: formatPeserta(Number.isFinite(d) ? d : 0, Number.isFinite(a) ? a : 0),
    };
    page.querySelectorAll<HTMLElement>('[data-pr-sum]').forEach((el) => {
      el.textContent = data[el.dataset.prSum ?? ''] ?? '';
    });
  }

  // ---------- Pindah langkah ----------
  const titles: Record<Step, string> = {
    1: document.title,
    2: `Langkah 2 dari 2: Data Anda | ${document.title.split('|').pop()?.trim() ?? 'Arunika Journey'}`,
  };
  let current: Step = 1;
  function goStep(step: Step, opts: { push?: boolean; focus?: boolean } = {}): void {
    current = step;
    page.dataset.step = String(step);
    sections[1].hidden = step !== 1;
    sections[2].hidden = step !== 2;
    document.title = titles[step];
    if (step === 2) fillSummary();
    if (opts.push) {
      const url = step === 2 ? '?langkah=2' : location.pathname;
      history.pushState({ step }, '', url);
    }
    if (opts.focus) {
      const h = sections[step].querySelector<HTMLElement>('.pr-h2');
      sections[step].scrollIntoView({ block: 'start' });
      // Di layar kecil judul .pr-h2 disembunyikan (diganti bilah kemajuan): fokus yang dikirim ke elemen
      // tersembunyi hilang, jadi pindahkan ke <section> langkah (namanya tetap dari aria-labelledby).
      const target = h && h.getClientRects().length > 0 ? h : sections[step];
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      announce(step === 2 ? c.progress : 'Langkah 1 dari 2');
    }
  }
  function next(): void {
    const bad = validateStep(1);
    if (bad) {
      const target =
        bad.controls.find((el) => el.getAttribute('aria-invalid') === 'true') ?? bad.controls[0]!;
      const n = fields[1].filter((f) => f.check()).length;
      announce(`${n} isian perlu diperbaiki.`);
      // Kolom tanggal/durasi di layar kecil: chip radio pertama menggantikan select yang tersembunyi.
      const visible = (el: HTMLElement) => el.getClientRects().length > 0;
      const focusEl = bad.name === 'durasi' && !visible(durSel) ? (durRadios[0] ?? durSel) : target;
      focusEl.focus();
      return;
    }
    goStep(2, { push: true, focus: true });
  }
  page.querySelector<HTMLButtonElement>('[data-pr-next]')!.addEventListener('click', next);
  page.querySelectorAll<HTMLElement>('[data-pr-prev]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      goStep(1, { push: true, focus: true });
    }),
  );
  // Tombol kembali di bilah aplikasi: di langkah 2 menuju langkah 1, di langkah 1 menuju landing.
  page.querySelector<HTMLElement>('[data-pr-back]')?.addEventListener('click', (e) => {
    if (current === 2) {
      e.preventDefault();
      goStep(1, { push: true, focus: true });
    }
  });
  window.addEventListener('popstate', () => {
    const want: Step = new URLSearchParams(location.search).get('langkah') === '2' ? 2 : 1;
    if (want === 2 && !stepOk(1)) {
      history.replaceState({ step: 1 }, '', location.pathname);
      goStep(1, { focus: false });
      return;
    }
    goStep(want, { focus: true });
  });

  // Awal: langkah 2 lewat tautan langsung hanya bila isian langkah 1 sudah sah (kosong berarti mulai dari 1).
  const wantsTwo = new URLSearchParams(location.search).get('langkah') === '2';
  if (wantsTwo && stepOk(1)) {
    goStep(2);
  } else {
    if (wantsTwo) history.replaceState({ step: 1 }, '', location.pathname);
    goStep(1);
  }

  // Konfirmasi email: petunjuk berganti "Email sudah sama." saat cocok (seperti frame), tanpa galat.
  const em2 = $<HTMLInputElement>('pr-email2');
  const em2Hint = $('pr-email2-hint');
  const em2Base = em2Hint.textContent ?? '';
  const em2Sync = () => {
    const same = !!em2.value && !checkEmail2(em2.value, value('pr-email'));
    em2Hint.textContent = same ? c.email2.ok : em2Base;
    if (same) em2Hint.dataset.ok = '';
    else delete em2Hint.dataset.ok;
  };
  em2.addEventListener('input', em2Sync);
  $<HTMLInputElement>('pr-email').addEventListener('input', em2Sync);

  // Dua kolom form tidak boleh mengirim lewat Enter (tidak ada tujuan kirim).
  page
    .querySelectorAll<HTMLFormElement>('form')
    .forEach((f) => f.addEventListener('submit', (e) => e.preventDefault()));
}

init();
