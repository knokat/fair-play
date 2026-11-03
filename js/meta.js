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
export const ORIGINAL_URL = 'https://fairplaypolicy.org/the-cards/';

// Direkte Links auf die Originalkarten (fairplaypolicy.org/the-cards/<slug>/).
const ORIG_SLUG = {
  H1: 'childcare-helpers-kids', H2: 'cleaning', H3: 'dishes', H4: 'dry-cleaning', H5: 'garbage', H6: 'groceries',
  H7: 'home-furnishings', H8: 'home-goods-supplies', H9: 'home-maintenance', H10: 'home-purchase-rental-mortgage-insurance',
  H11: 'hosting', H12: 'laundry', H13: 'lawn-plants', H14: 'mail', H15: 'meals-weekday-breakfast', H16: 'meals-kids-school-lunch',
  H17: 'meals-weekday-dinner', H18: 'meals-weekend', H19: 'memories-photos', H20: 'money-manager',
  H21: 'storage-garage-seasonal-items', H22: 'tidying-up-organizing-donations',
  O1: 'auto', O2: 'birthday-celebrations-other-kids', O3: 'calendar-keeper', O4: 'cash-bills',
  O5: 'charity-community-service-good-deeds', O6: 'civic-engagement-cultural-enrichment', O7: 'electronics-it',
  O8: 'extracurricular-kids-non-sports', O9: 'extracurricular-kids-sports', O10: 'first-aid-safety-emergency',
  O11: 'packing-unpacking-kids-local', O12: 'packing-unpacking-travel', O13: 'points-miles-coupons', O14: 'returns-store-credit',
  O15: 'school-breaks-kids-non-summer', O16: 'school-breaks-kids-summer', O17: 'school-forms-kids', O18: 'social-plans-couples',
  O19: 'transportation-kids', O20: 'travel', O21: 'tutoring-coaching', O22: 'weekend-plans',
  C1: 'bathing-grooming-kids', C2: 'grooming-wardrobe-player-1', C3: 'bedtime-routine-kids', C4: 'family-planning-birth-control',
  C5: 'clothes-accessories-kids', C6: 'dental-kids', C7: 'diapering-potty-training-kids', C8: 'estate-planning-life-insurance',
  C9: 'friendship-social-media-kids', C10: 'grooming-wardrobe-player-2', C11: 'health-insurance',
  C12: 'homework-projects-school-supplies-kids', C13: 'medical-healthy-living-kids', C14: 'morning-routine', C15: 'parents-in-laws',
  C16: 'pets', C17: 'school-service-kids', C18: 'school-transitions-kids', C19: 'self-care-player-1', C20: 'self-care-player-2',
  C21: 'special-needs-mental-health-kids', C22: 'teacher-communication-kids',
  M1: 'adult-friendships-player-1', M2: 'adult-friendships-player-2', M3: 'birthday-celebration-your-kids',
  M4: 'discipline-screen-time-kids', M5: 'extended-family', M6: 'fun-playing-kids', M7: 'gestures-of-love-kids', M8: 'gifts-family',
  M9: 'gifts-vip', M10: 'hard-question-kids', M11: 'holiday-cards', M12: 'holidays', M13: 'informal-education-kids',
  M14: 'magical-beings-kids', M15: 'marriage-romance', M16: 'middle-of-the-night-comfort-kids', M17: 'partner-coach',
  M18: 'showing-up-participating-kids', M19: 'spirituality', M20: 'thank-you-notes', M21: 'values-good-deeds-kids', M22: 'watching-kids',
  W1: 'agingailing-parent', W2: 'death', W3: 'first-year-of-infants-life', W4: 'glitch-in-the-matrix-daily-disruption',
  W5: 'home-renovation', W6: 'job-less-money-problems', W7: 'moving', W8: 'new-job', W9: 'welcoming-a-child-into-the-home',
  W10: 'serious-illness', U1: 'unicorn-space-player-1', U2: 'unicorn-space-player-2',
};
export const origUrl = (card) => ORIGINAL_URL + (ORIG_SLUG[card.id] ? ORIG_SLUG[card.id] + '/' : '');

// Gruppen auf dem Parkplatz, in Anzeigereihenfolge (null = noch nicht einsortiert).
export const PARK_GROUPS = [
  { key: 'soon', label: 'Bald ins Deck', hint: 'Holen wir demnächst zurück.' },
  { key: 'later', label: 'Kommt wieder', hint: 'Gerade nicht dran, wird aber wieder wichtig.' },
  { key: 'open', label: 'Noch besprechen', hint: 'Hier sind wir uns noch nicht sicher.' },
  { key: null, label: 'Noch nicht einsortiert', hint: '' },
  { key: 'never', label: 'Betrifft uns nicht', hint: 'Brauchen wir voraussichtlich nie.' },
];
export const parkGroupLabel = (k) => (PARK_GROUPS.find((g) => g.key === (k || null)) || {}).label || '';

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
