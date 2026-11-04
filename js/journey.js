// Anleitung „Unser Weg“, geführter Check-in, vergangene Check-ins und private Notizen.
import { html, useState, useEffect } from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';
import * as store from './store.js';
import { CATS, plainName, isTrio, fmtDate, WEEKDAYS, dayName, nextCheckin, fmtWhen, daysUntil } from './meta.js';
import { Grid, Sheet, OwnerDot, IconBack, IconCheck, IconChevron, IconTrash, IconPlus, IconHand } from './components.js';

const adultsOf = (persons) => persons.filter((p) => p.role === 'adult');
const deckCards = (cards) => cards.filter((c) => c.status === 'deck' && !isTrio(c));
const byName = (a, b) => plainName(a.name).localeCompare(plainName(b.name), 'de');
const stepRow = (steps, n) => steps.find((s) => s.step === n) || { step: n, done_at: null, confirmed: {} };

export const STEP_COUNT = 7;
export const openSteps = (steps) => STEPS.filter((s) => !stepRow(steps, s.n).done_at).length;

// Ab wann zählen Änderungen für einen neuen Check-in: letzter Check-in, sonst der zuletzt abgehakte
// Vorbereitungsschritt (Start der ersten Runde), sonst 7 Tage.
export function sinceForNewCheckin(checkins, steps) {
  const last = checkins.filter((c) => c.finished_at).sort((a, b) => b.finished_at.localeCompare(a.finished_at))[0];
  if (last) return last.finished_at;
  const prep = STEPS.filter((st) => st.n !== ROUND).map((st) => stepRow(steps, st.n).done_at).filter(Boolean).sort().pop();
  if (prep) return prep;
  return new Date(Date.now() - 7 * 86400000).toISOString();
}

// ---------- Kleine Bausteine ----------
function PageBar({ label, onBack }) {
  return html`
    <div class="detail-bar">
      <button type="button" class="icon-btn" onClick=${onBack} aria-label="Zurück"><${IconBack}/></button>
      <span>${label}</span>
    </div>`;
}

function Progress({ done, total, accent = 'var(--ok)', soft = 'var(--sage)' }) {
  return html`<div class="progress" style=${`grid-template-columns:repeat(${total},minmax(0,1fr))`} aria-hidden="true">
    ${Array.from({ length: total }, (_, i) => html`<span style=${`background:${i < done ? accent : i === done ? soft : 'var(--line)'}`}></span>`)}
  </div>`;
}

function Book({ items }) {
  return html`
    <section class="panel book">
      <h2 class="label ok">Was das Buch sagt</h2>
      <ul>${items.map((t) => html`<li>${t}</li>`)}</ul>
    </section>`;
}

// ---------- Inhalte der Schritte ----------
// n ist die Nummer in fp_step (bleibt stabil); angezeigt wird die Position in der Liste.
// Schritt 7 „Versprechen geben“ hat Katja am 4.11.2026 herausgenommen.
const ROUND = 8;
const STEPS = [
  { n: 1, title: 'Deck anpassen', sub: 'Karten aussortieren' },
  { n: 2, title: 'Check-in festlegen', sub: 'Euer fester Termin jede Woche' },
  { n: 3, title: 'Karten verteilen', sub: 'Daily Grinds zuerst, keine Karte bleibt frei' },
  { n: 4, title: 'Übergabe-Moment', sub: 'Erzählen, wie es bisher lief' },
  { n: 5, title: 'Mindeststandard festlegen', sub: 'Unsere Definition of Done pro Karte' },
  { n: 6, title: 'Unicorn Space beanspruchen', sub: 'Zeit, Geld und Betreuung für jede*n' },
  { n: 8, title: 'Erste 7-Tage-Runde', sub: 'Danach euer erster Check-in' },
];

const BOOK = {
  1: ['Alle Karten durchgehen und in drei Stapel sortieren: nicht verhandelbar, beiden wichtig, nur einem wichtig.',
    'Weniger ist mehr: Was gerade nicht zu euch passt, kommt auf den Parkplatz.'],
  2: ['Legt fest, wann ihr jede Woche kurz auf eure Karten schaut.',
    'Eine sichtbare Übersicht und ein fester Termin ersparen tägliche Erinnerungen.',
    'Probleme gehören in den Check-in, nicht in den Moment.'],
  3: ['Kein Zuschieben: Jede*r wählt bewusst und sagt zu.',
    'Wer eine Karte nimmt, übernimmt alles – Dran-Denken, Planen, Erledigen.',
    'Keine Karte bleibt „bei beiden“, sonst sitzt ihr in der Beide-Falle.',
    'Jede*r hält einen fairen Anteil der Daily Grinds und mindestens einen aus jeder Kategorie.',
    'Keine Karte ist für immer. Daily Grinds lieber öfter neu verteilen.'],
  4: ['Wechselt eine Karte den Owner, erzählt die bisherige Person kurz, wie sie es gemacht hat: wo man was kauft, was wichtig ist, was oft schiefgeht.',
    'Danach gehört das Wissen dem neuen Owner. Er entscheidet, wie er es macht – im Rahmen des Mindeststandards.'],
  5: ['Für jede Karte vereinbart ihr gemeinsam, was „erledigt“ heißt – rechtzeitig und kompetent.',
    'Das ist kein Freibrief, die eigenen Standards hochzuschrauben, und keine Gelegenheit, die des anderen zu senken.',
    'Ist der Standard vereinbart, redet die andere Person nicht mehr ins Wie hinein.'],
  6: ['Wenn alle Karten verteilt sind, spielt jede*r die eigene Unicorn-Space-Karte – sie ist Pflicht.',
    'Besprecht nacheinander: Was braucht mein Unicorn Space an Zeit, Geld und Betreuung?',
    'Niemand bestimmt, wie der andere diese Zeit nutzt. Hat jemand zu viele Karten dafür, wird neu verteilt.'],
  8: ['Die erste Runde dauert sieben Tage. Spielt eure Karten so, wie ihr es vereinbart habt.',
    'Was hakt, notiert ihr für den Check-in, statt es im Moment zu klären.',
    'Im ersten Check-in schaut ihr zurück: Was lief gut, was verteilen wir neu?'],
};

