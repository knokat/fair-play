// Kartendarstellung (klein im Deck, groß im Detail) und Icons.
import { html } from 'https://unpkg.com/htm@3.1.1/preact/standalone.module.js';
import { CATS, cardName, plainName, isTrio } from './meta.js';

// ---------- Icons ----------
export const Cup = ({ fill, size = 24, label = 'Daily Grind' }) => html`
  <svg role="img" aria-label=${label} viewBox="0 0 32 32" width=${size} height=${size} fill="none" stroke="var(--card-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3.5c-1.2 1.6 1.2 2.6 0 4.5M17 3.5c-1.2 1.6 1.2 2.6 0 4.5"/>
    <path d="M5 12h18v6a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7z" fill=${fill}/>
    <path d="M23 14h2.5a3 3 0 0 1 0 6H22.5"/>
  </svg>`;

export const Smile = ({ fill, size = 24 }) => html`
  <svg role="img" aria-label="Happiness Trio" viewBox="0 0 32 32" width=${size} height=${size} fill="none" stroke="var(--card-ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="16" cy="16" r="11" fill=${fill}/>
    <path d="M11 18.5a6 6 0 0 0 10 0"/><path d="M12 13h.01M20 13h.01" stroke-width="3"/>
  </svg>`;

const icon = (d, size = 20) => html`<svg aria-hidden="true" viewBox="0 0 24 24" width=${size} height=${size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const IconBack = () => icon(html`<path d="M15 18l-6-6 6-6"/>`, 24);
export const IconSwap = () => icon(html`<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>`);
export const IconPark = () => icon(html`<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16V8h3a2.5 2.5 0 0 1 0 5h-3"/>`);
export const IconEdit = () => icon(html`<path d="M4 20h4L19 9l-4-4L4 16v4z"/>`);
export const IconMenu = () => icon(html`<path d="M4 7h16M4 12h16M4 17h16"/>`, 24);
export const IconFlip = () => icon(html`<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>`, 16);
export const IconHand = () => icon(html`<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11"/><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M14 10.5V6a1.5 1.5 0 0 1 3 0v6"/><path d="M17 11a1.5 1.5 0 0 1 3 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L4.3 15a1.5 1.5 0 0 1 2.4-1.8L8 15"/>`);

// ---------- Owner ----------
export function OwnerDot({ person, size = 26 }) {
  if (!person) {
    return html`<span class="owner-free" style=${`width:${size}px;height:${size}px`} role="img" aria-label="Noch frei">?</span>`;
  }
  return html`<span class="owner-dot" role="img" aria-label=${person.name}
    style=${`width:${size}px;height:${size}px;background:${person.color};font-size:${Math.round(size * 0.48)}px`}>${person.initial}</span>`;
}

function Illustration({ card }) {
  const cat = CATS[card.cat];
  if (card.img) return html`<img class="illus" src=${`img/${card.img}`} alt="" loading="lazy"/>`;
  return html`<div class="illus illus-empty" aria-hidden="true"><span style=${`background:${cat.accent}`}></span></div>`;
}

const Paper = () => html`<svg class="paper" aria-hidden="true"><rect width="100%" height="100%" filter="url(#paper)"/></svg>`;

// ---------- Kleine Karte (Deck, Listen) ----------
export function SmallCard({ card, persons, onClick, mark }) {
  const cat = CATS[card.cat];
  const holder = persons.find((p) => p.id === card.holder);
  const parked = card.status === 'parked';
  const free = !parked && !holder;
  const label = [plainName(card.name), parked ? 'auf dem Parkplatz' : holder ? holder.name : 'noch frei', card.is_dg ? 'Daily Grind' : '', card.only_me ? 'nur mir wichtig' : ''].filter(Boolean).join(', ');
  return html`
    <button type="button" class=${`card-s${free ? ' is-free' : ''}${parked ? ' is-parked' : ''}${mark ? ' is-marked' : ''}`} onClick=${onClick} aria-label=${label}>
      <${Paper}/>
      <div class="card-top">
        <span class="cat-v" style=${`color:${cat.ink}`}>${cat.label}</span>
        <div class="title-block">
          <span class="title" lang="de">${cardName(card.name)}</span>
          <span class="orig">${card.orig}</span>
        </div>
      </div>
      <${Illustration} card=${card}/>
      ${parked
        ? html`<div class="card-bottom note">${card.parked_note || 'Geparkt'}</div>`
        : html`<div class="card-bottom">
            <span class="ico">${card.is_dg ? html`<${Cup} fill=${cat.accent} size=${22}/>` : isTrio(card) ? html`<${Smile} fill=${cat.accent} size=${22}/>` : ''}</span>
            ${card.only_me ? html`<span class="only-me" title="Nur mir wichtig">nur mir</span>` : ''}
            <${OwnerDot} person=${holder}/>
          </div>`}
    </button>`;
}

// ---------- Große Karte mit Rückseite ----------
export function BigCard({ card, persons, flipped, onFlip }) {
  const cat = CATS[card.cat];
  const holder = persons.find((p) => p.id === card.holder);
  const parked = card.status === 'parked';
  const sections = [
    ['Worum geht’s', card.descr],
    ['Dran-Denken', card.conception],
    ['Planen', card.planning],
    ['Erledigen', card.execution],
  ];
  return html`
    <div class=${`flip${flipped ? ' is-flipped' : ''}`}>
      <button type="button" class="flip-inner" onClick=${onFlip}
        aria-label=${flipped ? 'Karte umdrehen, Vorderseite zeigen' : 'Karte umdrehen, Beschreibung zeigen'}>
        <div class=${`face front card-l${parked ? ' is-parked' : ''}`} aria-hidden=${flipped ? 'true' : 'false'}>
          <${Paper}/>
          <div class="card-top">
            <span class="cat-v" style=${`color:${cat.ink}`}>${cat.label}</span>
            <div class="title-block">
              <span class="title" lang="de">${cardName(card.name)}</span>
              <span class="orig">${card.orig}</span>
            </div>
          </div>
          <${Illustration} card=${card}/>
          <div class="card-bottom">
            <span class="ico">${card.is_dg ? html`<${Cup} fill=${cat.accent} size=${42}/>` : isTrio(card) ? html`<${Smile} fill=${cat.accent} size=${42}/>` : ''}</span>
            ${parked
              ? html`<span class="parked-tag"><${IconPark}/> Parkplatz</span>`
              : html`<span class="owner-big"><${OwnerDot} person=${holder} size=${46}/>${holder ? html`<span class="owner-name">${holder.name}</span>` : ''}</span>`}
          </div>
        </div>
        <div class="face back card-l" aria-hidden=${flipped ? 'false' : 'true'}>
          <${Paper}/>
          <div class="back-head">
            <span class="title" lang="de">${cardName(card.name)}</span>
            <span class="cat-h" style=${`color:${cat.ink}`}>${cat.label}</span>
          </div>
          <div class="back-body">
            ${sections.map(([h, t]) => t ? html`<div class="sec"><span class="sec-h" style=${`color:${cat.ink}`}>${h}</span><p>${t}</p></div>` : '')}
            <div class="sec msc">
              <span class="sec-h" style=${`color:${cat.ink}`}>Mindeststandard</span>
              <p class=${card.msc ? '' : 'empty'}>${card.msc || 'Noch nicht vereinbart'}</p>
            </div>
          </div>
        </div>
      </button>
    </div>`;
}
