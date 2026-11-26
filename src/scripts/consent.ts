// Persetujuan cookie (banner + dialog Preferensi Cookie). Markup: src/components/consent/ConsentBanner.astro.
//
// Pilihan disimpan di cookie pihak pertama `arj_consent` (JSON kecil, di-encodeURIComponent):
//   { v: <versi>, t: <epoch ms>, c: { analytics: bool, booking: bool } }   ("necessary" selalu aktif, tidak disimpan)
// SameSite=Lax, Path=/, Max-Age 182 hari (sekitar 6 bulan), Secure bila halaman dimuat lewat HTTPS.
// Pilihan dengan versi berbeda atau lebih tua dari masa berlaku dianggap tidak ada (banner muncul lagi).
//
// API untuk skrip lain (mis. analitik nanti; saat ini TIDAK ada pelacak yang dimuat):
//   window.arjConsent.get()   -> { version, timestamp, categories: { necessary, analytics, booking } } | null
//   window.arjConsent.open()  -> membuka dialog Preferensi Cookie
//   window 'arj:consent'      -> CustomEvent (detail = hasil get()) setiap kali pengunjung menyimpan pilihan
// Skrip analitik harus membaca get() saat mulai dan memuat pelacak hanya bila categories.analytics === true.
//
// Tautan atau tombol mana pun dengan atribut `data-open-consent` membuka dialog preferensi; begitu juga
// alamat dengan hash #preferensi-cookie.
import {
  CONSENT_CATEGORIES,
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  CONSENT_VERSION,
} from '../components/consent/config';

export interface ConsentCategories {
  necessary: true;
  analytics: boolean;
  booking: boolean;
}
export interface ConsentState {
  version: number;
  timestamp: number;
  categories: ConsentCategories;
}

declare global {
  interface Window {
    arjConsent: { get: () => ConsentState | null; open: () => void };
  }
  interface WindowEventMap {
    'arj:consent': CustomEvent<ConsentState>;
  }
}

function readCookie(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

function get(): ConsentState | null {
  const raw = readCookie();
  if (!raw) return null;
  try {
    const s = JSON.parse(decodeURIComponent(raw)) as {
      v?: unknown;
      t?: unknown;
      c?: Record<string, unknown>;
    };
    if (s.v !== CONSENT_VERSION || typeof s.t !== 'number') return null;
    if (Date.now() - s.t >= CONSENT_MAX_AGE * 1000) return null;
    return {
      version: s.v,
      timestamp: s.t,
      categories: {
        necessary: true,
        analytics: s.c?.analytics === true,
        booking: s.c?.booking === true,
      },
    };
  } catch {
    return null;
  }
}

function save(choice: { analytics: boolean; booking: boolean }): ConsentState {
  const payload = {
    v: CONSENT_VERSION,
    t: Date.now(),
    c: { analytics: choice.analytics, booking: choice.booking },
  };
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(payload))}; Path=/; Max-Age=${CONSENT_MAX_AGE}; SameSite=Lax${secure}`;
  const state = get() as ConsentState;
  window.dispatchEvent(new CustomEvent('arj:consent', { detail: state }));
  return state;
}

function init(): void {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  const dialog = document.querySelector<HTMLDialogElement>('[data-consent-dialog]');
  const status = document.querySelector<HTMLElement>('[data-consent-status]');
  if (!banner || !dialog) return;

  document.documentElement.classList.add('arj-js');
  const inputs = Array.from(
    dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name]'),
  );
  const optional = CONSENT_CATEGORIES.filter((c) => !c.locked).map((c) => c.id);
  let opener: HTMLElement | null = null;

  const announce = (msg: string) => {
    if (status) status.textContent = msg;
  };
  const syncBanner = () => {
    banner.hidden = get() !== null;
  };
  syncBanner();

  const choose = (all: boolean) => {
    save({ analytics: all, booking: all });
    syncBanner();
    announce(all ? 'Semua cookie diizinkan.' : 'Hanya cookie yang perlu yang aktif.');
  };

  function open(): void {
    if (dialog!.open) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const cur = get();
    inputs.forEach((i) => {
      i.checked = cur ? cur.categories[i.name as 'analytics' | 'booking'] === true : false;
    });
    document.documentElement.classList.add('cs-lock');
    dialog!.showModal();
  }

  function close(): void {
    if (dialog!.open) dialog!.close();
  }

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('cs-lock');
    // Kembalikan fokus ke pemicu; bila pemicunya sudah tersembunyi (banner), ke isi halaman.
    const target =
      opener && opener.isConnected && opener.getClientRects().length > 0 ? opener : null;
    if (target) target.focus();
    else {
      const main = document.querySelector<HTMLElement>('main');
      if (main) {
        if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }
    opener = null;
  });
  // Jebakan fokus: <dialog> modal membuat latar inert, tetapi Tab dari elemen terakhir bisa keluar ke UI peramban.
  // Putar fokus di dalam dialog agar urutan papan ketik tertutup (Esc tetap menutup lewat bawaan <dialog>).
  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled])',
      ),
    ).filter((el) => el.getClientRects().length > 0 || el.matches('input'));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  });
  // Klik di luar kotak (pada latar) menutup dialog.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });

  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => choose(true));
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => choose(false));
  dialog.querySelector('[data-consent-close]')?.addEventListener('click', close);
  dialog.querySelector('[data-consent-save]')?.addEventListener('click', () => {
    const choice = { analytics: false, booking: false };
    inputs.forEach((i) => {
      if (optional.includes(i.name as 'analytics' | 'booking'))
        choice[i.name as 'analytics' | 'booking'] = i.checked;
    });
    save(choice);
    syncBanner();
    announce('Preferensi cookie disimpan.');
    close();
  });

  document.addEventListener('click', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-open-consent]');
    if (!el) return;
    e.preventDefault();
    open();
  });
  const fromHash = () => {
    if (location.hash === '#preferensi-cookie') open();
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  window.arjConsent.open = open;
}

// get() tersedia segera (skrip lain boleh memanggilnya kapan saja); open() menyusul setelah markup siap.
window.arjConsent = { get, open: () => undefined };
init();