const MSC_TEST = [
  'Würde eine vernünftige Person (Babysitter, Großeltern) die Karte unter ähnlichen Umständen so erledigen?',
  'Was ist bei anderen in unserem Umfeld üblich – und wollen wir das übernehmen?',
  'Was schadet es, es so zu machen – oder nicht so?',
  'Was ist unser Warum?',
];

const PROMISES = [
  'Ich lasse alten Groll los.',
  'Ich spiele meine Karten mit vollem CPE: dran denken, planen, erledigen.',
  'Ich gebe die Kontrolle über Karten ab, die nicht meine sind, und mische mich nicht in letzter Minute ein.',
];

function CheckinSettingForm({ ctx }) {
  const cur = ctx.settings.checkin || {};
  const [day, setDay] = useState(cur.day ?? null);
  const [time, setTime] = useState(cur.time || '19:30');
  const [duration, setDuration] = useState(cur.duration || 30);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await store.saveSetting('checkin', { day, time, duration: Number(duration) }, ctx.meId); await ctx.reload(); ctx.toast('Termin gespeichert'); } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); }
    setBusy(false);
  };
  const next = nextCheckin(ctx.settings.checkin);
  return html`
    <div class="panel">
      <fieldset class="fs">
        <legend class="label">Tag</legend>
        <div class="days">${WEEKDAYS.map(([n, short, long]) => html`
          <button type="button" class=${`day${day === n ? ' on' : ''}`} aria-pressed=${day === n} aria-label=${long} onClick=${() => setDay(n)}>${short}</button>`)}</div>
      </fieldset>
      <div class="row">
        <label class="field"><span class="label">Uhrzeit</span><input type="time" value=${time} onInput=${(e) => setTime(e.target.value)}/></label>
        <label class="field"><span class="label">Dauer</span>
          <select value=${duration} onChange=${(e) => setDuration(e.target.value)}>
            ${[15, 30, 45, 60].map((m) => html`<option value=${m}>${m} Minuten</option>`)}
          </select></label>
      </div>
      <button type="button" class="btn primary" disabled=${day == null || !time || busy} onClick=${save}>Termin speichern</button>
      ${next && html`<p class="ok-line">Euer Check-in: jeden ${dayName(ctx.settings.checkin.day)} um ${ctx.settings.checkin.time}. Der nächste ist am ${fmtWhen(next)}.</p>`}
      <p class="field-hint">Der Termin steht oben auf „Meine“. Eine Erinnerung gibt es nicht.</p>
    </div>`;
}

function DealStep({ ctx }) {
  const deck = deckCards(ctx.cards);
  const dg = deck.filter((c) => c.is_dg);
  const rest = deck.filter((c) => !c.is_dg);
  const adults = adultsOf(ctx.persons);
  const dgCats = ['home', 'out', 'care', 'magic'].filter((k) => dg.some((c) => c.cat === k));
  const gaps = [];
  const rows = adults.map((p) => {
    const mine = dg.filter((c) => c.holder === p.id);
    const cats = dgCats.map((k) => {
      const ok = mine.some((c) => c.cat === k);
      if (!ok) gaps.push([p.name, CATS[k].label]);
      return { k, ok };
    });
    return { p, count: mine.length, cats };
  });
  const group = (label, hint, list, dgOnly) => {
    const done = list.filter((c) => c.holder).length;
    return html`
      <button type="button" class="step-group" onClick=${() => ctx.goDeck({ dg: dgOnly, deal: true })}>
        <span class="sg-text">
          <span class="sg-title">${label}</span>
          <span class="sg-sub">${hint}</span>
          <span class="bar" aria-hidden="true"><span style=${`width:${list.length ? Math.round((done / list.length) * 100) : 100}%`}></span></span>
        </span>
        <span class="sg-num"><b>${done} / ${list.length}</b><span>Im Deck</span></span>
      </button>`;
  };
  return html`
    <section class="section">
      <h2 class="sec-title">In dieser Reihenfolge</h2>
      ${group('1 · Daily Grinds', 'nach Fähigkeit und Verfügbarkeit', dg, true)}
      ${group('2 · Alle weiteren Karten', 'nach Vorliebe; „nur mir wichtig“ gleich markieren', rest, false)}
      <div class="step-group static">
        <span class="sg-text"><span class="sg-title">3 · Happiness Trio</span><span class="sg-sub">Jede*r hält die eigenen – schon erledigt</span></span>
        <span class="tick"><${IconCheck} size=${16}/></span>
      </div>
    </section>
    <section class="section">
      <h2 class="sec-title">Fair verteilt?</h2>
      ${rows.map(({ p, count, cats }) => html`
        <div class="panel tight">
          <div class="panel-row"><span class="owner-inline"><${OwnerDot} person=${p} size=${28}/>${p.name}</span><b>${count} Daily ${count === 1 ? 'Grind' : 'Grinds'}</b></div>
          <div class="cat-checks">${cats.map(({ k, ok }) => html`
            <span class=${`cat-check${ok ? ' ok' : ''}`}>${ok ? '✓' : '–'} ${CATS[k].label}</span>`)}</div>
        </div>`)}
      <p class="hint" role="status">${gaps.length
        ? `Noch kein Daily Grind: ${adults.map((p) => { const g = gaps.filter(([n]) => n === p.name).map(([, c]) => c); return g.length ? `${p.name} aus ${g.join(', ')}` : ''; }).filter(Boolean).join('; ')}.`
        : 'Beide halten Daily Grinds aus jeder Kategorie.'}</p>
    </section>`;
}

