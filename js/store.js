// Datenzugriff: Supabase, oder ohne Zugangsdaten ein Demo-Speicher im Browser.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;

let sb = null;
async function client() {
  if (!sb) {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return sb;
}

// ---------- Demo-Speicher ----------
const DEMO_KEY = 'fairplay-demo-v1';
const DEMO_PERSONS = [
  { id: 'p-k', name: 'Katja', initial: 'K', color: '#990F4B', role: 'adult', sort: 1 },
  { id: 'p-m', name: 'Matthias', initial: 'M', color: '#3B4C7A', role: 'adult', sort: 2 },
];
let demo = null;

async function loadDemo() {
  if (demo) return demo;
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null');
    if (saved && saved.cards) { demo = saved; return demo; }
  } catch (e) { /* kein Speicher verfügbar */ }
  const raw = await (await fetch('data/cards.json')).json();
  const pid = { K: 'p-k', M: 'p-m' };
  demo = {
    me: 'p-k',
    persons: DEMO_PERSONS,
    cards: raw.map((c, i) => ({
      id: c.id, sort: i + 1, cat: c.cat, orig: c.orig, name: c.name, is_dg: !!c.dg,
      trio_owner: c.trio ? pid[c.trio] : null,
      descr: c.desc || '', conception: c.c || '', planning: c.p || '', execution: c.e || '', msc: '',
      status: c.status, holder: c.trio ? pid[c.trio] : null, only_me: false,
      parked_note: c.note || '', img: c.img || null, updated_by: null, updated_at: null,
    })),
  };
  return demo;
}
function saveDemo() { try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)); } catch (e) { /* ok */ } }

// ---------- Anmeldung ----------
export async function getSession() {
  if (DEMO) return { demo: true };
  const { data } = await (await client()).auth.getSession();
  return data.session;
}
export async function signIn(email, password) {
  const { error } = await (await client()).auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === 'Invalid login credentials'
    ? 'E-Mail oder Passwort stimmt nicht.' : error.message);
}
export async function signOut() {
  if (DEMO) return;
  await (await client()).auth.signOut();
}
export async function onAuthChange(cb) {
  if (DEMO) return;
  (await client()).auth.onAuthStateChange((_e, session) => cb(session));
}

// ---------- Laden ----------
export async function loadAll() {
  if (DEMO) {
    const d = await loadDemo();
    return { persons: d.persons, cards: d.cards, meId: d.me };
  }
  const c = await client();
  const [{ data: persons, error: e1 }, { data: cards, error: e2 }, { data: user }] = await Promise.all([
    c.from('fp_person').select('*').order('sort'),
    c.from('fp_card').select('*').order('sort'),
    c.auth.getUser(),
  ]);
  if (e1 || e2) throw new Error((e1 || e2).message);
  const me = persons.find((p) => p.user_id === user.user?.id);
  if (!me) throw new Error('Dein Login ist noch keiner Person zugeordnet. Siehe README, Schritt 4.');
  return { persons, cards, meId: me.id };
}

export function setDemoMe(id) { if (demo) { demo.me = id; saveDemo(); } }

// ---------- Ändern ----------
async function patchCard(card, patch, events, meId) {
  const full = { ...patch, updated_by: meId, updated_at: new Date().toISOString() };
  if (DEMO) {
    Object.assign(demo.cards.find((x) => x.id === card.id), full);
    saveDemo();
    return;
  }
  const c = await client();
  const { error } = await c.from('fp_card').update(full).eq('id', card.id);
  if (error) throw new Error(error.message);
  if (events.length) await c.from('fp_card_event').insert(events.map((e) => ({ card_id: card.id, by_person: meId, ...e })));
}

export const setHolder = (card, personId, meId) =>
  patchCard(card, { holder: personId, ...(personId ? {} : { only_me: false }) },
    [{ action: 'dealt', from_person: card.holder, to_person: personId }], meId);

export const park = (card, note, meId) =>
  patchCard(card, { status: 'parked', holder: null, only_me: false, parked_note: note || '' },
    [{ action: 'parked', from_person: card.holder }], meId);

export const unpark = (card, meId) =>
  patchCard(card, { status: 'deck', holder: null }, [{ action: 'unparked' }], meId);

export const setOnlyMe = (card, value, meId) =>
  patchCard(card, { only_me: value }, [{ action: 'edited', field: 'only_me' }], meId);

export function updateTexts(card, patch, meId) {
  const changed = Object.keys(patch).filter((k) => (card[k] || '') !== (patch[k] || ''));
  if (!changed.length) return Promise.resolve();
  const p = {};
  changed.forEach((k) => { p[k] = patch[k]; });
  return patchCard(card, p, changed.map((f) => ({ action: 'edited', field: f })), meId);
}
