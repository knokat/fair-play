# Fair Play – Karten-App

Web-App für Katja und Matthias: Wer hält welche Fair-Play-Karte, Re-Deal, Parkplatz, Kartentexte mit CPE und Mindeststandard.
Preact + htm ohne Build-Schritt, Supabase als Datenbank, gehostet auf GitHub Pages.

## Dateien

```
index.html          Gerüst, Styles, Schriften
manifest.json       Homescreen-Icon und Name
js/config.js        Supabase-Zugang (leer = Demo-Modus)
js/store.js         Laden und Speichern (Supabase oder Demo im Browser)
js/meta.js          Kategorien, Farben, Helfer
js/components.js    Kartendarstellung klein und groß, Icons
js/app.js           Ansichten: Meine, Matthias, Deck, Parkplatz, Kartendetail, Menü
js/journey.js       Unser Weg (7 Schritte), geführter Check-in, vergangene Check-ins, private Notizen
data/cards.json     Startdeck: alle 100 Karten mit Status und Texten
img/                Illustrationen, Dateiname = Kartennummer (H6.png …)
sql/schema.sql      Tabellen und Zugriffsregeln
sql/seed.sql        Startdeck als SQL (aus data/cards.json erzeugt)
tools/              Skripte, die seed.sql und die Prompt-Seite erzeugen
```

## Wo was läuft

- **App:** https://knokat.github.io/fair-play/ (GitHub Pages, Branch `main`, Ordner `/`)
- **Datenbank:** Supabase-Projekt „Workout Tracker“ (`zkqfeqtnoxgoepmykupd`), Tabellen `fp_person`, `fp_card`, `fp_card_event`, `fp_setting`, `fp_step`, `fp_checkin`, `fp_note` (Notizen sieht nur die Person, die sie schreibt)
- **Logins:** Supabase Auth mit E-Mail und Passwort. Jede Person in `fp_person` ist über `user_id` mit ihrem Login verknüpft; nur verknüpfte Logins sehen Daten.

## Matthias freischalten

1. Supabase › Authentication › Users › Add user: Matthias' E-Mail und ein Passwort, „Auto Confirm User“ an.
2. Verknüpfen:
   ```sql
   update fp_person set user_id = (select id from auth.users where email = 'MATTHIAS@EMAIL') where initial = 'M';
   ```

## Neu aufsetzen (nur falls nötig)

Im SQL Editor erst `sql/schema.sql`, dann `sql/seed.sql` ausführen, Logins verknüpfen, `js/config.js` ausfüllen.

## Neue Illustrationen

Bild als `img/<Kartennummer>.png` ablegen (z. B. `img/H2.png`) und in der Datenbank eintragen:

```sql
update fp_card set img = 'H2.png' where id = 'H2';
```

Ohne Bild zeigt die Karte einen Kreis in der Kategoriefarbe.

## Demo-Modus

Sind URL und Key in `js/config.js` leer, startet die App ohne Login mit dem Startdeck. Änderungen bleiben nur im jeweiligen Browser. Im Menü kann man zwischen Katja und Matthias wechseln.

## Nach einem Update

Neue Dateien hochladen, dann in der App Menü › App aktualisieren.
