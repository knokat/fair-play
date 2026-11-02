// Hauptkomponente: Anmeldung, Ansichten (Meine, andere Person, Deck, Parkplatz) und Kartendetail.
import { html, render, useState, useEffect, useMemo, useCallback } from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';
import * as store from './store.js';
import { CATS, CAT_ORDER, plainName, isTrio, fmtDate, ORIGINAL_URL } from './meta.js';
import { SmallCard, BigCard, OwnerDot, IconBack, IconSwap, IconPark, IconEdit, IconMenu, IconFlip, IconHand } from './components.js';

const bySort = (a, b) => a.sort - b.sort;
const groupByCat = (cards) => CAT_ORDER.map((cat) => [cat, cards.filter((c) => c.cat === cat).sort(bySort)]).filter(([, l]) => l.length);

// ---------- Anmeldung ----------
function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await store.signIn(email.trim(), pw); onDone(); } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return html`
    <main class="login">
      <h1 class="brand">Fair Play</h1>
      <p class="muted">Melde dich mit deinem Konto an.</p>
      <form onSubmit=${submit} class="form">
        <label for="login-email">E-Mail</label>
        <input id="login-email" type="email" autocomplete="username" value=${email} onInput=${(e) => setEmail(e.target.value)} required/>
        <label for="login-pw">Passwort</label>
        <input id="login-pw" type="password" autocomplete="current-password" value=${pw} onInput=${(e) => setPw(e.target.value)} required/>
        ${err && html`<p class="error" role="alert">${err}</p>`}
        <button class="btn primary" type="submit" disabled=${busy}>${busy ? 'Anmelden …' : 'Anmelden'}</button>
      </form>
    </main>`;
}

// ---------- Kartenraster ----------
function Grid({ cards, persons, onOpen, markId }) {
  return html`<div class="grid">${cards.map((c) => html`<${SmallCard} key=${c.id} card=${c} persons=${persons} onClick=${() => onOpen(c)} mark=${markId === c.id}/>`)}</div>`;
}

function CatSections({ cards, persons, onOpen, markId }) {
  return groupByCat(cards).map(([cat, list]) => html`
    <section class="section" key=${cat}>
      <h2 class="sec-title" style=${`color:${CATS[cat].ink}`}>${CATS[cat].long} <span class="count">${list.length}</span></h2>
      <${Grid} cards=${list} persons=${persons} onOpen=${onOpen} markId=${markId}/>
    </section>`);
}

// ---------- Ansicht: Karten einer Person ----------
function PersonView({ person, isMe, cards, persons, onOpen }) {
  const trio = cards.filter((c) => c.trio_owner === person.id).sort(bySort);
  const held = cards.filter((c) => !isTrio(c) && c.status === 'deck' && c.holder === person.id);
  const dg = held.filter((c) => c.is_dg).length;
  const onlyMe = held.filter((c) => c.only_me).length;
  return html`
    <div class="view">
      <div class="summary">
        <span class="big-num">${held.length}</span>
        <span class="sum-text">${held.length === 1 ? 'Karte' : 'Karten'} · ${dg} Daily ${dg === 1 ? 'Grind' : 'Grinds'}${onlyMe ? ` · ${onlyMe} nur ${isMe ? 'mir' : person.name} wichtig` : ''}</span>
      </div>
      ${held.length === 0 && html`<p class="empty-state">${isMe ? 'Du hältst' : `${person.name} hält`} noch keine Karten. Im Deck kannst du Karten verteilen.</p>`}
      <${CatSections} cards=${held} persons=${persons} onOpen=${onOpen}/>
      <section class="section">
        <h2 class="sec-title">Happiness Trio <span class="count">${trio.length}</span></h2>
        <${Grid} cards=${trio} persons=${persons} onOpen=${onOpen}/>
      </section>
    </div>`;
}

