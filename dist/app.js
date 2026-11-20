const $ = (selector) => document.querySelector(selector);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const formatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
const collator = new Intl.Collator("es-AR", { sensitivity: "base", numeric: true });
const state = { sheets: [], index: 0, page: 0, chart: null };
const pageSize = 25;
const controls = ["#search", "#sort", "#sector", "#only"].map($);
const markets = {
  NASDAQ: "SKHY NVDA MU GOOGL AVGO SNDK AMD PLTR ASML META AAPL MSFT AMZN INTC QCOM TSLA LRCX MRVL CSCO COST CRWD RKLB TEM ASTS ONDS ETSY PEP SBUX MRNA BNTX TMUS ADBE AAL UAL COIN RIOT MSTR MARA ANT SPCX MELI FSLR HON WMT",
  NYSE: "BE VST TSM CCJ ORCL DELL LLY V JPM CVX PG MRK GE NVS HSBC PM VALE SHEL STLA CAT RTX VZ NEE COP BBD BHP T UBER NVO MO FCX NU O CRM GS HD TGT KO DIS BBY NKE LMND BA GLW ETN XOM JNJ PFE AZN UNH ABT ABBV CVS NIO F GM TM HMC RACE PINS DAL FDX HPQ",
  AMEX: "SPY IWM EEM XLF XLE DIA EWZ ARKK SH GLD FXI IEUR IBB VEA IVE IVW XLC XLY XLB XLI XLK XLV XLP XLRE IJH EWJ SLV PSQ VIG URA SMH SPXL XLU CIBR SGOV BOXX SHV EWY COPX",
};

function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^-?\d+(?:[.,]\d+)*$/.test(value)) return null;
  const number = Number(value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value);
  return Number.isFinite(number) ? number : null;
}

function valuation(row, sheet) {
  if (sheet.name === "ETF" || row.exclude) return { target: null, forward: null };
  const primary = sheet.name === "Cedears";
  const price = numeric(row.v[primary ? "C" : "G"]);
  const goal = numeric(row.v[primary ? "M" : "AN"]);
  const forward = numeric(row.v[primary ? "L" : "AD"]) ?? (primary ? numeric(row.v.W) : null);
  return { target: price > 0 && goal > 0 ? goal / price - 1 : null, forward: forward > 0 ? forward : null };
}

function displayed(value, key, sheet) {
  if (value === null || value === undefined) return "—";
  if (typeof value !== "number") return value;
  if (sheet.name === "Cedears" && (key === "D" || key === "O")) return percentage.format(value);
  return formatter.format(value);
}

function sheet() { return state.sheets[state.index]; }
function nameOf(row) { return row.v.A ?? row.v[sheet().columns[1][0]]; }
function tickerOf(row) { return row.v[sheet().columns[1][0]]; }
function sectorOf(row) { return row.v[sheet().name === "Cedears" ? "X" : sheet().name === "ETF" ? "C" : "E"]; }
function normalized(text) { return String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(); }

function selectSheet(index) {
  state.index = index;
  state.page = 0;
  $("#sector").replaceChildren(new Option("Todos los sectores", ""));
  const sectors = [...new Set(sheet().rows.map(sectorOf).filter(Boolean))].sort(collator.compare);
  for (const sector of sectors) $("#sector").add(new Option(sector, sector));
  const isFund = sheet().name === "ETF";
  for (const option of $("#sort").options) {
    if (["target", "forward"].includes(option.value)) option.disabled = isFund;
  }
  if (isFund && $("#sort").selectedOptions[0].disabled) $("#sort").value = "name";
  $(".valuation").hidden = isFund;
  if (isFund) $("#only").checked = false;
  for (const [i, button] of [...$("#sheets").children].entries()) button.setAttribute("aria-current", String(i === index));
  const head = node("tr");
  for (const [key, label] of sheet().columns) {
    const cell = node("th", label);
    cell.scope = "col";
    if (!label) cell.setAttribute("aria-label", key === "N" ? "Columna N del Excel" : "Columna O del Excel");
    head.append(cell);
  }
  $("#table thead").replaceChildren(head);
  $(".table-scroll").scrollTo(0, 0);
  render();
}