function MscStep({ ctx }) {
  const deck = deckCards(ctx.cards);
  const withMsc = deck.filter((c) => (c.msc || '').trim());
  const open = deck.filter((c) => !(c.msc || '').trim()).sort((a, b) => a.sort - b.sort);
  return html`
    <section class="section">
      <div class="summary"><span class="big-num">${withMsc.length}</span><span class="sum-text">von ${deck.length} Karten mit Mindeststandard</span></div>
      <span class="bar" aria-hidden="true"><span style=${`width:${deck.length ? Math.round((withMsc.length / deck.length) * 100) : 0}%`}></span></span>
    </section>
    <section class="panel book">
      <h2 class="label">Wenn ihr euch nicht einig werdet: der MSC-Test</h2>
      <ol>${MSC_TEST.map((q) => html`<li>${q}</li>`)}</ol>
    </section>
    ${open.length > 0 && html`
      <section class="section">
        <h2 class="sec-title warn">Noch offen <span class="count warn">${open.length}</span></h2>
        <p class="muted">Karte öffnen › Texte bearbeiten › Mindeststandard.</p>
        <${Grid} cards=${open} persons=${ctx.persons} onOpen=${ctx.openCard}/>
      </section>`}`;
}

function UnicornStep({ ctx }) {
  const uni = ctx.cards.filter((c) => c.cat === 'unicorn').sort((a, b) => a.sort - b.sort);
  return html`
    <section class="panel book">
      <h2 class="label">Für jede*n besprechen</h2>
      <ul><li>Zeit: Wie viele Stunden pro Woche, an welchem Tag?</li><li>Geld: Kurs, Material, Mitgliedschaft?</li><li>Betreuung: Wer übernimmt Leander und welche Karten in dieser Zeit?</li></ul>
      <p class="field-hint">Haltet euren Plan im Mindeststandard eurer Unicorn-Space-Karte fest.</p>
    </section>
    <${Grid} cards=${uni} persons=${ctx.persons} onOpen=${ctx.openCard}/>`;
}

function RoundStep({ ctx }) {
  const next = nextCheckin(ctx.settings.checkin);
  const days = next ? daysUntil(next) : null;
  return html`
    <section class="panel">
      ${next ? html`
        <div class="summary"><span class="big-num">${days === 0 ? 'Heute' : days}</span>${days !== 0 && html`<span class="sum-text">${days === 1 ? 'Tag' : 'Tage'} bis zum Check-in</span>`}</div>
        <p class="ok-line">Nächster Check-in: ${fmtWhen(next)}</p>`
        : html`<p class="muted">Legt zuerst in Schritt 2 euren Check-in-Termin fest.</p>`}
      <p class="field-hint">Was in dieser Woche hakt, notiert ihr unter Notizen (Symbol oben). Dieser Schritt wird abgehakt, wenn ihr den ersten Check-in abschließt.</p>
      <button type="button" class="btn primary" onClick=${ctx.startCheckin}>Check-in starten</button>
    </section>`;
}

