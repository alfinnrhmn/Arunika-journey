/** Kata bilangan untuk judul itinerary ("Dua hari, satu malam"); di atas sepuluh memakai angka. */
const WORDS = [
  'nol',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
];

export const word = (n: number): string => WORDS[n] ?? String(n);

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Judul itinerary dari durasi: bagian pertama polos, bagian kedua miring. */
export function itineraryHeading(days: number, nights: number): { lead: string; em: string } {
  const lead = `${cap(word(days))} hari, `;
  return { lead, em: nights > 0 ? `${word(nights)} malam` : 'tanpa menginap' };
}

/** Nomor WhatsApp admin: [diisi klien] sampai klien memberi nomor (digit saja, format internasional). */
export const WHATSAPP_NUMBER = '[diisi klien]';
export const whatsappHref: string | undefined = /^\d{8,15}$/.test(WHATSAPP_NUMBER)
  ? `https://wa.me/${WHATSAPP_NUMBER}`
  : undefined;
