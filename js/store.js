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
      parked_note: c.note || '', park_group: c.group || null, img: c.img || null, updated_by: null, updated_at: null,
    })),
  };
  return demo;
}
function demoExtras(d) {
  d.settings = d.settings || {};
  d.steps = d.steps || [1, 2, 3, 4, 5, 6, 7, 8].map((step) => ({ step, done_at: step === 1 ? '2026-11-01T19:00:00Z' : null, done_by: null, confirmed: {} }));
  d.notes = d.notes || [];
  d.checkins = d.checkins || [];
  d.events = d.events || [];
  return d;
}
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const nowIso = () => new Date().toISOString();

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
    const d = demoExtras(await loadDemo());
    const settings = {};
    Object.entries(d.settings).forEach(([k, v]) => { settings[k] = v; });
    return {
      persons: d.persons, cards: d.cards, meId: d.me, settings, steps: d.steps,
      notes: d.notes.filter((n) => n.author === d.me), checkins: d.checkins,
    };
  }
  const c = await client();
  const [r1, r2, { data: user }, r3, r4, r5, r6] = await Promise.all([
    c.from('fp_person').select('*').order('sort'),
    c.from('fp_card').select('*').order('sort'),
    c.auth.getUser(),
    c.from('fp_setting').select('*'),
    c.from('fp_step').select('*').order('step'),
    c.from('fp_note').select('*').order('created_at', { ascending: false }),
    c.from('fp_checkin').select('*').order('started_at', { ascending: false }),
  ]);
  const err = [r1, r2, r3, r4, r5, r6].find((r) => r.error);
  if (err) throw new Error(err.error.message);
  const persons = r1.data;
  const me = persons.find((p) => p.user_id === user.user?.id);
  if (!me) throw new Error('Dein Login ist noch keiner Person zugeordnet. Siehe README, Schritt 4.');
  const settings = {};
  r3.data.forEach((row) => { settings[row.key] = row.value; });
  return { persons, cards: r2.data, meId: me.id, settings, steps: r4.data, notes: r5.data, checkins: r6.data };
}

export function setDemoMe(id) { if (demo) { demo.me = id; saveDemo(); } }

// ---------- Ändern ----------
async function patchCard(card, patch, events, meId) {
  const full = { ...patch, updated_by: meId, updated_at: new Date().toISOString() };
  if (DEMO) {
    Object.assign(demo.cards.find((x) => x.id === card.id), full);
    demoExtras(demo).events.push(...events.map((e) => ({ card_id: card.id, by_person: meId, at: nowIso(), ...e })));
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

export function park(card, note, group, meId) {
  const info = { parked_note: note || '', park_group: group || null };
  if (card.status === 'parked') {
    const changed = Object.keys(info).filter((k) => (card[k] || null) !== (info[k] || null));
    if (!changed.length) return Promise.resolve();
    return patchCard(card, info, changed.map((f) => ({ action: 'edited', field: f })), meId);
  }
  return patchCard(card, { status: 'parked', holder: null, only_me: false, ...info },
    [{ action: 'parked', from_person: card.holder }], meId);
}

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

// ---------- Verlauf ----------
export async function loadEvents(since) {
  if (DEMO) return demoExtras(demo).events.filter((e) => !since || e.at > since);
  const c = await client();
  let q = c.from('fp_card_event').select('*').order('at');
  if (since) q = q.gt('at', since);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Einstellungen und Unser Weg ----------
export async function saveSetting(key, value, meId) {
  if (DEMO) { demoExtras(demo).settings[key] = value; saveDemo(); return; }
  const { error } = await (await client()).from('fp_setting')
    .upsert({ key, value, updated_by: meId, updated_at: nowIso() });
  if (error) throw new Error(error.message);
}

export async function saveStep(step, patch) {
  if (DEMO) { Object.assign(demoExtras(demo).steps.find((s) => s.step === step), patch); saveDemo(); return; }
  const { error } = await (await client()).from('fp_step').update(patch).eq('step', step);
  if (error) throw new Error(error.message);
}

// ---------- Notizen (privat) ----------
export async function addNote(text, cardId, meId) {
  const row = { text, card_id: cardId || null, author: meId };
  if (DEMO) { demoExtras(demo).notes.unshift({ id: uid(), created_at: nowIso(), done_at: null, checkin_id: null, ...row }); saveDemo(); return; }
  const { error } = await (await client()).from('fp_note').insert(row);
  if (error) throw new Error(error.message);
}

export async function updateNote(id, patch) {
  if (DEMO) { Object.assign(demoExtras(demo).notes.find((n) => n.id === id), patch); saveDemo(); return; }
  const { error } = await (await client()).from('fp_note').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteNote(id) {
  if (DEMO) { const d = demoExtras(demo); d.notes = d.notes.filter((n) => n.id !== id); saveDemo(); return; }
  const { error } = await (await client()).from('fp_note').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------- Check-in ----------
export async function startCheckin(meId, since) {
  const row = { by_person: meId, since: since || null, notes: {}, unicorn: {}, stuck: [] };
  if (DEMO) {
    const full = { id: uid(), started_at: nowIso(), finished_at: null, ...row };
    demoExtras(demo).checkins.unshift(full); saveDemo(); return full;
  }
  const { data, error } = await (await client()).from('fp_checkin').insert(row).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function saveCheckin(id, patch) {
  if (DEMO) { Object.assign(demoExtras(demo).checkins.find((x) => x.id === id), patch); saveDemo(); return; }
  const { error } = await (await client()).from('fp_checkin').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCheckin(id) {
  if (DEMO) { const d = demoExtras(demo); d.checkins = d.checkins.filter((x) => x.id !== id); saveDemo(); return; }
  const { error } = await (await client()).from('fp_checkin').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