function StepDetail({ ctx, n, onBack, onOpenStep }) {
  const row = stepRow(ctx.steps, n);
  const idx = STEPS.findIndex((st) => st.n === n);
  const meta = STEPS[idx];
  const pos = idx + 1;
  const nextStep = STEPS[idx + 1];
  const free = deckCards(ctx.cards).filter((c) => !c.holder).length;
  const doneBy = ctx.persons.find((p) => p.id === row.done_by);
  let canDone = true; let blocker = '';
  if (n === 2 && !ctx.settings.checkin) { canDone = false; blocker = 'Geht, sobald der Termin gespeichert ist.'; }
  if (n === 3 && free > 0) { canDone = false; blocker = `Geht, sobald keine Karte mehr frei ist – noch ${free}.`; }
  const manual = n !== ROUND && n !== 1;
  const setDone = async (on) => {
    try {
      await store.saveStep(n, { done_at: on ? new Date().toISOString() : null, done_by: on ? ctx.meId : null });
      await ctx.reload();
      if (on) { ctx.toast(`Schritt ${pos} erledigt`); onBack(); }
    } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); }
  };
  useEffect(() => { window.scrollTo(0, 0); }, [n]);
  return html`
    <div class="page">
      <${PageBar} label=${`Unser Weg · Schritt ${pos} von ${STEPS.length}`} onBack=${onBack}/>
      <h1 class="page-title">${meta.title}</h1>
      <${Book} items=${BOOK[n]}/>
      ${n === 1 && html`<p class="ok-line">Erledigt am 1.11.2026: Ihr habt das Deck gemeinsam aussortiert. Geparkte Karten liegen auf dem Parkplatz.</p>`}
      ${n === 2 && html`<${CheckinSettingForm} ctx=${ctx}/>`}
      ${n === 3 && html`<${DealStep} ctx=${ctx}/>`}
      ${n === 4 && html`<p class="hint">Gebt ihr in der App eine Karte weiter, erinnert sie euch an den Übergabe-Moment.</p>`}
      ${n === 5 && html`<${MscStep} ctx=${ctx}/>`}
      ${n === 6 && html`<${UnicornStep} ctx=${ctx}/>`}
      ${n === ROUND && html`<${RoundStep} ctx=${ctx}/>`}
      <div class="page-foot">
        ${row.done_at
          ? html`<p class="ok-line"><${IconCheck} size=${16}/> Erledigt am ${fmtDate(row.done_at)}${doneBy ? ` von ${doneBy.name}` : ''}</p>
            ${manual && html`<button type="button" class="btn ghost" onClick=${() => setDone(false)}>Wieder öffnen</button>`}`
          : manual && html`
            <button type="button" class="btn primary" disabled=${!canDone} onClick=${() => setDone(true)}><${IconCheck}/> Gemeinsam abhaken</button>
            ${blocker && html`<p class="field-hint center">${blocker}</p>`}`}
        ${nextStep && html`<button type="button" class="btn ghost" onClick=${() => onOpenStep(nextStep.n)}>Weiter zu Schritt ${pos + 1}</button>`}
      </div>
    </div>`;
}

export function WegPage({ ctx, onBack }) {
  const [open, setOpen] = useState(null);
  if (open) return html`<${StepDetail} ctx=${ctx} n=${open} onBack=${() => setOpen(null)} onOpenStep=${setOpen}/>`;
  const done = STEPS.length - openSteps(ctx.steps);
  const current = STEPS.find((s) => !stepRow(ctx.steps, s.n).done_at);
  const next = nextCheckin(ctx.settings.checkin);
  return html`
    <div class="page">
      <${PageBar} label="Zurück" onBack=${onBack}/>
      <h1 class="page-title caps">Unser Weg</h1>
      <p class="muted">Vom aussortierten Deck bis zur ersten 7-Tage-Runde. Ihr könnt jeden Schritt öffnen – abgehakt wird gemeinsam.</p>
      <${Progress} done=${done} total=${STEPS.length}/>
      <p class="ok-line">${done} von ${STEPS.length} Schritten erledigt</p>
      <ol class="steps">
        ${STEPS.map((s, i) => {
          const row = stepRow(ctx.steps, s.n);
          const isCur = current && current.n === s.n;
          return html`
            <li key=${s.n}>
              <button type="button" class=${`step${isCur ? ' current' : ''}${row.done_at ? ' done' : ''}`} onClick=${() => setOpen(s.n)}>
                <span class="step-num">${row.done_at ? html`<${IconCheck} size=${18}/>` : i + 1}</span>
                <span class="step-text">
                  ${isCur && html`<span class="label ok">Jetzt dran</span>`}
                  <span class="step-title">${s.title}</span>
                  <span class="step-sub">${row.done_at ? `Erledigt am ${fmtDate(row.done_at)}` : s.sub}</span>
                </span>
                <${IconChevron}/>
              </button>
            </li>`;
        })}
      </ol>
      <section class="panel">
        <h2 class="label">Check-in</h2>
        <p class="muted">${next ? `Nächster Termin: ${fmtWhen(next)}` : 'Noch kein Termin – siehe Schritt 2.'}</p>
        <div class="row wrap">
          <button type="button" class="btn primary" onClick=${ctx.startCheckin}>${ctx.running ? 'Check-in fortsetzen' : 'Check-in starten'}</button>
          <button type="button" class="btn ghost" onClick=${() => ctx.go('history')}>Vergangene</button>
        </div>
      </section>
    </div>`;
}

// ---------- Hinweise in den Tabs ----------
export function NextCheckinBar({ ctx }) {
  const next = nextCheckin(ctx.settings.checkin);
  if (!next || ctx.running) return null;
  const days = daysUntil(next);
  return html`
    <div class="next-bar">
      <span><span class="label">Nächster Check-in</span><br/><b>${days === 0 ? 'Heute' : days === 1 ? 'Morgen' : fmtWhen(next).split(' · ')[0]}</b> · ${fmtWhen(next).split(' · ')[1]}</span>
      <button type="button" class="chip" onClick=${ctx.startCheckin}>Starten</button>
    </div>`;
}

