"""Package the public sign-in shell and server-only workbook for Vercel."""

import json
from pathlib import Path
from shutil import copyfile


root = Path(__file__).resolve().parent
source = root / "dist"
account = root / "account"
release = root / ".release-account"
output = release / "dist"
api = release / "api"
output.mkdir(parents=True, exist_ok=True)
api.mkdir(exist_ok=True)

tables = json.loads((source / "data.json").read_text(encoding="utf-8"))
if [table["name"] for table in tables] != ["Cedears", "ETF", "Base Cedears"] or any(not table["rows"] for table in tables):
    raise ValueError("The workbook snapshot must contain all three populated tables.")

html = (source / "index.html").read_text(encoding="utf-8")
account_actions = (
    '<button id="account-settings" class="asset-btn" type="button" aria-label="Configuración de cuenta" hidden>'
    '<span aria-hidden="true">⚙</span><span class="settings-label">Configuración</span></button>\n        '
    '<button id="account-sign-out" class="asset-btn" type="button" hidden>Cerrar sesión</button>'
)
replacements = {
    '<html lang="es-AR">': '<html lang="es-AR" data-account-gate>',
    '<script type="module" src="app.js"></script>': '<script type="module" src="account.js"></script>',
    '<main class="frame">': (account / "access.html").read_text(encoding="utf-8") + '<main class="frame" hidden>',
    '<div class="header-actions">': '<div class="header-actions">\n        ' + account_actions,
}
for marker, replacement in replacements.items():
    if html.count(marker) != 1:
        raise ValueError(f"Expected one account marker: {marker}")
    html = html.replace(marker, replacement, 1)

(output / "index.html").write_text(html, encoding="utf-8")
styles = (source / "style.css").read_text(encoding="utf-8") + "\n" + (account / "account.css").read_text(encoding="utf-8")
(output / "style.css").write_text(styles, encoding="utf-8")
for asset in ("app.js", "brand.gif", "brand.png", "favicon.png"):
    copyfile(source / asset, output / asset)
for asset in ("package.json", "package-lock.json", "account-client.mjs", "authorization.mjs"):
    copyfile(account / asset, release / asset)
for route in ("account-config.mjs", "monitor-data.mjs", "quotes.mjs"):
    copyfile(account / "api" / route, api / route)
copyfile(root / "api" / "quotes.mjs", release / "market-quotes.mjs")
(release / "workbook-data.mjs").write_text(
    "export const tables = " + json.dumps(tables, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
(release / "vercel.json").write_text(
    json.dumps({
        "framework": None,
        "buildCommand": "npm run build",
        "outputDirectory": "dist",
        "rewrites": [{"source": "/monitor", "destination": "/index.html"}],
    }),
    encoding="utf-8",
)
print(f"Prepared account shell and {sum(len(table['rows']) for table in tables)} protected rows.")
