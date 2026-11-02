-- Fair-Play-App: Tabellen, Zugriffsregeln und Personen
-- Einmal im Supabase SQL Editor ausführen. Danach seed.sql ausführen.
-- Alle Tabellen haben das Präfix fp_, damit sie neben anderen Apps im selben Projekt liegen können.

create table if not exists fp_person (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initial text not null,
  color text not null,
  role text not null default 'adult' check (role in ('adult', 'child')),
  user_id uuid unique references auth.users (id) on delete set null,
  sort int not null default 0
);

create table if not exists fp_card (
  id text primary key,                       -- z. B. H6, O3 (Nummer laut Buch)
  sort int not null,
  cat text not null check (cat in ('home', 'out', 'care', 'magic', 'wild', 'unicorn')),
  orig text not null,                        -- englischer Originalname
  name text not null,                        -- deutscher Name, | = erlaubte Trennstelle
  is_dg boolean not null default false,      -- Daily Grind
  trio_owner uuid references fp_person (id), -- nur Happiness Trio: feste Person
  descr text not null default '',
  conception text not null default '',
  planning text not null default '',
  execution text not null default '',
  msc text not null default '',              -- Mindeststandard, gemeinsam festlegen
  status text not null default 'deck' check (status in ('deck', 'parked')),
  holder uuid references fp_person (id),     -- leer = noch nicht verteilt
  only_me boolean not null default false,    -- Stapel 3: nur dem Owner wichtig
  parked_note text not null default '',
  img text,                                  -- Dateiname in img/
  updated_by uuid references fp_person (id),
  updated_at timestamptz not null default now()
);

create table if not exists fp_card_event (
  id bigint generated always as identity primary key,
  card_id text not null references fp_card (id) on delete cascade,
  action text not null check (action in ('dealt', 'parked', 'unparked', 'edited')),
  from_person uuid references fp_person (id),
  to_person uuid references fp_person (id),
  field text,
  by_person uuid references fp_person (id),
  at timestamptz not null default now()
);

-- Nur Mitglieder des Haushalts (Personen mit verknüpftem Login) dürfen lesen und schreiben.
create or replace function fp_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from fp_person where user_id = auth.uid());
$$;

alter table fp_person enable row level security;
alter table fp_card enable row level security;
alter table fp_card_event enable row level security;

drop policy if exists fp_person_all on fp_person;
create policy fp_person_all on fp_person for all to authenticated
  using (fp_is_member()) with check (fp_is_member());

drop policy if exists fp_card_all on fp_card;
create policy fp_card_all on fp_card for all to authenticated
  using (fp_is_member()) with check (fp_is_member());

drop policy if exists fp_event_all on fp_card_event;
create policy fp_event_all on fp_card_event for all to authenticated
  using (fp_is_member()) with check (fp_is_member());

-- Die beiden Spieler. Feste IDs, weil die Happiness-Trio-Karten auf sie verweisen.
insert into fp_person (id, name, initial, color, role, sort) values
  ('00000000-0000-4000-8000-00000000000a', 'Katja', 'K', '#990F4B', 'adult', 1),
  ('00000000-0000-4000-8000-00000000000b', 'Matthias', 'M', '#3B4C7A', 'adult', 2)
on conflict (id) do nothing;

-- ---------- Anleitung „Unser Weg“, Check-in und Notizen (2.11.2026) ----------

-- Person zum eingeloggten Konto
create or replace function fp_me() returns uuid
language sql stable security definer set search_path = public as $$
  select id from fp_person where user_id = auth.uid();
$$;
revoke execute on function fp_me() from public, anon;
grant execute on function fp_me() to authenticated;

-- Einstellungen, z. B. key 'checkin' = {"day": 0, "time": "19:30", "duration": 30} (day: 0 = Sonntag … 6 = Samstag)
create table if not exists fp_setting (
  key text primary key,
  value jsonb not null,
  updated_by uuid references fp_person (id),
  updated_at timestamptz not null default now()
);

-- Die 8 Schritte von „Unser Weg“; confirmed = {"<person id>": "<Zeitpunkt>"} für das Versprechen
create table if not exists fp_step (
  step int primary key check (step between 1 and 8),
  done_at timestamptz,
  done_by uuid references fp_person (id),
  confirmed jsonb not null default '{}'::jsonb
);

-- Ein Check-in; notes = Texte je Punkt, unicorn = {"<person id>": {"status": "ja|teils|nein", "note": ""}},
-- stuck = [{"card_id": "H6", "note": ""}] (Karten, die gehakt haben)
create table if not exists fp_checkin (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  since timestamptz,
  by_person uuid references fp_person (id),
  notes jsonb not null default '{}'::jsonb,
  unicorn jsonb not null default '{}'::jsonb,
  stuck jsonb not null default '[]'::jsonb
);

-- Private Notizen für den nächsten Check-in
create table if not exists fp_note (
  id uuid primary key default gen_random_uuid(),
  author uuid not null default fp_me() references fp_person (id),
  text text not null,
  card_id text references fp_card (id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz,
  checkin_id uuid references fp_checkin (id) on delete set null
);
create index if not exists fp_note_author_idx on fp_note (author);
create index if not exists fp_card_event_at_idx on fp_card_event (at);

alter table fp_setting enable row level security;
alter table fp_step enable row level security;
alter table fp_checkin enable row level security;
alter table fp_note enable row level security;

drop policy if exists fp_setting_all on fp_setting;
create policy fp_setting_all on fp_setting for all to authenticated
  using (fp_is_member()) with check (fp_is_member());
drop policy if exists fp_step_all on fp_step;
create policy fp_step_all on fp_step for all to authenticated
  using (fp_is_member()) with check (fp_is_member());
drop policy if exists fp_checkin_all on fp_checkin;
create policy fp_checkin_all on fp_checkin for all to authenticated
  using (fp_is_member()) with check (fp_is_member());
-- Notizen sind privat: nur die Person, die sie geschrieben hat, sieht und ändert sie.
drop policy if exists fp_note_own on fp_note;
create policy fp_note_own on fp_note for all to authenticated
  using (author = (select fp_me())) with check (author = (select fp_me()));

insert into fp_step (step, done_at) values
  (1, '2026-11-01T20:00:00+01:00'), (2, null), (3, null), (4, null), (5, null), (6, null), (7, null), (8, null)
on conflict (step) do nothing;