// ---------- Ansicht: Deck ----------
function DeckView({ cards, persons, onOpen, onCycle, dealMode, setDealMode, dgOnly, setDgOnly, markId }) {
  let deck = cards.filter((c) => c.status === 'deck' && !isTrio(c));
  const total = deck.length;
  const dgTotal = deck.filter((c) => c.is_dg).length;
  if (dgOnly) deck = deck.filter((c) => c.is_dg);
  const free = deck.filter((c) => !c.holder);
  const dealt = deck.filter((c) => c.holder);
  const open = dealMode ? onCycle : onOpen;
  return html`
    <div class="view">
      <div class="summary">
        <span class="big-num">${total}</span>
        <span class="sum-text">Karten im Deck · ${dgTotal} Daily Grinds</span>
      </div>
      <div class="toolbar">
        <button type="button" class=${`chip${dealMode ? ' on' : ''}`} aria-pressed=${dealMode} onClick=${() => setDealMode(!dealMode)}><${IconHand}/> Verteilen</button>
        <button type="button" class=${`chip${dgOnly ? ' on' : ''}`} aria-pressed=${dgOnly} onClick=${() => setDgOnly(!dgOnly)}>Nur Daily Grinds</button>
      </div>
      ${dealMode && html`<p class="hint" role="status">Tippe auf eine Karte, um sie weiterzugeben: ${persons.map((p) => p.initial).join(' → ')} → frei.</p>`}
      ${free.length > 0 && html`
        <section class="section">
          <h2 class="sec-title warn">Noch nicht verteilt <span class="count warn">${free.length}</span></h2>
          <${Grid} cards=${free} persons=${persons} onOpen=${open} markId=${markId}/>
        </section>`}
      ${free.length === 0 && total > 0 && html`<p class="ok-state">Alle Karten haben einen Owner.</p>`}
      ${dealt.length > 0 && html`<h2 class="group-title">Verteilt</h2>`}
      <${CatSections} cards=${dealt} persons=${persons} onOpen=${open} markId=${markId}/>
    </div>`;
}

// ---------- Ansicht: Parkplatz ----------
function ParkedView({ cards, persons, onOpen }) {
  const parked = cards.filter((c) => c.status === 'parked');
  return html`
    <div class="view">
      <div class="summary">
        <span class="big-num">${parked.length}</span>
        <span class="sum-text">Karten auf dem Parkplatz</span>
      </div>
      <p class="muted">Geparkte Karten betreffen uns gerade nicht. Öffne eine Karte, um sie zurück ins Deck zu holen.</p>
      <${CatSections} cards=${parked} persons=${persons} onOpen=${onOpen}/>
    </div>`;
}

// ---------- Bottom Sheet ----------
function Sheet({ title, onClose, children }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  return html`
    <div class="sheet-bg" onClick=${(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label=${title}>
        <h2 class="sheet-title">${title}</h2>
        ${children}
      </div>
    </div>`;
}

