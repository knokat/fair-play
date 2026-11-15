// Hauptkomponente: Anmeldung, Ansichten (Meine, andere Person, Deck, Parkplatz) und Kartendetail.
import { html, render, useState, useEffect, useMemo, useCallback } from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';
import * as store from './store.js';
import { CATS, CAT_ORDER, plainName, isTrio, fmtDate, origUrl, PARK_GROUPS, parkGroupLabel, reviewDue, reviewOverdue, fmtDay } from './meta.js';
import { Grid, Sheet, BigCard, OwnerDot, WeekStrip, hasSchedule, coachOf, IconCup, IconSearch, IconClose, IconBack, IconSwap, IconPark, IconEdit, IconMenu, IconFlip, IconHand, IconRoute, IconNote } from './components.js';
import { WegPage, CheckinPage, HistoryPage, NotesPage, NoteSheet, NextCheckinBar, RunningCheckinBar, sinceForNewCheckin, openSteps, STEP_COUNT } from './journey.js';

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

function CatSections({ cards, persons, onOpen, markId }) {
  return groupByCat(cards).map(([cat, list]) => html`
    <section class="section" key=${cat}>
      <h2 class="sec-title" style=${`color:${CATS[cat].ink}`}>${CATS[cat].long} <span class="count">${list.length}</span></h2>
      <${Grid} cards=${list} persons=${persons} onOpen=${onOpen} markId=${markId}/>
    </section>`);
}

// ---------- Ansicht: Karten einer Person ----------
// Suche: Name, Originalname und alle Kartentexte, ohne Groß/Klein und Akzente.
const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\|/g, '');
const matches = (c, q) => !q || [c.name, c.orig, c.descr, c.conception, c.planning, c.execution, c.msc]
  .some((t) => norm(t).includes(q));

