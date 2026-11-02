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