function EditSheet({ card, onSave, onClose }) {
  const [f, setF] = useState({
    name: card.name, descr: card.descr, conception: card.conception,
    planning: card.planning, execution: card.execution, msc: card.msc,
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const field = (k, label, rows = 3) => html`
    <label for=${`edit-${k}`}>${label}</label>
    <textarea id=${`edit-${k}`} rows=${rows} value=${f[k]} onInput=${set(k)}></textarea>`;
  return html`
    <${Sheet} title="Karte bearbeiten" onClose=${onClose}>
      <form class="form" onSubmit=${(e) => { e.preventDefault(); onSave(f); }}>
        <label for="edit-name">Name</label>
        <input id="edit-name" value=${f.name} onInput=${set('name')}/>
        <p class="field-hint">Mit | markierst du, wo der Name getrennt werden darf, zum Beispiel Lebensmittel|einkauf.</p>
        ${field('descr', 'Worum geht’s', 2)}
        ${field('conception', 'Dran-Denken')}
        ${field('planning', 'Planen')}
        ${field('execution', 'Erledigen')}
        ${field('msc', 'Mindeststandard', 4)}
        <div class="row">
          <button type="button" class="btn ghost" onClick=${onClose}>Abbrechen</button>
          <button type="submit" class="btn primary">Speichern</button>
        </div>
      </form>
    </${Sheet}>`;
}

function ParkSheet({ card, onPark, onClose }) {
  const [note, setNote] = useState(card.parked_note || '');
  return html`
    <${Sheet} title=${card.status === 'parked' ? 'Notiz ändern' : 'Karte parken'} onClose=${onClose}>
      <form class="form" onSubmit=${(e) => { e.preventDefault(); onPark(note.trim()); }}>
        <label for="park-note">Warum parken wir sie? (optional)</label>
        <input id="park-note" value=${note} onInput=${(e) => setNote(e.target.value)} placeholder="z. B. Mit Augsburg ins Deck holen"/>
        ${card.status !== 'parked' && card.holder && html`<p class="field-hint">Die Karte verliert dabei ihren Owner.</p>`}
        <div class="row">
          <button type="button" class="btn ghost" onClick=${onClose}>Abbrechen</button>
          <button type="submit" class="btn primary">${card.status === 'parked' ? 'Speichern' : 'Parken'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

// ---------- Kartendetail ----------
function Detail({ card, persons, meId, onClose, act }) {
  const [flipped, setFlipped] = useState(false);
  const [sheet, setSheet] = useState(null);
  const me = persons.find((p) => p.id === meId);
  const others = persons.filter((p) => p.id !== meId && p.role === 'adult');
  const holder = persons.find((p) => p.id === card.holder);
  const editor = persons.find((p) => p.id === card.updated_by);
  const parked = card.status === 'parked';
  const trio = isTrio(card);
  useEffect(() => { window.scrollTo(0, 0); }, [card.id]);

  return html`
    <div class="detail">
      <div class="detail-bar">
        <button type="button" class="icon-btn" onClick=${onClose} aria-label="Zurück"><${IconBack}/></button>
        <span>Zurück</span>
      </div>
      <${BigCard} card=${card} persons=${persons} flipped=${flipped} onFlip=${() => setFlipped(!flipped)}/>
      <p class="flip-hint"><${IconFlip}/> Tippen zum Umdrehen</p>

      <div class="panel">
        ${parked ? html`
          <div class="panel-row"><span class="label">Parkplatz</span><span>${card.parked_note || 'Ohne Notiz'}</span></div>
          <div class="row">
            <button type="button" class="btn primary" onClick=${() => act('unpark', card)}>Ins Deck holen</button>
            <button type="button" class="btn ghost" onClick=${() => setSheet('park')}>Notiz ändern</button>
          </div>`
        : trio ? html`
          <div class="panel-row"><span class="label">Owner</span><span class="owner-inline"><${OwnerDot} person=${holder} size=${30}/>${holder?.name}</span></div>
          <p class="muted">Happiness-Trio-Karten gehören fest zu ihrer Person und werden nicht verteilt.</p>`
        : html`
          <div class="panel-row"><span class="label">Owner</span>
            <span class="owner-inline"><${OwnerDot} person=${holder} size=${30}/>${holder ? holder.name : 'Noch nicht verteilt'}</span></div>
          <div class="row wrap">
            ${card.holder !== meId && html`<button type="button" class="btn primary" onClick=${() => act('deal', card, meId)}><${IconHand}/> Nehme ich</button>`}
            ${others.filter((o) => o.id !== card.holder).map((o) => html`
              <button type="button" class=${`btn ${card.holder === meId ? 'primary' : 'ghost'}`} onClick=${() => act('deal', card, o.id)}><${IconSwap}/> An ${o.name} geben</button>`)}
            <button type="button" class="btn ghost" onClick=${() => setSheet('park')}><${IconPark}/> Parken</button>
          </div>
          ${holder && html`
            <label class="check">
              <input type="checkbox" id="only-me" checked=${card.only_me} onChange=${(e) => act('onlyMe', card, e.target.checked)}/>
              <span>Nur ${holder.id === meId ? 'mir' : holder.name} wichtig</span>
            </label>`}`}
      </div>

      <div class="row">
        <button type="button" class="btn ghost" onClick=${() => setSheet('edit')}><${IconEdit}/> Texte bearbeiten</button>
      </div>
      <div class="meta">
        ${editor && html`<span>Zuletzt geändert von ${editor.name} am ${fmtDate(card.updated_at)}</span>`}
        <a href=${ORIGINAL_URL} target="_blank" rel="noopener">Originalkarte „${card.orig}“ auf fairplaypolicy.org</a>
      </div>

      ${sheet === 'edit' && html`<${EditSheet} card=${card} onClose=${() => setSheet(null)}
        onSave=${async (f) => { await act('texts', card, f); setSheet(null); }}/>`}
      ${sheet === 'park' && html`<${ParkSheet} card=${card} onClose=${() => setSheet(null)}
        onPark=${async (note) => { await act('park', card, note); setSheet(null); }}/>`}
    </div>`;
}

// ---------- Menü ----------
function Menu({ me, persons, onClose, onSwitch, onSignOut, onReload }) {
  const hardRefresh = async () => {
    try {
      if ('serviceWorker' in navigator) (await navigator.serviceWorker.getRegistrations()).forEach((r) => r.unregister());
      if (window.caches) (await caches.keys()).forEach((k) => caches.delete(k));
    } catch (e) { /* ok */ }
    location.reload();
  };
  return html`
    <${Sheet} title="Menü" onClose=${onClose}>
      <p class="muted">Angemeldet als ${me.name}${store.DEMO ? ' (Demo-Modus)' : ''}.</p>
      ${store.DEMO && html`
        <p class="field-hint">Im Demo-Modus werden Änderungen nur in diesem Browser gespeichert.</p>
        <div class="row wrap">${persons.filter((p) => p.id !== me.id).map((p) => html`
          <button type="button" class="btn ghost" onClick=${() => onSwitch(p.id)}>Als ${p.name} ansehen</button>`)}</div>`}
      <div class="row wrap">
        <button type="button" class="btn ghost" onClick=${onReload}>Daten neu laden</button>
        <button type="button" class="btn ghost" onClick=${hardRefresh}>App aktualisieren</button>
        ${!store.DEMO && html`<button type="button" class="btn ghost" onClick=${onSignOut}>Abmelden</button>`}
      </div>
    </${Sheet}>`;
}

// ---------- App ----------
function App() {
  const [phase, setPhase] = useState('loading'); // loading | login | ready | error
  const [error, setError] = useState('');
  const [data, setData] = useState({ persons: [], cards: [], meId: null });
  const [view, setView] = useState('mine');
  const [detailId, setDetailId] = useState(null);
  const [dealMode, setDealMode] = useState(false);
  const [dgOnly, setDgOnly] = useState(false);
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [markId, setMarkId] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await store.loadAll();
      setData({ ...d, cards: d.cards.map((c) => ({ ...c })) });
      setPhase('ready');
    } catch (e) { setError(e.message); setPhase('error'); }
  }, []);

  useEffect(() => {
    (async () => {
      const s = await store.getSession();
      if (!s) { setPhase('login'); return; }
      await load();
    })();
    store.onAuthChange((s) => { if (!s) setPhase('login'); });
    const vis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, []);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2200); return () => clearTimeout(t); }, [toast]);

  const { persons, cards, meId } = data;
  const me = persons.find((p) => p.id === meId);
  const other = persons.find((p) => p.id !== meId && p.role === 'adult');
  const name = (id) => persons.find((p) => p.id === id)?.name;

  const act = async (type, card, arg) => {
    try {
      if (type === 'deal') { await store.setHolder(card, arg, meId); setToast(arg === meId ? 'Du hältst jetzt diese Karte' : `An ${name(arg)} gegeben`); }
      if (type === 'park') { await store.park(card, arg, meId); setToast(card.status === 'parked' ? 'Notiz gespeichert' : 'Geparkt'); }
      if (type === 'unpark') { await store.unpark(card, meId); setToast('Zurück im Deck, noch ohne Owner'); }
      if (type === 'onlyMe') { await store.setOnlyMe(card, arg, meId); }
      if (type === 'texts') { await store.updateTexts(card, arg, meId); setToast('Gespeichert'); }
      await load();
    } catch (e) { setToast(`Hat nicht geklappt: ${e.message}`); }
  };

  const cycle = async (card) => {
    const adults = persons.filter((p) => p.role === 'adult');
    const i = adults.findIndex((p) => p.id === card.holder);
    const next = i === -1 ? adults[0].id : (adults[i + 1]?.id ?? null);
    setMarkId(card.id);
    await act('deal', card, next);
    setToast(next ? `${plainName(card.name)} → ${name(next)}` : `${plainName(card.name)} → frei`);
  };

  if (phase === 'loading') return html`<p class="loading">Lade Karten …</p>`;
  if (phase === 'login') return html`<${Login} onDone=${load}/>`;
  if (phase === 'error') return html`<main class="login"><h1 class="brand">Fair Play</h1><p class="error" role="alert">${error}</p><button class="btn primary" onClick=${load}>Nochmal versuchen</button></main>`;

  const detail = cards.find((c) => c.id === detailId);
  const tabs = [['mine', 'Meine'], ['other', other?.name || 'Partner'], ['deck', 'Deck'], ['parked', 'Parkplatz']];

  return html`
    <div class="app">
      ${detail
        ? html`<${Detail} card=${detail} persons=${persons} meId=${meId} onClose=${() => setDetailId(null)} act=${act}/>`
        : html`
          <header class="top">
            <div class="top-row">
              <h1 class="brand">Fair Play</h1>
              <button type="button" class="icon-btn" onClick=${() => setMenu(true)} aria-label="Menü öffnen"><${IconMenu}/></button>
            </div>
            <nav class="tabs" aria-label="Ansichten">
              ${tabs.map(([id, label]) => html`
                <button type="button" class=${`tab${view === id ? ' on' : ''}`} aria-current=${view === id ? 'page' : null}
                  onClick=${() => { setView(id); setDealMode(false); window.scrollTo(0, 0); }}>${label}</button>`)}
            </nav>
          </header>
          ${view === 'mine' && html`<${PersonView} person=${me} isMe=${true} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
          ${view === 'other' && other && html`<${PersonView} person=${other} isMe=${false} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
          ${view === 'deck' && html`<${DeckView} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)} onCycle=${cycle}
              dealMode=${dealMode} setDealMode=${setDealMode} dgOnly=${dgOnly} setDgOnly=${setDgOnly} markId=${markId}/>`}
          ${view === 'parked' && html`<${ParkedView} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
        `}
      ${menu && html`<${Menu} me=${me} persons=${persons} onClose=${() => setMenu(false)}
        onSwitch=${(id) => { store.setDemoMe(id); setMenu(false); load(); }}
        onReload=${() => { setMenu(false); load(); }}
        onSignOut=${async () => { setMenu(false); await store.signOut(); setPhase('login'); }}/>`}
      ${toast && html`<div class="toast" role="status">${toast}</div>`}
    </div>`;
}

render(html`<${App}/>`, document.getElementById('app'));