export function RunningCheckinBar({ ctx, step }) {
  if (!ctx.running) return null;
  return html`
    <button type="button" class="run-bar" onClick=${() => ctx.go('checkin')}>
      <span><b>Check-in läuft</b> · Punkt ${step} von 8</span>
      <span class="run-go">Zurück zum Check-in <${IconChevron}/></span>
    </button>`;
}

// ---------- Check-in ----------
const CI = [
  { n: 1, title: 'Kurz ankommen' },
  { n: 2, title: 'Was hat sich geändert?' },
  { n: 3, title: 'Was lief gut, was hat gehakt?' },
  { n: 4, title: 'Neu verteilen' },
  { n: 5, title: 'Mindeststandard nachschärfen' },
  { n: 6, title: 'Vorschau nächste Woche' },
  { n: 7, title: 'Unicorn Space' },
  { n: 8, title: 'Abschluss' },
];
const FIELD_LABEL = { name: 'Name', descr: 'Beschreibung', conception: 'Dran-Denken', planning: 'Planen', execution: 'Erledigen', msc: 'Mindeststandard', only_me: '„Nur mir wichtig“', parked_note: 'Parkplatz-Notiz', park_group: 'Parkplatz-Gruppe' };
const UNI = [['ja', 'Ja'], ['teils', 'Teilweise'], ['nein', 'Nein']];

function summarize(events, cards, persons) {
  const name = (id) => persons.find((p) => p.id === id)?.name || 'frei';
  const byCard = {};
  events.forEach((e) => { (byCard[e.card_id] = byCard[e.card_id] || []).push(e); });
  const out = [];
  Object.entries(byCard).forEach(([cid, list]) => {
    const card = cards.find((c) => c.id === cid);
    if (!card) return;
    const dealt = list.filter((e) => e.action === 'dealt');
    if (dealt.length) {
      const from = dealt[0].from_person; const to = dealt[dealt.length - 1].to_person;
      if (from !== to) out.push({ card, kind: 'dealt', to, text: `${name(from)} → ${name(to)}` });
    }
    const pk = list.filter((e) => e.action === 'parked' || e.action === 'unparked');
    const before = pk.length && (pk[0].action === 'parked' ? 'deck' : 'parked');
    const last = pk[pk.length - 1];
    if (pk.length && before !== (last.action === 'parked' ? 'parked' : 'deck')) {
      out.push({ card, kind: last.action, text: last.action === 'parked' ? `Geparkt von ${name(last.by_person)}` : `Zurück im Deck, geholt von ${name(last.by_person)}` });
    }
    const ed = list.filter((e) => e.action === 'edited');
    if (ed.length) {
      const fields = [...new Set(ed.map((e) => FIELD_LABEL[e.field] || e.field))];
      const who = [...new Set(ed.map((e) => name(e.by_person)))];
      out.push({ card, kind: 'edited', text: `${fields.join(', ')} geändert von ${who.join(' und ')}` });
    }
  });
  return out;
}

function ChangeList({ ctx, since }) {
  const [events, setEvents] = useState(null);
  useEffect(() => {
    let live = true;
    store.loadEvents(since).then((e) => { if (live) setEvents(e); }).catch(() => { if (live) setEvents([]); });
    return () => { live = false; };
  }, [since, ctx.cards]);
  if (!events) return html`<p class="muted">Lade Änderungen …</p>`;
  const items = summarize(events, ctx.cards, ctx.persons);
  if (!items.length) return html`<p class="muted">Seit ${fmtDate(since)} hat sich an den Karten nichts geändert.</p>`;
  return html`
    <ul class="changes">${items.map((it) => {
      const to = ctx.persons.find((p) => p.id === it.to);
      return html`
        <li>
          <button type="button" class="change" onClick=${() => ctx.openCard(it.card)}>
            ${it.kind === 'dealt' ? html`<${OwnerDot} person=${to} size=${30}/>` : html`<span class="change-ico">${it.kind === 'edited' ? '✎' : 'P'}</span>`}
            <span class="change-text"><b>${plainName(it.card.name)}</b><span>${it.text}</span></span>
          </button>
        </li>`;
    })}</ul>`;
}