function render() {
  const table = sheet();
  if (!table) return;
  const query = normalized($("#search").value.trim());
  const sector = $("#sector").value;
  const sort = $("#sort").value;
  const only = $("#only").checked;
  const rows = table.rows.map(row => ({ row, value: valuation(row, table) })).filter(({ row, value }) =>
    (!query || normalized(nameOf(row) + " " + (tickerOf(row) ?? "")).includes(query)) &&
    (!sector || sectorOf(row) === sector) &&
    (!only || (sort === "target" ? value.target !== null : sort === "forward" ? value.forward !== null : value.target !== null || value.forward !== null))
  );
  rows.sort((a, b) => {
    const byName = () => collator.compare(nameOf(a.row), nameOf(b.row)) || a.row.row - b.row.row;
    if (sort === "priority") return a.row.row - b.row.row;
    if (sort === "target" && a.value.target !== b.value.target) return (b.value.target ?? -Infinity) - (a.value.target ?? -Infinity);
    if (sort === "forward" && a.value.forward !== b.value.forward) return (a.value.forward ?? Infinity) - (b.value.forward ?? Infinity);
    return byName();
  });
  const total = Math.max(1, Math.ceil(rows.length / pageSize));
  state.page = Math.min(state.page, total - 1);
  const start = state.page * pageSize;
  const body = document.createDocumentFragment();
  for (const { row } of rows.slice(start, start + pageSize)) {
    const tr = node("tr");
    for (const [key] of table.columns) {
      const value = row.v[key];
      const td = node("td", undefined, value == null ? "missing" : undefined);
      if (key === "A") {
        const button = node("button", nameOf(row), "row-open");
        button.type = "button";
        button.addEventListener("click", () => openAsset(row, table));
        td.append(button);
        const score = valuation(row, table);
        if (sort === "target" && score.target !== null) td.append(node("small", percentage.format(score.target) + " al objetivo", score.target >= 0 ? "positive" : "negative"));
        if (sort === "forward" && score.forward !== null) td.append(node("small", formatter.format(score.forward) + "× P/E futuro", "muted"));
      } else {
        td.textContent = displayed(value, key, table);
        if (value == null) td.title = "Sin dato verificado";
        if (table.name === "Cedears" && ["D", "E", "O"].includes(key) && value) td.classList.add(value > 0 ? "positive" : "negative");
      }
      if (row.sources[key]) td.title = row.sources[key][0];
      tr.append(td);
    }
    body.append(tr);
  }
  $("#table tbody").replaceChildren(body);
  $("#status").textContent = rows.length ? `${start + 1}–${Math.min(start + pageSize, rows.length)} de ${rows.length} filas` : "0 filas";
  $("#empty").hidden = rows.length > 0;
  $("#page").textContent = `${state.page + 1} / ${total}`;
  $("#prev").disabled = state.page === 0;
  $("#next").disabled = state.page >= total - 1;
}

function link(label, url) {
  const a = node("a", label);
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}

function findMarket(row, table, symbol) {
  if (symbol === "NASDAQ:WBA" || !symbol) return null;
  if (symbol === "005930.KS") return "KRX:005930";
  if (symbol === "IB01.L") return "LSE:IB01";
  if (symbol === "WEGE3" && table.name === "Cedears") return "BCBA:WEGE3";
  if (table.name === "Base Cedears" && (row.v.J === "BR" && /\d$/.test(symbol))) return null;
  const market = Object.keys(markets).find(exchange => markets[exchange].split(" ").includes(symbol));
  return market ? `${market}:${symbol}` : null;
}

