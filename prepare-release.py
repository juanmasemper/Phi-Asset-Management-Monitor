"""Build the protected deployment from the local monitor and its workbook snapshot."""

import json
from pathlib import Path
from shutil import copyfile


root = Path(__file__).resolve().parent
source = root / "dist"
release = root / ".release"
output = release / "dist"
output.mkdir(parents=True, exist_ok=True)

tables = json.loads((source / "data.json").read_text(encoding="utf-8"))
expected = ["Cedears", "ETF", "Base Cedears"]
if [table["name"] for table in tables] != expected or any(not table["rows"] for table in tables):
    raise ValueError("The workbook snapshot must contain all three populated tables.")

html = (source / "index.html").read_text(encoding="utf-8")
stylesheet = (source / "style.css").read_text(encoding="utf-8")
app = (source / "app.js").read_text(encoding="utf-8")
data = json.dumps(tables, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
replacements = {
    '<link rel="stylesheet" href="style.css">': f"<style>\n{stylesheet}</style>",
    '<script type="module" src="app.js"></script>': f'<script type="module">\n{app}</script>',
    '<script type="application/json" id="monitor-data"></script>':
        f'<script type="application/json" id="monitor-data">{data}</script>',
}
for marker, content in replacements.items():
    if html.count(marker) != 1:
        raise ValueError(f"Expected one release marker: {marker}")
    html = html.replace(marker, content, 1)

(output / "index.html").write_text(html, encoding="utf-8")
for asset in ("brand.gif", "brand.png", "favicon.png"):
    copyfile(source / asset, output / asset)
api = release / "api"
api.mkdir(exist_ok=True)
copyfile(root / "api" / "quotes.mjs", api / "quotes.mjs")
copyfile(root / "vercel.json", release / "vercel.json")
print(", ".join(f'{table["name"]} ({len(table["rows"])})' for table in tables))
