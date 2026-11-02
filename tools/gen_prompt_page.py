"""Erzeugt eine HTML-Seite mit allen Illustrations-Prompts (Kopieren-Button, Abhaken)."""
import html
import json
import re
import sys
from pathlib import Path

md = Path(sys.argv[1]).read_text(encoding="utf-8")
out = Path(sys.argv[2])

# Parse the generated prompts.md: sections (##), cards (###), prompt (``` block)
sections = []
for sec in re.split(r"^## ", md, flags=re.M)[1:]:
    title, body = sec.split("\n", 1)
    items = []
    for m in re.finditer(r"^### (\S+) · (.+?)\n\n```\n(.*?)\n```", body, flags=re.M | re.S):
        items.append({"id": m.group(1), "name": m.group(2), "prompt": m.group(3)})
    sections.append({"title": title.strip(), "items": items})
total = sum(len(s["items"]) for s in sections)

CAT_TOKEN = {"Zuhause": "home", "Unterwegs": "out", "Fürsorge": "care", "Magie": "magic", "Persönlicher": "unicorn"}


def cat_of(title):
    for k, v in CAT_TOKEN.items():
        if title.startswith(k):
            return v
    return "home"


parts = []
for s in sections:
    cat = cat_of(s["title"])
    cards = []
    for it in s["items"]:
        pid = it["id"]
        cards.append(f"""
<article class="prompt" data-id="{pid}" data-cat="{cat}">
  <header class="prompt-head">
    <span class="num">{pid}</span>
    <h3>{html.escape(it['name'])}</h3>
    <label class="done"><input type="checkbox" id="done-{pid}" data-done="{pid}"><span>Erledigt</span></label>
  </header>
  <pre class="text" id="text-{pid}">{html.escape(it['prompt'])}</pre>
  <button type="button" class="copy" data-copy="{pid}">Prompt kopieren</button>
</article>""")
    parts.append(f"""
<section class="cat cat-{cat}" aria-labelledby="h-{cat}">
  <h2 id="h-{cat}"><span class="dot" aria-hidden="true"></span>{html.escape(s['title'])}</h2>
  <div class="list">{''.join(cards)}
  </div>
</section>""")