export function CheckinPage({ ctx, checkin, step, setStep, onBack }) {
  const [draft, setDraft] = useState({ notes: checkin.notes || {}, unicorn: checkin.unicorn || {}, stuck: checkin.stuck || [] });
  const [pick, setPick] = useState('');
  const [pickNote, setPickNote] = useState('');
  const adults = adultsOf(ctx.persons);
  const setNote = (k) => (e) => setDraft({ ...draft, notes: { ...draft.notes, [k]: e.target.value } });
  const save = () => store.saveCheckin(checkin.id, draft).catch((e) => ctx.toast(`Nicht gespeichert: ${e.message}`));
  const go = async (n) => { await save(); setStep(n); window.scrollTo(0, 0); ctx.reload(); };
  const leave = async () => { await save(); onBack(); };
  const finish = async () => {
    try {
      await store.saveCheckin(checkin.id, { ...draft, finished_at: new Date().toISOString() });
      if (!stepRow(ctx.steps, ROUND).done_at) await store.saveStep(ROUND, { done_at: new Date().toISOString(), done_by: ctx.meId });
      ctx.toast('Check-in gespeichert');
      setStep(1);
      await ctx.reload();
      ctx.go('history');
    } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); }
  };
  const discard = async () => {
    if (!confirm('Diesen Check-in verwerfen? Eure Notizen darin gehen verloren.')) return;
    try { await store.deleteCheckin(checkin.id); setStep(1); await ctx.reload(); onBack(); } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); }
  };
  const addStuck = () => {
    if (!pick) return;
    setDraft({ ...draft, stuck: [...draft.stuck.filter((s) => s.card_id !== pick), { card_id: pick, note: pickNote.trim() }] });
    setPick(''); setPickNote('');
  };
  const myOpen = ctx.notes.filter((n) => !n.done_at || n.checkin_id === checkin.id);
  const markNote = async (n, on) => {
    try { await store.updateNote(n.id, on ? { done_at: new Date().toISOString(), checkin_id: checkin.id } : { done_at: null, checkin_id: null }); ctx.reload(); } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); }
  };
  const deck = deckCards(ctx.cards).sort(byName);
  const cardOf = (id) => ctx.cards.find((c) => c.id === id);
  const free = deckCards(ctx.cards).filter((c) => !c.holder).length;
  const next = nextCheckin(ctx.settings.checkin, new Date(Date.now() + 3600000));
  const area = (k, label, ph) => html`
    <label class="field"><span class="label">${label}</span>
      <textarea rows="4" value=${draft.notes[k] || ''} onInput=${setNote(k)} onBlur=${save} placeholder=${ph}></textarea></label>`;

  return html`
    <div class="page">
      <div class="ci-head">
        <span class="label warn">Check-in · ${step} von 8</span>
        <button type="button" class="text-btn" onClick=${leave}>Pause</button>
      </div>
      <${Progress} done=${step - 1} total=${8} accent="var(--warn)" soft="var(--warn)"/>
      <h1 class="page-title">${CI[step - 1].title}</h1>

      ${step === 1 && html`
        <p class="lead">Wie geht es euch gerade? Jede*r sagt kurz, was diese Woche los war und womit ihr in den Check-in geht.</p>
        ${area('ankommen', 'Notiz (optional)', 'z. B. anstrengende Woche, viel Arbeit')}`}

      ${step === 2 && html`
        <p class="lead">Alles, was seit ${fmtDate(checkin.since)} an den Karten passiert ist. Tippt eine Zeile an, um die Karte zu öffnen – oder schaut am anderen Handy nach.</p>
        <${ChangeList} ctx=${ctx} since=${checkin.since}/>
        <p class="field-hint">Aktualisiert sich bei jedem Weitertippen.</p>`}

      ${step === 3 && html`
        ${area('gut', 'Was lief gut?', 'Was hat sich leichter angefühlt?')}
        <section class="section">
          <h2 class="sec-title">Deine Themen <span class="count">${myOpen.filter((n) => !n.done_at).length}</span></h2>
          ${myOpen.length ? html`<ul class="notes">${myOpen.map((n) => html`
            <li class=${`note${n.done_at ? ' is-done' : ''}`}>
              <label class="check"><input type="checkbox" checked=${!!n.done_at} onChange=${(e) => markNote(n, e.target.checked)}/>
                <span>${n.text}${n.card_id && cardOf(n.card_id) ? html` <span class="note-card">${plainName(cardOf(n.card_id).name)}</span>` : ''}</span></label>
            </li>`)}</ul>` : html`<p class="muted">Du hast keine offenen Notizen.</p>`}
          <p class="field-hint">Abhaken = besprochen. Die Themen der anderen Person stehen auf ihrem Handy unter Notizen.</p>
        </section>
        <section class="section">
          <h2 class="sec-title warn">Hat gehakt <span class="count warn">${draft.stuck.length}</span></h2>
          ${draft.stuck.map((s) => html`
            <div class="panel tight">
              <div class="panel-row"><b>${cardOf(s.card_id) ? plainName(cardOf(s.card_id).name) : s.card_id}</b>
                <button type="button" class="icon-btn" aria-label="Entfernen" onClick=${() => setDraft({ ...draft, stuck: draft.stuck.filter((x) => x !== s) })}><${IconTrash}/></button></div>
              ${s.note && html`<p class="muted">${s.note}</p>`}
            </div>`)}
          <div class="panel tight">
            <label class="field"><span class="label">Karte</span>
              <select value=${pick} onChange=${(e) => setPick(e.target.value)}>
                <option value="">Karte wählen …</option>
                ${deck.map((c) => html`<option value=${c.id}>${plainName(c.name)}</option>`)}
              </select></label>
            <label class="field"><span class="label">Was ist passiert? (optional)</span>
              <input value=${pickNote} onInput=${(e) => setPickNote(e.target.value)}/></label>
            <button type="button" class="btn ghost" disabled=${!pick} onClick=${addStuck}><${IconPlus}/> Hinzufügen</button>
          </div>
        </section>`}

      ${step === 4 && html`
        <p class="lead">Wer übernimmt was in der nächsten Woche? Besonders Daily Grinds dürfen oft wandern. Wechselt eine Karte, gibt es einen kurzen Übergabe-Moment.</p>
        ${free > 0 ? html`<p class="hint warn-hint">${free} ${free === 1 ? 'Karte ist' : 'Karten sind'} noch nicht verteilt.</p>` : html`<p class="ok-line">Alle Karten haben einen Owner.</p>`}
        <button type="button" class="btn primary" onClick=${() => ctx.goDeck({ dg: false, deal: true })}><${IconHand}/> Deck im Verteil-Modus öffnen</button>
        <p class="field-hint">Oder ihr verteilt am anderen Handy. Punkt 2 zeigt beim nächsten Mal alle Wechsel.</p>`}

      ${step === 5 && html`
        <p class="lead">Bei den Karten, die gehakt haben: Ist der Mindeststandard klar genug? Öffnet die Karte und schärft ihn nach.</p>
        ${draft.stuck.length ? html`<div class="section">${draft.stuck.map((s) => {
          const c = cardOf(s.card_id);
          if (!c) return '';
          return html`
            <button type="button" class="change" onClick=${() => ctx.openCard(c)}>
              <span class="change-text"><b>${plainName(c.name)}</b><span class=${c.msc ? '' : 'empty-msc'}>${c.msc || 'Noch kein Mindeststandard vereinbart'}</span></span>
              <${IconChevron}/>
            </button>`;
        })}</div>` : html`<p class="muted">Diese Woche hat nichts gehakt – weiter.</p>`}
        <details class="panel book"><summary class="label">Der MSC-Test, wenn ihr euch nicht einig seid</summary><ol>${MSC_TEST.map((q) => html`<li>${q}</li>`)}</ol></details>`}

      ${step === 6 && html`
        <p class="lead">Wer ist wann weg? Gibt es besondere Termine? Steht eine Wild Card an – Umzug, neuer Job, Krankheit?</p>
        ${area('vorschau', 'Notiz', 'z. B. Matthias Mi–Fr unterwegs, Elternabend am Do')}
        <p class="field-hint">Wild Cards holt ihr bei Bedarf vom Parkplatz ins Deck.</p>`}

      ${step === 7 && html`
        <p class="lead">Hatte jede*r die eigene Zeit? Das ist die einzige Karte, bei der ihr Score haltet.</p>
        ${adults.map((p) => {
          const u = draft.unicorn[p.id] || {};
          const set = (patch) => setDraft({ ...draft, unicorn: { ...draft.unicorn, [p.id]: { ...u, ...patch } } });
          return html`
            <div class="panel tight">
              <span class="owner-inline"><${OwnerDot} person=${p} size=${28}/>${p.name}</span>
              <div class="seg" role="group" aria-label=${`Unicorn Space ${p.name}`}>${UNI.map(([v, l]) => html`
                <button type="button" class=${`seg-btn${u.status === v ? ' on' : ''}`} aria-pressed=${u.status === v} onClick=${() => set({ status: v })}>${l}</button>`)}</div>
              <input class="plain-input" aria-label=${`Notiz ${p.name}`} value=${u.note || ''} onInput=${(e) => set({ note: e.target.value })} onBlur=${save} placeholder="Was hat gefehlt, was braucht es?"/>
            </div>`;
        })}`}

      ${step === 8 && html`
        <div class="panel">
          <div class="panel-row"><span class="label">Hat gehakt</span><b>${draft.stuck.length}</b></div>
          <div class="panel-row"><span class="label">Unicorn Space</span><span>${adults.map((p) => `${p.name}: ${(UNI.find(([v]) => v === (draft.unicorn[p.id] || {}).status) || [, '–'])[1]}`).join(' · ')}</span></div>
          <div class="panel-row"><span class="label">Nächster Check-in</span><span>${next ? fmtWhen(next) : 'noch kein Termin'}</span></div>
        </div>
        ${area('abschluss', 'Was nehmen wir mit?', 'Vereinbarungen, Dank, ein Satz für nächste Woche')}
        <button type="button" class="btn primary" onClick=${finish}><${IconCheck}/> Check-in abschließen</button>
        <button type="button" class="text-btn danger" onClick=${discard}>Check-in verwerfen</button>`}

      <div class="ci-nav">
        <button type="button" class="btn ghost" disabled=${step === 1} onClick=${() => go(step - 1)}>Zurück</button>
        ${step < 8 && html`<button type="button" class="btn primary wide" onClick=${() => go(step + 1)}>Weiter: ${CI[step].title}</button>`}
      </div>
    </div>`;
}

