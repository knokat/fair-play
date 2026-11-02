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

// ---------- Check-in-Termin ----------
// day: 0 = Sonntag … 6 = Samstag (wie Date.getDay)
export const WEEKDAYS = [[1, 'Mo', 'Montag'], [2, 'Di', 'Dienstag'], [3, 'Mi', 'Mittwoch'], [4, 'Do', 'Donnerstag'], [5, 'Fr', 'Freitag'], [6, 'Sa', 'Samstag'], [0, 'So', 'Sonntag']];
export const dayName = (d) => (WEEKDAYS.find(([n]) => n === d) || [])[2] || '';

export function nextCheckin(setting, from = new Date()) {
  if (!setting || setting.day == null || !setting.time) return null;
  const [h, m] = setting.time.split(':').map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + ((setting.day - d.getDay() + 7) % 7));
  const end = new Date(d.getTime() + (setting.duration || 30) * 60000);
  if (end < from) d.setDate(d.getDate() + 7);
  return d;
}

export function fmtWhen(d) {
  if (!d) return '';
  const day = d.toLocaleDateString('de-AT', { weekday: 'short', day: 'numeric', month: 'numeric' });
  const t = d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${t}`;
}

export function daysUntil(d, from = new Date()) {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
}
