"""Baut aus index.html eine Vorschau-Seite (Demo-Modus) für ein claude.ai-Artifact."""
import re
import shutil
import sys
from pathlib import Path

root = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
src = (root / "index.html").read_text(encoding="utf-8")

style = re.search(r"<style>.*?</style>", src, re.S).group(0)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts[^>]+>', src).group(0)
body = re.search(r"<body>(.*)</body>", src, re.S).group(1)
page = (
    "<title>Fair-Play-App Vorschau</title>\n"
    '<meta name="claude:viewport-fit-sides" content="cover">\n'
    f"{fonts}\n{style}\n{body}"
)
(out / "fair-play-vorschau.html").write_text(page, encoding="utf-8")

for d in ["js", "data", "img"]:
    if (out / d).exists():
        shutil.rmtree(out / d)
    shutil.copytree(root / d, out / d)
print("ok")