// ---------- Vergangene Check-ins ----------
export function HistoryPage({ ctx, onBack }) {
  const done = ctx.checkins.filter((c) => c.finished_at).sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  const cardName = (id) => { const c = ctx.cards.find((x) => x.id === id); return c ? plainName(c.name) : id; };
  const uniText = (u) => (UNI.find(([v]) => v === (u || {}).status) || [, '–'])[1];
  const block = (label, text) => text ? html`<div class="sec"><span class="label">${label}</span><p>${text}</p></div>` : '';
  return html`
    <div class="page">
      <${PageBar} label="Zurück" onBack=${onBack}/>
      <h1 class="page-title caps">Vergangene Check-ins</h1>
      ${!done.length && html`<p class="muted">Noch kein Check-in abgeschlossen.</p>`}
      ${done.map((c, i) => html`
        <details class="panel history" open=${i === 0}>
          <summary><b>${new Date(c.finished_at).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</b></summary>
          <div class="history-body">
          ${block('Ankommen', c.notes?.ankommen)}
          ${block('Was lief gut', c.notes?.gut)}
          ${(c.stuck || []).length > 0 && html`<div class="sec"><span class="label">Hat gehakt</span><ul>${c.stuck.map((s) => html`<li><b>${cardName(s.card_id)}</b>${s.note ? ` – ${s.note}` : ''}</li>`)}</ul></div>`}
          ${block('Vorschau', c.notes?.vorschau)}
          <div class="sec"><span class="label">Unicorn Space</span>
            <ul>${adultsOf(ctx.persons).map((p) => html`<li>${p.name}: ${uniText(c.unicorn?.[p.id])}${c.unicorn?.[p.id]?.note ? ` – ${c.unicorn[p.id].note}` : ''}</li>`)}</ul></div>
          ${block('Was wir mitnehmen', c.notes?.abschluss)}
          </div>
        </details>`)}
    </div>`;
}

// ---------- Notizen ----------
export function NoteSheet({ ctx, card, onClose }) {
  const [text, setText] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    try { await store.addNote(text.trim(), card?.id, ctx.meId); await ctx.reload(); ctx.toast('Für den Check-in notiert'); onClose(); } catch (x) { ctx.toast(`Hat nicht geklappt: ${x.message}`); }
  };
  return html`
    <${Sheet} title="Für den Check-in notieren" onClose=${onClose}>
      <form class="form" onSubmit=${save}>
        ${card && html`<p class="muted">Zur Karte „${plainName(card.name)}“</p>`}
        <label for="note-text">Was möchtest du ansprechen?</label>
        <textarea id="note-text" rows="4" value=${text} onInput=${(e) => setText(e.target.value)}></textarea>
        <p class="field-hint">Nur du siehst deine Notizen.</p>
        <div class="row">
          <button type="button" class="btn ghost" onClick=${onClose}>Abbrechen</button>
          <button type="submit" class="btn primary" disabled=${!text.trim()}>Speichern</button>
        </div>
      </form>
    </${Sheet}>`;
}

