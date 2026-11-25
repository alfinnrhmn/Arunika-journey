/**
 * Penanda teks ringan untuk isi dokumen dan bantuan, diurai menjadi simpul teks (tanpa HTML mentah, jadi
 * tidak perlu `set:html` dan tidak ada celah injeksi):
 *   **tebal**   *miring*   [teks tautan](/jalur)
 * Tautan hanya diterima untuk jalur situs ("/...", "#...") atau https://; selain itu dibuang menjadi teks biasa.
 */
export type InlineNode =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'em'; text: string }
  | { kind: 'link'; text: string; href: string };

const TOKEN = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function safeHref(href: string): string | null {
  if (href.startsWith('/') && !href.startsWith('//')) return href;
  if (href.startsWith('#')) return href;
  if (/^https:\/\/[^\s]+$/.test(href)) return href;
  return null;
}

export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let last = 0;
  for (const m of source.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) nodes.push({ kind: 'text', text: source.slice(last, at) });
    if (m[1] !== undefined) nodes.push({ kind: 'strong', text: m[1] });
    else if (m[2] !== undefined) nodes.push({ kind: 'em', text: m[2] });
    else {
      const href = safeHref(m[4] ?? '');
      if (href) nodes.push({ kind: 'link', text: m[3] ?? '', href });
      else nodes.push({ kind: 'text', text: m[3] ?? '' });
    }
    last = at + m[0].length;
  }
  if (last < source.length) nodes.push({ kind: 'text', text: source.slice(last) });
  return nodes;
}

/** Teks polos tanpa penanda (untuk daftar isi, aria-label, dan <title>). */
export function stripInline(source: string): string {
  return parseInline(source)
    .map((n) => n.text)
    .join('');
}

/** Tautan ke `#preferensi-cookie` membuka dialog Preferensi Cookie (lihat src/scripts/consent.ts). */
export const CONSENT_HASH = '#preferensi-cookie';