function chart(mount, symbol, title) {
  const container = node("div", undefined, "tradingview-widget-container");
  container.append(node("div", undefined, "tradingview-widget-container__widget"));
  const attribution = node("div", undefined, "tradingview-widget-copyright");
  attribution.append(link(`${title} · TradingView`, `https://www.tradingview.com/symbols/${symbol.replace(":", "-")}/`));
  container.append(attribution);
  const script = node("script");
  script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
  script.async = true;
  script.textContent = JSON.stringify({
    symbols: [[title, symbol + "|1D"]], width: "100%", height: 325, locale: "es",
    colorTheme: document.documentElement.dataset.theme,
    isTransparent: false, showVolume: false, showChart: true, chartType: "area",
  });
  script.addEventListener("error", () => mount.replaceChildren(attribution, node("p", "No se pudo cargar el gráfico.", "muted")));
  mount.replaceChildren(container);
  container.append(script);
}

function openAsset(row, table) {
  const name = nameOf(row);
  const symbol = tickerOf(row);
  $("#asset-title").textContent = name;
  $("#asset-symbol").textContent = symbol ?? "";
  const body = $("#asset-body");
  const info = node("p", row.session ? `Cierre histórico consultado · ${row.session}. Otros campos provienen del Excel.` : "Valores de referencia del Excel.", "muted");
  body.replaceChildren(info);
  if (row.note) body.append(node("p", row.note, "muted"));
  const values = valuation(row, table);
  if (values.target !== null) body.append(node("p", `Distancia al precio objetivo ${percentage.format(values.target)}`));
  if (values.forward !== null) body.append(node("p", `P/E futuro ${formatter.format(values.forward)}×`));
  const links = node("div", undefined, "asset-links");
  const market = findMarket(row, table, symbol);
  const mount = node("div", undefined, "chart");
  mount.hidden = true;
  if (market) {
    const action = node("button", "Cargar gráfico de mercado", "asset-btn");
    action.type = "button";
    action.addEventListener("click", () => {
      mount.hidden = false;
      chart(mount, market, symbol);
      action.disabled = true;
      state.chart = { mount, market, symbol };
    });
    links.append(action);
  }
  if (symbol && symbol !== "NASDAQ:WBA") {
    const yahoo = {"WEGE3": table.name === "Cedears" ? "WEGE3.BA" : "WEGE3.SA", "BRK.B": "BRK-B", "STLAM": "STLAM.MI"};
    const resolved = yahoo[symbol] ?? (table.name === "Base Cedears" && row.v.J === "BR" && /\d$/.test(symbol) ? symbol + ".SA" : symbol);
    links.append(link("Consultar cotización en Yahoo Finance", `https://finance.yahoo.com/quote/${encodeURIComponent(resolved)}/`));
    if ((table.name === "Base Cedears" || row.v.E && table.name === "ETF") && /^[A-Z0-9.]+$/.test(symbol)) {
      links.append(link("Consultar CEDEAR en ARS", `https://www.tradingview.com/symbols/BCBA-${encodeURIComponent(symbol)}/`));
    }
  }
  body.append(links);
  if (market) body.append(mount);
  const list = node("dl", undefined, "asset-data");
  for (const [key, label] of table.columns) {
    list.append(node("dt", label || `Columna ${key} del Excel`), node("dd", displayed(row.v[key], key, table)));
  }
  body.append(list);
  const sources = Object.entries(row.sources);
  if (sources.length) {
    const details = node("details", undefined, "asset-sources");
    details.append(node("summary", "Fuentes de datos completados"));
    const sourceList = node("ul");
    for (const [key, [label, url]] of sources) {
      const li = node("li", (table.columns.find(col => col[0] === key)?.[1] || key) + " · ");
      li.append(url ? link(label, url) : document.createTextNode(label));
      sourceList.append(li);
    }
    details.append(sourceList);
    body.append(details);
  }
  $("#asset").showModal();
}

function theme(value) {
  document.documentElement.dataset.theme = value;
  $("#theme").textContent = value === "dark" ? "☀ Tema claro" : "☾ Tema oscuro";
  if (state.chart) chart(state.chart.mount, state.chart.market, state.chart.symbol);
}

