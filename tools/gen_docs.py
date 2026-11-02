"""Erzeugt die Markdown-Inhalte für die Doc-Tabs (Prompts, Kartentexte) aus data/cards.json."""
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
out = Path(sys.argv[2])
cards = json.loads((root / "data/cards.json").read_text(encoding="utf-8"))

CATS = {
    "home": ("Zuhause", "Senfgelb", "#FEB742"),
    "out": ("Unterwegs & Organisation", "Taubenblau", "#AFC4D6"),
    "care": ("Fürsorge", "Apricot", "#E9B69A"),
    "magic": ("Magie & Rituale", "Altrosa", "#C77F91"),
    "wild": ("Große Lebensereignisse", "Terrakotta", "#D77D5D"),
    "unicorn": ("Persönlicher Freiraum", "Lavendel", "#A99ABD"),
}
SIDE = [("Honiggelb", "#FEB742"), ("Taubenblau", "#AFC4D6"), ("Salbeigrün", "#A7A471"), ("Altrosa", "#C77F91")]


def plain(name):
    return name.replace("|", "")


# --- Prompts -------------------------------------------------------------
order = ["home", "out", "care", "magic", "unicorn"]
todo = [c for c in cards if c["status"] == "deck" and not c.get("img")]
lines = [
    "# Illustrations-Prompts",
    "",
    f"{len(todo)} Prompts, je einer pro Karte, fertig zum Kopieren. Schick sie im selben ChatGPT-Chat wie die bisherigen Illustrationen, damit der Stil gleich bleibt.",
    "",
    "- Speichere jede Grafik am besten unter der Kartennummer, z. B. **H2.png** – dann kann ich sie ohne Raten zuordnen.",
    "- Schick sie mir gesammelt, gern kategorienweise.",
    "- Wenn eine Grafik nicht passt, einfach im ChatGPT-Chat nachbessern lassen.",
    "- Die Motive für Self-Care, Freundschaften und Unicorn Space sind persönlich gedacht. Ändere sie gern, bevor du sie abschickst.",
    "",
]
for cat in order:
    group = [c for c in todo if c["cat"] == cat]
    if not group:
        continue
    label, accent_name, accent = CATS[cat]
    lines += [f"## {label} ({len(group)})", ""]
    opts = [f"{n} ({h})" for n, h in SIDE if h != accent]
    side = ", ".join(opts[:-1]) + " oder " + opts[-1]
    for c in group:
        name = plain(c["name"])
        prompt = (
            f"Neue Illustration für unser Kartendeck: „{name}“, Kategorie „{label}“.\n\n"
            f"Motiv: {c['motif']}.\n\n"
            "Stil: exakt wie die bisherigen Illustrationen in diesem Chat – Tusche-Linien in warmem Anthrazit (#3A3932), "
            "leicht versetzte flächige Farben, gleiche Strichstärke, kleine Bewegungsstriche.\n\n"
            f"Farben: Akzentfarbe {accent_name} ({accent}) für ausgewählte Flächen, dazu Creme (#FBF1E8) "
            f"und höchstens eine Nebenfarbe aus {side}.\n\n"
            "Nur die Illustration: keine Karte, kein Rahmen, kein Text, transparenter Hintergrund, quadratisch 1024 × 1024 px."
        )
        lines += [f"### {c['id']} · {name}", "", "```", prompt, "```", ""]
(out / "prompts.md").write_text("\n".join(lines), encoding="utf-8")

# --- Kartentexte ----------------------------------------------------------
deck = [c for c in cards if c["status"] == "deck"]
t = [
    "# Kartentexte",
    "",
    f"Starttexte für die {len(deck)} Karten im Deck (inklusive Unicorn Space). Sie sind in der App hinterlegt und dort jederzeit änderbar. Am besten geht ihr sie gemeinsam durch, wenn ihr die Karten verteilt; den Mindeststandard legt ihr dabei selbst fest.",
    "",
    "Die geparkten Karten haben bisher nur eine kurze Beschreibung. Holt ihr eine zurück ins Deck, ergänzt ihr die Texte in der App.",
    "",
]
for cat in order:
    group = [c for c in deck if c["cat"] == cat]
    if not group:
        continue
    t += [f"## {CATS[cat][0]} ({len(group)})", "", "| Karte | Worum geht's | Dran-Denken | Planen | Erledigen |", "| --- | --- | --- | --- | --- |"]
    for c in group:
        cell = lambda s: s.replace("|", "/")
        t.append(f"| **{plain(c['name'])}** ({c['id']}) | {cell(c['desc'])} | {cell(c['c'])} | {cell(c['p'])} | {cell(c['e'])} |")
    t.append("")
(out / "kartentexte.md").write_text("\n".join(t), encoding="utf-8")
print(len(todo), "prompts;", len(deck), "deck cards")