page = f"""<title>Kartendeck-Prompts</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@600;700&family=Nunito:wght@400;600;800&display=swap">
<style>
/* Layout: eine ruhige Spalte wie ein Kartenstapel; jede Karte ein Prompt mit Kopieren-Knopf */
:root {{
  --paper: #FBF1E8; --ground: #EFE6DC; --ink: #3A3932; --ink-soft: #5A574F; --line: #E3D5C6;
  --home: #975E01; --out: #496E8F; --care: #A75324; --magic: #AA4A62; --unicorn: #766093;
  --home-a: #FEB742; --out-a: #AFC4D6; --care-a: #E9B69A; --magic-a: #C77F91; --unicorn-a: #A99ABD;
  --done-bg: #E8EBDC; --btn-bg: #3A3932; --btn-fg: #FBF1E8;
  --display: 'Roboto Slab', Georgia, serif; --body: 'Nunito', system-ui, sans-serif;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{
  --paper: #2B2925; --ground: #1F1D1A; --ink: #F1E8DE; --ink-soft: #C9BFB3; --line: #3D3A34;
  --home: #F2B54E; --out: #A9C2D8; --care: #EDB596; --magic: #E3A2B3; --unicorn: #C4B6DA;
  --done-bg: #2F3328; --btn-bg: #F1E8DE; --btn-fg: #1F1D1A; color-scheme: dark; }} }}
:root[data-theme="dark"] {{
  --paper: #2B2925; --ground: #1F1D1A; --ink: #F1E8DE; --ink-soft: #C9BFB3; --line: #3D3A34;
  --home: #F2B54E; --out: #A9C2D8; --care: #EDB596; --magic: #E3A2B3; --unicorn: #C4B6DA;
  --done-bg: #2F3328; --btn-bg: #F1E8DE; --btn-fg: #1F1D1A; color-scheme: dark; }}
body {{ background: var(--ground); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.5; }}
.wrap {{ max-width: 720px; margin: 0 auto; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 28px 64px; display: flex; flex-direction: column; gap: 28px; }}
h1 {{ font-family: var(--display); font-weight: 700; font-size: 28px; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; text-wrap: balance; }}
.intro {{ display: flex; flex-direction: column; gap: 10px; }}
.intro p {{ margin: 0; max-width: 62ch; color: var(--ink-soft); }}
.intro ul {{ margin: 0; padding-left: 20px; color: var(--ink-soft); display: flex; flex-direction: column; gap: 4px; }}
.progress {{ position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--ground); padding-block: 10px; display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 14px; }}
body::before {{ content: ""; position: fixed; inset: 0 0 auto; height: env(safe-area-inset-top, 0px); z-index: 10; background: var(--ground); }}
.bar {{ flex: 1; height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }}
.bar span {{ display: block; height: 100%; width: 0; background: var(--ink); transition: width .3s; }}
.cat {{ display: flex; flex-direction: column; gap: 14px; }}
.cat h2 {{ margin: 0; display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--c); }}
.dot {{ width: 14px; height: 14px; border-radius: 50%; background: var(--ca); border: 1.5px solid var(--ink); }}
.cat-home {{ --c: var(--home); --ca: var(--home-a); }} .cat-out {{ --c: var(--out); --ca: var(--out-a); }}
.cat-care {{ --c: var(--care); --ca: var(--care-a); }} .cat-magic {{ --c: var(--magic); --ca: var(--magic-a); }}
.cat-unicorn {{ --c: var(--unicorn); --ca: var(--unicorn-a); }}
.list {{ display: flex; flex-direction: column; gap: 14px; }}
.prompt {{ background: var(--paper); border: 1px solid var(--line); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }}
.prompt.is-done {{ background: var(--done-bg); }}
.prompt.is-done .text {{ display: none; }}
.prompt-head {{ display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }}
.num {{ font-family: var(--display); font-weight: 700; font-size: 13px; color: var(--c); min-width: 34px; font-variant-numeric: tabular-nums; }}
.prompt h3 {{ margin: 0; flex: 1; min-width: 0; font-family: var(--display); font-weight: 600; font-size: 16px; letter-spacing: 0.05em; text-transform: uppercase; }}
.done {{ display: inline-flex; align-items: center; gap: 6px; font-size: 14px; color: var(--ink-soft); min-height: 44px; cursor: pointer; }}
.done input {{ width: 20px; height: 20px; accent-color: var(--ink); }}
.text {{ margin: 0; white-space: pre-wrap; font-family: var(--body); font-size: 14px; line-height: 1.5; background: var(--ground); border-radius: 10px; padding: 12px; overflow-x: auto; }}
.copy {{ align-self: flex-start; min-height: 44px; padding: 0 18px; border: none; border-radius: 12px; background: var(--btn-bg); color: var(--btn-fg); font-family: var(--body); font-weight: 800; font-size: 15px; cursor: pointer; }}
.copy:focus-visible, .done input:focus-visible {{ outline: 3px solid var(--c); outline-offset: 2px; }}
@media (prefers-reduced-motion: reduce) {{ .bar span {{ transition: none; }} }}
</style>
<main class="wrap">
  <div class="intro">
    <h1>Kartendeck-Prompts</h1>
    <p>{total} Prompts, einer pro Karte. Kopieren, im selben ChatGPT-Chat wie bisher einfügen, fertig.</p>
    <ul>
      <li>Speichere jede Grafik unter ihrer Kartennummer, zum Beispiel H2.png.</li>
      <li>Schick mir die Bilder gesammelt, gern kategorienweise.</li>
      <li>Self-Care, Freundschaften und Unicorn Space haben persönliche Motive – ändere sie gern vor dem Abschicken.</li>
    </ul>
  </div>
  <div class="progress" aria-live="polite"><span id="count">0 von {total} erledigt</span><div class="bar" aria-hidden="true"><span id="bar"></span></div></div>
  {''.join(parts)}
</main>
<script>
(function () {{
  var KEY = 'fp-prompts-done';
  var done = {{}};
  try {{ done = JSON.parse(localStorage.getItem(KEY) || '{{}}') || {{}}; }} catch (e) {{ done = {{}}; }}
  var total = {total};
  function save() {{ try {{ localStorage.setItem(KEY, JSON.stringify(done)); }} catch (e) {{}} }}
  function refresh() {{
    var n = 0;
    document.querySelectorAll('[data-done]').forEach(function (cb) {{
      var id = cb.getAttribute('data-done');
      cb.checked = !!done[id];
      cb.closest('.prompt').classList.toggle('is-done', !!done[id]);
      if (done[id]) n++;
    }});
    document.getElementById('count').textContent = n + ' von ' + total + ' erledigt';
    document.getElementById('bar').style.width = (n / total * 100) + '%';
  }}
  document.addEventListener('change', function (e) {{
    var id = e.target.getAttribute && e.target.getAttribute('data-done');
    if (!id) return;
    if (e.target.checked) done[id] = true; else delete done[id];
    save(); refresh();
  }});
  document.addEventListener('click', function (e) {{
    var btn = e.target.closest && e.target.closest('[data-copy]');
    if (!btn) return;
    var id = btn.getAttribute('data-copy');
    var pre = document.getElementById('text-' + id);
    var text = pre.textContent;
    function ok() {{ btn.textContent = 'Kopiert'; setTimeout(function () {{ btn.textContent = 'Prompt kopieren'; }}, 1600); }}
    function fallback() {{
      var r = document.createRange(); r.selectNodeContents(pre);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      btn.textContent = 'Markiert – jetzt kopieren';
    }}
    try {{
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback);
      else fallback();
    }} catch (err) {{ fallback(); }}
  }});
  refresh();
}})();
</script>
"""
out.write_text(page, encoding="utf-8")
print(total, "prompts written to", out)