function PersonView({ person, isMe, cards, persons, onOpen }) {
  const [dgOnly, setDgOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = norm(query.trim());
  const keep = (c) => (!dgOnly || c.is_dg) && matches(c, q);
  const allHeld = cards.filter((c) => !isTrio(c) && c.status === 'deck' && c.holder === person.id);
  const dg = allHeld.filter((c) => c.is_dg).length;
  const onlyMe = allHeld.filter((c) => c.only_me).length;
  const held = allHeld.filter(keep);
  const trio = cards.filter((c) => c.trio_owner === person.id && keep(c)).sort(bySort);
  const byPlan = cards.filter((c) => !isTrio(c) && c.status === 'deck' && c.holder !== person.id
    && c.schedule && Object.values(c.schedule).includes(person.id) && keep(c)).sort(bySort);
  const coaching = cards.filter((c) => !isTrio(c) && c.status === 'deck' && c.holder !== person.id
    && coachOf(c, persons)?.id === person.id && keep(c)).sort(bySort);
  const kids = [...new Set(coaching.map((c) => persons.find((p) => p.id === c.holder)?.name))].join(' und ');
  const filtering = dgOnly || !!q;
  const closeSearch = () => { setQuery(''); setSearchOpen(false); };
  return html`
    <div class="view">
      <div class="summary with-tools">
        <span class="big-num">${allHeld.length}</span>
        <span class="sum-text">${allHeld.length === 1 ? 'Karte' : 'Karten'} · ${dg} Daily ${dg === 1 ? 'Grind' : 'Grinds'}${onlyMe ? ` · ${onlyMe} nur ${isMe ? 'mir' : person.name} wichtig` : ''}</span>
        <span class="tools">
          <button type="button" class=${`chip icon-chip${dgOnly ? ' on' : ''}`} aria-pressed=${dgOnly} aria-label="Nur Daily Grinds" title="Nur Daily Grinds"
            onClick=${() => setDgOnly(!dgOnly)}><${IconCup}/></button>
          <button type="button" class=${`chip icon-chip${searchOpen ? ' on' : ''}`} aria-pressed=${searchOpen} aria-label="Karten suchen" title="Karten suchen"
            onClick=${() => (searchOpen ? closeSearch() : setSearchOpen(true))}><${IconSearch}/></button>
        </span>
      </div>
      ${searchOpen && html`
        <div class="search-box">
          <${IconSearch} size=${18}/>
          <input type="search" class="search-input" aria-label="Suchbegriff" placeholder="Karten suchen" value=${query}
            ref=${(el) => el && !el.dataset.focused && (el.dataset.focused = '1', el.focus())}
            onInput=${(e) => setQuery(e.target.value)} onKeyDown=${(e) => e.key === 'Escape' && closeSearch()}/>
          <button type="button" class="icon-btn small" aria-label="Suche schließen" onClick=${closeSearch}><${IconClose}/></button>
        </div>`}
      ${filtering && held.length + byPlan.length + coaching.length + trio.length === 0 && html`<p class="empty-state">Keine passende Karte${q ? ` für „${query.trim()}“` : ''}.</p>`}
      ${!filtering && allHeld.length === 0 && html`<p class="empty-state">${isMe ? 'Du hältst' : `${person.name} hält`} noch keine Karten. Im Deck kannst du Karten verteilen.</p>`}
      <${CatSections} cards=${held} persons=${persons} onOpen=${onOpen}/>
      ${coaching.length > 0 && html`
      <section class="section">
        <h2 class="sec-title">Begleitung <span class="count">${coaching.length}</span></h2>
        <p class="muted">${isMe ? 'Du begleitest' : `${person.name} begleitet`} ${kids} bei diesen Karten.</p>
        <${Grid} cards=${coaching} persons=${persons} onOpen=${onOpen}/>
      </section>`}
      ${byPlan.length > 0 && html`
      <section class="section">
        <h2 class="sec-title">Laut Wochenplan <span class="count">${byPlan.length}</span></h2>
        <p class="muted">${isMe ? 'Du bist' : `${person.name} ist`} an einzelnen Tagen dran; die Karte gehört jemand anderem.</p>
        <${Grid} cards=${byPlan} persons=${persons} onOpen=${onOpen}/>
      </section>`}
      ${trio.length > 0 && html`
      <section class="section">
        <h2 class="sec-title">Happiness Trio <span class="count">${trio.length}</span></h2>
        <${Grid} cards=${trio} persons=${persons} onOpen=${onOpen}/>
      </section>`}
    </div>`;
}

// ---------- Ansicht: Deck ----------
function DeckView({ cards, persons, onOpen, onCycle, dealMode, setDealMode, dgOnly, setDgOnly, markId, order = [] }) {
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
      ${dealMode && html`<p class="hint" role="status">Tippe auf eine Karte: ${order.map((p, i) => (i === 0 ? 'du' : p.name)).join(' → ')} → frei. Die Karten bleiben an ihrem Platz.${free.length ? ` Noch frei: ${free.length}.` : ' Alle Karten haben einen Owner.'}</p>`}
      ${dealMode && html`<${CatSections} cards=${deck} persons=${persons} onOpen=${open} markId=${markId}/>`}
      ${!dealMode && free.length > 0 && html`
        <section class="section">
          <h2 class="sec-title warn">Noch nicht verteilt <span class="count warn">${free.length}</span></h2>
          <${Grid} cards=${free} persons=${persons} onOpen=${open} markId=${markId}/>
        </section>`}
      ${!dealMode && free.length === 0 && total > 0 && html`<p class="ok-state">Alle Karten haben einen Owner.</p>`}
      ${!dealMode && dealt.length > 0 && html`<h2 class="group-title">Verteilt</h2>`}
      ${!dealMode && html`<${CatSections} cards=${dealt} persons=${persons} onOpen=${open} markId=${markId}/>`}
    </div>`;
}

// ---------- Ansicht: Parkplatz ----------
function ParkedView({ cards, persons, onOpen }) {
  const parked = cards.filter((c) => c.status === 'parked');
  const dg = parked.filter((c) => c.is_dg).length;
  const byCatSort = (a, b) => (CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat)) || bySort(a, b);
  return html`
    <div class="view">
      <h2 class="sec-title">Parkplatz</h2>
      <div class="summary">
        <span class="big-num">${parked.length}</span>
        <span class="sum-text">Karten auf dem Parkplatz · ${dg} Daily ${dg === 1 ? 'Grind' : 'Grinds'}</span>
      </div>
      <p class="muted">Geparkte Karten brauchen wir gerade nicht. Öffne eine Karte, um die Notiz oder die Gruppe zu ändern oder sie zurück ins Deck zu holen.</p>
      ${PARK_GROUPS.map((g) => {
        // Lebensereignisse bekommen einen eigenen Abschnitt (vor „Betrifft uns nicht“) – außer sie sollen bald ins Deck.
        const list = parked.filter((c) => (c.park_group || null) === g.key && (c.cat !== 'wild' || g.key === 'soon')).sort(byCatSort);
        const wild = g.key === 'never' ? parked.filter((c) => c.cat === 'wild' && c.park_group !== 'soon').sort(bySort) : [];
        return html`
          ${wild.length > 0 && html`
            <section class="section" key="wild">
              <h2 class="sec-title" style=${`color:${CATS.wild.ink}`}>Große Lebensereignisse <span class="count">${wild.length}</span></h2>
              <p class="sec-hint">Holen wir ins Deck, wenn es passiert.</p>
              <${Grid} cards=${wild} persons=${persons} onOpen=${onOpen}/>
            </section>`}
          ${list.length > 0 && html`
            <section class="section" key=${g.key || 'none'}>
              <h2 class=${`sec-title${g.key === 'soon' ? ' warn' : ''}`}>${g.label} <span class=${`count${g.key === 'soon' ? ' warn' : ''}`}>${list.length}</span></h2>
              ${g.hint && html`<p class="sec-hint">${g.hint}</p>`}
              <${Grid} cards=${list} persons=${persons} onOpen=${onOpen}/>
            </section>`}`;
      })}
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
  const [group, setGroup] = useState(card.park_group || null);
  const [review, setReview] = useState(card.review_on || '');
  return html`
    <${Sheet} title=${card.status === 'parked' ? 'Parkplatz-Notiz' : 'Karte parken'} onClose=${onClose}>
      <form class="form" onSubmit=${(e) => { e.preventDefault(); onPark(note.trim(), group, review || null); }}>
        <span class="label-text" id="park-group-label">Wohin damit?</span>
        <div class="group-pick" role="radiogroup" aria-labelledby="park-group-label">
          ${PARK_GROUPS.filter((g) => g.key).map((g) => html`
            <button type="button" role="radio" aria-checked=${group === g.key} class=${`pick${group === g.key ? ' on' : ''}`}
              onClick=${() => setGroup(group === g.key ? null : g.key)}>
              <strong>${g.label}</strong><span>${g.hint}</span>
            </button>`)}
        </div>
        <label for="park-note">Warum parken wir sie? (optional)</label>
        <textarea id="park-note" rows="4" value=${note} onInput=${(e) => setNote(e.target.value)} placeholder="z. B. Mit Augsburg ins Deck holen"></textarea>
        <label for="park-review">Wieder anschauen ab (optional)</label>
        <div class="row">
          <input id="park-review" type="date" value=${review} onInput=${(e) => setReview(e.target.value)}/>
          ${review && html`<button type="button" class="btn ghost" onClick=${() => setReview('')}>Kein Datum</button>`}
        </div>
        <p class="field-hint">Der Tag, an dem ihr anfangen müsst – nicht das Ereignis selbst. Ab 7 Tage vorher steht die Karte im Check-in.</p>
        ${card.status !== 'parked' && card.holder && html`<p class="field-hint">Die Karte verliert dabei ihren Owner.</p>`}
        <div class="row">
          <button type="button" class="btn ghost" onClick=${onClose}>Abbrechen</button>
          <button type="submit" class="btn primary">${card.status === 'parked' ? 'Speichern' : 'Parken'}</button>
        </div>
      </form>
    </${Sheet}>`;
}

// ---------- Wochenplan bearbeiten ----------
const WEEK_DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
function WeekSheet({ card, persons, onSave, onClose }) {
  const [plan, setPlan] = useState({ ...(card.schedule || {}) });
  const set = (k, id) => setPlan({ ...plan, [k]: id });
  const opts = [[null, '–'], ...persons.map((p) => [p.id, p.name])];
  return html`
    <${Sheet} title=${`Wochenplan · ${plainName(card.name)}`} onClose=${onClose}>
      <form class="form" onSubmit=${(e) => { e.preventDefault(); onSave(plan); }}>
        <p class="field-hint">Wer ist an welchem Tag dran? Am besten im Check-in für die nächste Woche festlegen. Der Owner behält den Überblick über die Karte.</p>
        ${WEEK_DAYS.map((d, i) => {
          const k = String(i + 1);
          return html`
            <div class="week-edit">
              <span class="label-text">${d}</span>
              <div class="seg" style=${`grid-template-columns:repeat(${opts.length},minmax(0,1fr))`} role="radiogroup" aria-label=${d}>
                ${opts.map(([id, label]) => {
                  const on = (plan[k] || null) === id;
                  const p = persons.find((x) => x.id === id);
                  return html`<button type="button" role="radio" aria-checked=${on} class=${`seg-btn${on ? ' on' : ''}`}
                    style=${on && p ? `background:${p.color};color:#fff` : ''} onClick=${() => set(k, id)}>${label}</button>`;
                })}
              </div>
            </div>`;
        })}
        <div class="row wrap">
          <button type="button" class="btn ghost" onClick=${() => onSave({})}>Plan löschen</button>
          <button type="button" class="btn ghost" onClick=${onClose}>Abbrechen</button>
          <button type="submit" class="btn primary">Speichern</button>
        </div>
      </form>
    </${Sheet}>`;
}

// ---------- Kartendetail ----------
function Detail({ card, persons, meId, onClose, act, onNote }) {
  const [flipped, setFlipped] = useState(false);
  const [sheet, setSheet] = useState(null);
  const me = persons.find((p) => p.id === meId);
  const others = persons.filter((p) => p.id !== meId); // andere Erwachsene und Kinder
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
          <div class="panel-row"><span class="label">Parkplatz</span><span class="park-group">${parkGroupLabel(card.park_group)}</span></div>
          ${card.review_on && html`<div class="panel-row"><span class="label">Wieder anschauen ab</span>
            <span class=${`review-tag big${reviewDue(card) ? ' due' : ''}`}>${fmtDay(card.review_on)}${reviewOverdue(card) ? ' · überfällig' : reviewDue(card) ? ' · steht an' : ''}</span></div>`}
          ${card.parked_note ? html`<p class="park-note">${card.parked_note}</p>` : html`<p class="muted">Noch keine Notiz.</p>`}
          <div class="row">
            <button type="button" class="btn primary" onClick=${() => act('unpark', card)}>Ins Deck holen</button>
            <button type="button" class="btn ghost" onClick=${() => setSheet('park')}><${IconEdit}/> Notiz & Gruppe</button>
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
            </label>`}
          ${holder && holder.role !== 'adult' && html`
            <div class="week-edit">
              <span class="label">Begleitung</span>
              <div class="seg" style=${`grid-template-columns:repeat(${persons.filter((p) => p.role === 'adult').length + 1},minmax(0,1fr))`} role="radiogroup" aria-label="Begleitung">
                ${[[null, 'Niemand'], ...persons.filter((p) => p.role === 'adult').map((p) => [p.id, p.name])].map(([id, label]) => {
                  const on = (card.coach || null) === id;
                  const p = persons.find((x) => x.id === id);
                  return html`<button type="button" role="radio" aria-checked=${on} class=${`seg-btn${on ? ' on' : ''}`}
                    style=${on && p ? `background:${p.color};color:#fff` : ''} onClick=${() => !on && act('coach', card, id)}>${label}</button>`;
                })}
              </div>
              <p class="field-hint">Wer ${holder.name} bei dieser Karte begleitet. Die Karte erscheint dann auch in dessen Tab.</p>
            </div>`}
          <div class="panel-row week-row"><span class="label">Wochenplan</span>
            ${hasSchedule(card) ? html`<${WeekStrip} card=${card} persons=${persons} size="lg"/>` : html`<span class="muted">Kein Plan – die Karte hält ${holder ? holder.name : 'noch niemand'} an allen Tagen.</span>`}</div>
          <button type="button" class="btn ghost" onClick=${() => setSheet('week')}><${IconEdit}/> Wochenplan ${hasSchedule(card) ? 'bearbeiten' : 'anlegen'}</button>`}
      </div>

      <div class="row wrap">
        <button type="button" class="btn ghost" onClick=${() => setSheet('edit')}><${IconEdit}/> Texte bearbeiten</button>
        <button type="button" class="btn ghost" onClick=${() => onNote(card)}><${IconNote}/> Für Check-in notieren</button>
      </div>
      <div class="meta">
        ${editor && html`<span>Zuletzt geändert von ${editor.name} am ${fmtDate(card.updated_at)}</span>`}
        <a href=${origUrl(card)} target="_blank" rel="noopener">Originalkarte „${card.orig}“ auf fairplaypolicy.org</a>
      </div>

      ${sheet === 'edit' && html`<${EditSheet} card=${card} onClose=${() => setSheet(null)}
        onSave=${async (f) => { await act('texts', card, f); setSheet(null); }}/>`}
      ${sheet === 'week' && html`<${WeekSheet} card=${card} persons=${persons} onClose=${() => setSheet(null)}
        onSave=${async (sch) => { await act('schedule', card, sch); setSheet(null); }}/>`}
      ${sheet === 'park' && html`<${ParkSheet} card=${card} onClose=${() => setSheet(null)}
        onPark=${async (note, group, review) => { await act('park', card, { note, group, review }); setSheet(null); }}/>`}
    </div>`;
}

// ---------- Menü ----------
function Menu({ me, persons, cards, onClose, onSwitch, onSignOut, onReload, onGo, onParked, onCheckin, running, openSteps: stepsOpen, openNotes }) {
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
      <nav class="menu-list" aria-label="Fair-Play-Begleiter">
        <button type="button" onClick=${() => onGo('weg')}><span class="mi-title">Unser Weg</span><span class="mi-sub">${stepsOpen ? `${STEP_COUNT - stepsOpen} von ${STEP_COUNT} Schritten erledigt` : 'Alle Schritte erledigt'}</span></button>
        <button type="button" onClick=${onCheckin}><span class="mi-title">${running ? 'Check-in fortsetzen' : 'Check-in starten'}</span><span class="mi-sub">Geführt in 8 Punkten</span></button>
        <button type="button" onClick=${() => onGo('history')}><span class="mi-title">Vergangene Check-ins</span><span class="mi-sub">Zum Nachlesen</span></button>
        <button type="button" onClick=${() => onGo('notes')}><span class="mi-title">Meine Notizen</span><span class="mi-sub">${openNotes ? `${openNotes} offen` : 'Keine offenen'} · nur für dich</span></button>
        <button type="button" onClick=${onParked}><span class="mi-title">Parkplatz</span><span class="mi-sub">${cards.filter((c) => c.status === 'parked').length} Karten, die wir gerade nicht brauchen</span></button>
      </nav>
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
  const [data, setData] = useState({ persons: [], cards: [], meId: null, settings: {}, steps: [], notes: [], checkins: [] });
  const [page, setPage] = useState(null); // null | weg | checkin | history | notes
  const [ciStep, setCiStep] = useState(1);
  const [noteFor, setNoteFor] = useState(null); // { card } öffnet das Notiz-Sheet
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

  // Live: Änderungen vom anderen Handy (Re-Deal, Texte, Weg, Check-in) sofort übernehmen.
  useEffect(() => {
    if (phase !== 'ready') return;
    let timer = null; let stop = () => {};
    store.subscribe(() => { clearTimeout(timer); timer = setTimeout(load, 300); }).then((fn) => { stop = fn; });
    return () => { clearTimeout(timer); stop(); };
  }, [phase === 'ready']);

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), Math.max(2200, toast.length * 55)); return () => clearTimeout(t); }, [toast]);

  const { persons, cards, meId, settings, steps, notes, checkins } = data;
  const me = persons.find((p) => p.id === meId);
  // Reihenfolge ab mir: ich → andere Erwachsene → Kinder (für Verteilen und den zweiten Tab).
  const order = [
    ...persons.filter((p) => p.id === meId),
    ...persons.filter((p) => p.id !== meId && p.role === 'adult'),
    ...persons.filter((p) => p.id !== meId && p.role !== 'adult'),
  ];
  const otherList = order.slice(1);
  const name = (id) => persons.find((p) => p.id === id)?.name;

  const act = async (type, card, arg) => {
    try {
      if (type === 'coach') { await store.setCoach(card, arg, meId); setToast(arg ? `Begleitung: ${name(arg)}` : 'Keine Begleitung'); }
      if (type === 'deal') { await store.setHolder(card, arg, meId, persons.find((p) => p.id === arg)?.role === 'child'); setToast(handoverText(card, arg) || (arg === meId ? 'Du hältst jetzt diese Karte' : `An ${name(arg)} gegeben`)); }
      if (type === 'schedule') { await store.setSchedule(card, arg, meId); setToast(Object.values(arg || {}).some(Boolean) ? 'Wochenplan gespeichert' : 'Wochenplan gelöscht'); }
      if (type === 'park') { await store.park(card, arg.note, arg.group, meId, arg.review); setToast(card.status === 'parked' ? 'Gespeichert' : 'Geparkt'); }
      if (type === 'unpark') { await store.unpark(card, meId); setToast('Zurück im Deck, noch ohne Owner'); }
      if (type === 'onlyMe') { await store.setOnlyMe(card, arg, meId); }
      if (type === 'texts') { await store.updateTexts(card, arg, meId); setToast('Gespeichert'); }
      await load();
    } catch (e) { setToast(`Hat nicht geklappt: ${e.message}`); }
  };

  // Übergabe-Moment: wechselt eine Karte von einer Person zur anderen, daran erinnern.
  function handoverText(card, to) {
    if (!card.holder || !to || card.holder === to) return '';
    return `${plainName(card.name)} → ${name(to)}. Zeit für den Übergabe-Moment: ${name(card.holder)} erzählt kurz, wie es bisher lief.`;
  }

  const cycle = async (card) => {
    // Reihenfolge ab der tippenden Person: ich → andere Erwachsene → Kinder → frei.
    const i = order.findIndex((p) => p.id === card.holder);
    const next = i === -1 ? order[0].id : (order[i + 1]?.id ?? null);
    setMarkId(card.id);
    await act('deal', card, next);
    setToast(handoverText(card, next) || (next ? `${plainName(card.name)} → ${name(next)}` : `${plainName(card.name)} → frei`));
  };

  if (phase === 'loading') return html`<p class="loading">Lade Karten …</p>`;
  if (phase === 'login') return html`<${Login} onDone=${load}/>`;
  if (phase === 'error') return html`<main class="login"><h1 class="brand">Fair Play</h1><p class="error" role="alert">${error}</p><button class="btn primary" onClick=${load}>Nochmal versuchen</button></main>`;

  const detail = cards.find((c) => c.id === detailId);
  const running = checkins.find((c) => !c.finished_at) || null;
  const go = (p) => { setPage(p); setMenu(false); window.scrollTo(0, 0); };
  const startCheckin = async () => {
    setMenu(false);
    try {
      if (!running) { await store.startCheckin(meId, sinceForNewCheckin(checkins, steps)); setCiStep(1); await load(); }
      go('checkin');
    } catch (e) { setToast(`Hat nicht geklappt: ${e.message}`); }
  };
  const ctx = {
    persons, cards, meId, me, settings, steps, notes, checkins, running,
    reload: load, toast: setToast, go, startCheckin,
    openCard: (c) => setDetailId(c.id),
    goDeck: ({ dg, deal }) => { setPage(null); setView('deck'); setDgOnly(!!dg); setDealMode(!!deal); window.scrollTo(0, 0); },
  };
  const stepsOpen = openSteps(steps);
  const openNotes = notes.filter((n) => !n.done_at).length;
  const pageEl = page === 'weg' ? html`<${WegPage} ctx=${ctx} onBack=${() => go(null)}/>`
    : page === 'checkin' && running ? html`<${CheckinPage} key=${running.id} ctx=${ctx} checkin=${running} step=${ciStep} setStep=${setCiStep} onBack=${() => go(null)}/>`
    : page === 'history' ? html`<${HistoryPage} ctx=${ctx} onBack=${() => go(null)}/>`
    : page === 'notes' ? html`<${NotesPage} ctx=${ctx} onBack=${() => go(null)}/>`
    : null;
  const tabs = [['mine', 'Meine'], ...otherList.map((p) => [`p:${p.id}`, p.name]), ['deck', 'Deck']];
  const viewPerson = view.startsWith('p:') ? otherList.find((p) => `p:${p.id}` === view) : null;

  return html`
    <div class="app">
      ${detail
        ? html`<${Detail} card=${detail} persons=${persons} meId=${meId} onClose=${() => setDetailId(null)} act=${act} onNote=${(c) => setNoteFor({ card: c })}/>`
        : pageEl || html`
          <header class="top">
            <div class="top-row">
              <h1 class="brand">Fair Play</h1>
              <div class="top-icons">
                <button type="button" class="icon-btn badge-wrap" onClick=${() => go('notes')} aria-label=${`Meine Notizen${openNotes ? `, ${openNotes} offen` : ''}`}>
                  <${IconNote}/>${openNotes > 0 && html`<span class="badge">${openNotes}</span>`}</button>
                <button type="button" class="icon-btn badge-wrap" onClick=${() => go('weg')} aria-label=${`Unser Weg${stepsOpen ? `, ${STEP_COUNT - stepsOpen} von ${STEP_COUNT} Schritten erledigt` : ''}`}>
                  <${IconRoute}/>${stepsOpen > 0 && html`<span class="dot"></span>`}</button>
                <button type="button" class="icon-btn" onClick=${() => setMenu(true)} aria-label="Menü öffnen"><${IconMenu}/></button>
              </div>
            </div>
            <nav class="tabs" aria-label="Ansichten">
              ${tabs.map(([id, label]) => html`
                <button type="button" class=${`tab${view === id ? ' on' : ''}`} aria-current=${view === id ? 'page' : null}
                  onClick=${() => { setView(id); setDealMode(false); window.scrollTo(0, 0); }}>${label}</button>`)}
            </nav>
          </header>
          <${RunningCheckinBar} ctx=${ctx} step=${ciStep}/>
          ${view === 'mine' && html`<${NextCheckinBar} ctx=${ctx}/>`}
          ${view === 'mine' && html`<${PersonView} person=${me} isMe=${true} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
          ${viewPerson && html`<${PersonView} key=${viewPerson.id} person=${viewPerson} isMe=${false} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
          ${view === 'deck' && html`<${DeckView} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)} onCycle=${cycle}
              dealMode=${dealMode} setDealMode=${setDealMode} dgOnly=${dgOnly} setDgOnly=${setDgOnly} markId=${markId} order=${order}/>`}
          ${view === 'parked' && html`<${ParkedView} cards=${cards} persons=${persons} onOpen=${(c) => setDetailId(c.id)}/>`}
        `}
      ${noteFor && html`<${NoteSheet} ctx=${ctx} card=${noteFor.card} onClose=${() => setNoteFor(null)}/>`}
      ${menu && html`<${Menu} me=${me} persons=${persons} cards=${cards} onClose=${() => setMenu(false)}
        onParked=${() => { setMenu(false); setPage(null); setView('parked'); setDealMode(false); window.scrollTo(0, 0); }}
        onGo=${go} onCheckin=${startCheckin} running=${running} openSteps=${stepsOpen} openNotes=${openNotes}
        onSwitch=${(id) => { store.setDemoMe(id); setMenu(false); load(); }}
        onReload=${() => { setMenu(false); load(); }}
        onSignOut=${async () => { setMenu(false); await store.signOut(); setPhase('login'); }}/>`}
      ${toast && html`<div class="toast" role="status">${toast}</div>`}
    </div>`;
}

render(html`<${App}/>`, document.getElementById('app'));