function paintHero() {
  const canvas = $("#hero-art");
  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  const x = (a, b) => width * (.10 + a * .087 + b * .052);
  const y = (a, b) => height * (.83 - a * .043 + b * .087);
  const polygon = (points, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const [j, [u, v]] of points.entries()) j ? ctx.lineTo(u, v) : ctx.moveTo(u, v);
    ctx.closePath();
    ctx.fill();
  };
  const grid = (a, b, c, d) => {
    ctx.beginPath();
    ctx.moveTo(x(a,b), y(a,b));
    ctx.lineTo(x(c,d), y(c,d));
    ctx.stroke();
  };
  ctx.strokeStyle = "#86d6ab45";
  for (let i = 0; i <= 10; i++) grid(i, -3, i, 2);
  for (let i = -3; i <= 2; i++) grid(0, i, 10, i);
  const levels = [0.16, .23, .19, .32, .38, .31, .49, .58, .52, .64];
  for (let i = 0; i < levels.length; i++) {
    const left = x(i,-.4), base = y(i,-.4), top = base - height * levels[i] * .7;
    const w = width * .047, dx = width * .028, dy = height * .038;
    const light = levels[i] > (levels[i - 1] ?? 0);
    polygon([[left,base],[left+w,base-dy],[left+w,top-dy],[left,top]], light ? "#3a9f76" : "#397666");
    polygon([[left+w,base-dy],[left+w+dx,base],[left+w+dx,top],[left+w,top-dy]], light ? "#21654d" : "#255349");
    polygon([[left,top],[left+w,top-dy],[left+w+dx,top],[left+dx,top+dy]], light ? "#9becc0" : "#72a794");
  }
}

for (const control of controls) control.addEventListener(control.type === "search" ? "input" : "change", () => { state.page = 0; render(); });
for (const [button, direction] of [["#prev", -1], ["#next", 1]]) {
  $(button).addEventListener("click", () => { state.page += direction; $(".table-scroll").scrollTop = 0; render(); });
}
const dialog = $("#asset");
$("#close").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => { state.chart = null; $("#asset-body").replaceChildren(); });
$("#theme").addEventListener("click", () => {
  const value = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  theme(value);
  try { localStorage.setItem("phi-theme", value); } catch {}
});
let savedTheme;
try { savedTheme = localStorage.getItem("phi-theme"); } catch {}
theme(savedTheme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
new ResizeObserver(paintHero).observe($("#hero-art"));

function initialize(sheets) {
  state.sheets = sheets;
  const cards = document.createDocumentFragment();
  const tabs = document.createDocumentFragment();
  for (const [index, table] of sheets.entries()) {
    const card = node("div", undefined, "metric");
    const caption = ["Acciones seleccionadas", "ETF", "Base de CEDEARs"][index];
    card.append(node("b", formatter.format(table.rows.length)), node("span", caption));
    cards.append(card);
    const tab = node("button", table.name);
    tab.type = "button";
    tab.addEventListener("click", () => selectSheet(index));
    tabs.append(tab);
  }
  $("#metrics").replaceChildren(cards);
  $("#sheets").replaceChildren(tabs);
  selectSheet(0);
}

fetch("data.json").then(response => {
  if (!response.ok) throw new Error("data unavailable");
  return response.json();
}).then(initialize).catch(() => {
  $("#status").textContent = "Cargá los datos del monitor";
  const upload = node("input");
  upload.type = "file";
  upload.accept = ".json,application/json";
  upload.addEventListener("change", async () => {
    if (!upload.files[0]) return;
    try {
      const tables = JSON.parse(await upload.files[0].text());
      if (!Array.isArray(tables) || tables.length !== 3 || tables.some(table => !Array.isArray(table.rows) || !Array.isArray(table.columns))) throw new Error("invalid data");
      initialize(tables);
      $("#empty").replaceChildren(node("span", "No hay activos para estos filtros."));
    } catch { $("#status").textContent = "El archivo no tiene el formato de datos del monitor"; }
  });
  upload.setAttribute("aria-label", "Seleccionar el archivo data.json");
  $("#empty").replaceChildren(upload);
  $("#empty").hidden = false;
});
