"""Erzeugt sql/seed.sql aus data/cards.json."""
import json
import sys
from pathlib import Path

root = Path(sys.argv[1])
cards = json.loads((root / "data/cards.json").read_text(encoding="utf-8"))
PERSON = {"K": "'00000000-0000-4000-8000-00000000000a'", "M": "'00000000-0000-4000-8000-00000000000b'"}


def q(s):
    return "'" + (s or "").replace("'", "''") + "'"


rows = []
for i, c in enumerate(cards, start=1):
    trio = PERSON[c["trio"]] if c.get("trio") else "null"
    holder = trio  # Trio-Karten liegen immer bei ihrer Person, alle anderen sind noch unverteilt
    img = q(c["img"]) if c.get("img") else "null"
    rows.append(
        f"({q(c['id'])}, {i}, {q(c['cat'])}, {q(c['orig'])}, {q(c['name'])}, {'true' if c.get('dg') else 'false'}, "
        f"{trio}, {q(c.get('desc'))}, {q(c.get('c'))}, {q(c.get('p'))}, {q(c.get('e'))}, {q(c['status'])}, "
        f"{holder}, {q(c.get('note'))}, {img})"
    )

sql = (
    "-- Startdeck (Stand 1.11.2026). Nach schema.sql ausführen. Überschreibt nichts, was schon da ist.\n"
    "insert into fp_card (id, sort, cat, orig, name, is_dg, trio_owner, descr, conception, planning, execution, status, holder, parked_note, img) values\n"
    + ",\n".join(rows)
    + "\non conflict (id) do nothing;\n"
)
(root / "sql/seed.sql").write_text(sql, encoding="utf-8")
print(len(rows), "Karten")