export function NotesPage({ ctx, onBack }) {
  const [text, setText] = useState('');
  const [cardId, setCardId] = useState('');
  const open = ctx.notes.filter((n) => !n.done_at);
  const done = ctx.notes.filter((n) => n.done_at);
  const deck = deckCards(ctx.cards).sort(byName);
  const cardOf = (id) => ctx.cards.find((c) => c.id === id);
  const run = async (fn, msg) => { try { await fn(); await ctx.reload(); if (msg) ctx.toast(msg); } catch (e) { ctx.toast(`Hat nicht geklappt: ${e.message}`); } };
  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    run(() => store.addNote(text.trim(), cardId, ctx.meId), 'Notiert');
    setText(''); setCardId('');
  };
  const item = (n) => {
    const c = n.card_id && cardOf(n.card_id);
    return html`
      <li class=${`note${n.done_at ? ' is-done' : ''}`} key=${n.id}>
        <div class="note-body">
          <p>${n.text}</p>
          <span class="note-meta">${fmtDate(n.created_at)}${c ? html` · <button type="button" class="link-btn" onClick=${() => ctx.openCard(c)}>${plainName(c.name)}</button>` : ''}</span>
        </div>
        <div class="note-actions">
          <button type="button" class="icon-btn" aria-label=${n.done_at ? 'Wieder offen' : 'Besprochen'} title=${n.done_at ? 'Wieder offen' : 'Besprochen'}
            onClick=${() => run(() => store.updateNote(n.id, n.done_at ? { done_at: null, checkin_id: null } : { done_at: new Date().toISOString() }))}>
            <span class=${`tick-box${n.done_at ? ' on' : ''}`}><${IconCheck} size=${16}/></span></button>
          <button type="button" class="icon-btn" aria-label="Löschen" onClick=${() => { if (confirm('Notiz löschen?')) run(() => store.deleteNote(n.id)); }}><${IconTrash}/></button>
        </div>
      </li>`;
  };
  return html`
    <div class="page">
      <${PageBar} label="Zurück" onBack=${onBack}/>
      <h1 class="page-title caps">Meine Notizen</h1>
      <p class="muted">Was du beim nächsten Check-in ansprechen möchtest. Nur du siehst deine Notizen.</p>
      <form class="panel form" onSubmit=${add}>
        <label for="new-note">Neues Thema</label>
        <textarea id="new-note" rows="3" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="z. B. Abendroutine an Trainingsabenden"></textarea>
        <label for="new-note-card">Zu einer Karte (optional)</label>
        <select id="new-note-card" value=${cardId} onChange=${(e) => setCardId(e.target.value)}>
          <option value="">Keine Karte</option>
          ${deck.map((c) => html`<option value=${c.id}>${plainName(c.name)}</option>`)}
        </select>
        <button type="submit" class="btn primary" disabled=${!text.trim()}><${IconPlus}/> Notieren</button>
      </form>
      <section class="section">
        <h2 class="sec-title">Offen <span class="count">${open.length}</span></h2>
        ${open.length ? html`<ul class="notes">${open.map(item)}</ul>` : html`<p class="muted">Keine offenen Themen.</p>`}
      </section>
      ${done.length > 0 && html`
        <details class="section">
          <summary class="sec-title">Besprochen <span class="count">${done.length}</span></summary>
          <ul class="notes">${done.map(item)}</ul>
        </details>`}
    </div>`;
}
