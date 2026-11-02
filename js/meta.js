// Kategorien, Farben und kleine Helfer, die überall gebraucht werden.

export const CATS = {
  home: { label: 'Zuhause', long: 'Zuhause', ink: '#975E01', accent: '#FEB742' },
  out: { label: 'Unterwegs', long: 'Unterwegs & Organisation', ink: '#496E8F', accent: '#AFC4D6' },
  care: { label: 'Fürsorge', long: 'Fürsorge', ink: '#A75324', accent: '#E9B69A' },
  magic: { label: 'Magie', long: 'Magie & Rituale', ink: '#AA4A62', accent: '#C77F91' },
  wild: { label: 'Lebensereignis', long: 'Große Lebensereignisse', ink: '#AD4D2B', accent: '#D77D5D' },
  unicorn: { label: 'Freiraum', long: 'Persönlicher Freiraum', ink: '#766093', accent: '#A99ABD' },
};
export const CAT_ORDER = ['home', 'out', 'care', 'magic', 'wild', 'unicorn'];

// Name mit erlaubten Trennstellen (|) → für die Karte (weiches Trennzeichen) oder als reiner Text.
export const cardName = (n) => (n || '').replaceAll('|', '­');
export const plainName = (n) => (n || '').replaceAll('|', '');

export const isTrio = (c) => !!c.trio_owner;
export const ORIGINAL_URL = 'https://fairplaypolicy.org/the-cards';

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('de-AT', { day: 'numeric', month: 'numeric', year: 'numeric' });
}
