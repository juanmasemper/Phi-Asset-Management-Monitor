const $ = (selector) => document.querySelector(selector);
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const formatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const percentage = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 2, signDisplay: "exceptZero" });
const localQuoteDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Buenos_Aires" });
const sessionDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" });
const collator = new Intl.Collator("es-AR", { sensitivity: "base", numeric: true });
const state = { sheets: [], index: 0, page: 0, chart: null };
const pageSize = 25;
const controls = ["#search", "#sort", "#sector", "#only"].map($);
const mobileColumns = { Cedears: ["A", "C", "D"], ETF: ["A", "D", "E"], "Base Cedears": ["A", "G", "I"] };
const markets = {
  NASDAQ: "SKHY NVDA MU GOOGL AVGO SNDK AMD PLTR ASML META AAPL MSFT AMZN INTC QCOM TSLA LRCX MRVL CSCO COST CRWD RKLB TEM ASTS ONDS ETSY PEP SBUX MRNA BNTX TMUS ADBE AAL UAL COIN RIOT MSTR MARA ANT SPCX MELI FSLR HON WMT QQQ IBIT ETHA",
  NYSE: "BE VST TSM CCJ ORCL DELL LLY V JPM CVX PG MRK GE NVS HSBC PM VALE SHEL STLA CAT RTX VZ NEE COP BBD BHP T UBER NVO MO FCX NU O CRM GS HD TGT KO DIS BBY NKE LMND BA GLW ETN XOM JNJ PFE AZN UNH ABT ABBV CVS NIO F GM TM HMC RACE PINS DAL FDX HPQ",
  AMEX: "SPY IWM EEM XLF XLE DIA EWZ ARKK SH GLD FXI IEUR IBB VEA IVE IVW XLC XLY XLB XLI XLK XLV XLP XLRE IJH EWJ SLV PSQ VIG URA SMH SPXL XLU CIBR SGOV BOXX SHV EWY COPX",
};

const columnNames = {
  "Acciones": ["Acciones", "Stocks"],
  "Compañía": ["Compañía", "Company"],
  "Precio": ["Precio", "Price"],
  "Variación %": ["Variación %", "Change %"],
  "Variación": ["Variación", "Change"],
  "Open": ["Apertura", "Open"],
  "High": ["Máximo", "High"],
  "Low": ["Mínimo", "Low"],
  "Close": ["Cierre", "Close"],
  "Volumen": ["Volumen", "Volume"],
  "Forw P/E": ["P/E futuro", "Fwd P/E"],
  "Forward P/E": ["P/E proyectado", "Forward P/E"],
  "TARGET": ["Precio objetivo", "Price Target"],
  "Market Cap": ["Capitalización bursátil", "Market Cap"],
  "Earning Date": ["Fecha de resultados", "Earnings Date"],
  "52 W Low": ["Mínimo de 52 semanas", "52-Week Low"],
  "52 W High": ["Máximo de 52 semanas", "52-Week High"],
  "EPS": ["Ganancia por acción", "EPS"],
  "Temática": ["Temática", "Theme"],
  "Precio Original USD": ["Precio original en USD", "Underlying Price (USD)"],
  "Precio Cedear Arg": ["Precio del CEDEAR en ARS", "CEDEAR Price (ARS)"],
  "País": ["País", "Country"],
  "Conversión CCL": ["Conversión CCL", "CCL Conversion"],
  "Volumen Promedio (30 días)": ["Volumen promedio (30 días)", "Average Volume (30 Days)"],
  "Beta (Daily 6M)": ["Beta diaria (6 meses)", "Beta (Daily, 6 Months)"],
  "Volatilidad (30 D %)": ["Volatilidad (30 días, %)", "Volatility (30 Days, %)"],
  "1 M Return": ["Rendimiento a 1 mes", "1-Month Return"],
  "YTD": ["Rendimiento en el año", "YTD Return"],
  "1Y Retun": ["Rendimiento a 1 año", "1-Year Return"],
  "P/E (Fwd 12 M)": ["P/E futuro (12 meses)", "Forward P/E (12 Months)"],
  "Rating (+)": ["Recomendación (+)", "Rating (+)"],
  "Target Price USD": ["Precio objetivo en USD", "Price Target (USD)"],
  "Ratio Convertibilidad": ["Ratio de conversión", "Conversion Ratio"],
};

const sectorGroups = [
  ["Technology", "Tecnología", "Sector Tecnología"],
  ["Industrials", "Industriales", "Industrial", "Sector Industrial"],
  ["Basic Materials", "Materiales básicos", "Sector Materiales"],
  ["Consumer Cyclicals", "Consumo discrecional", "Sector C. Discrecional"],
  ["Consumer Non-Cyclicals", "Consumo básico", "Sector C. Básico"],
  ["Energy", "Energía"],
  ["Financials", "Finanzas"],
  ["Healthcare", "Salud", "Sector Salud"],
  ["Utilities", "Servicios públicos"],
  ["Semiconductors", "Semiconductores", "Semicondutores"],
  ["E-commerce", "Comercio electrónico"],
  ["Cryptocurrencies", "Criptomonedas"],
  ["Treasury Bonds 0–3 Months · Distributing", "Bonos del Tesoro 0–3 meses · Distribución", "Treasury Bond 0-3 MONTH Distrib"],
  ["Treasury Bonds 0–3 Months · Accumulating", "Bonos del Tesoro 0–3 meses · Acumulación", "Treasury Bond 0-3 MONTH Reinvest"],
  ["Treasury Bonds 0–1 Year · Distributing", "Bonos del Tesoro 0–1 año · Distribución", "Treasury Bond 0-1 YEAR Distrib"],
  ["Treasury Bonds 0–1 Year · Accumulating", "Bonos del Tesoro 0–1 año · Acumulación", "Treasury Bond 0-1 YEAR Reinvest"],
  ["U.S. Market", "Mercado de EE. UU.", "Mercado EE.UU"],
  ["Small Caps", "Pequeña capitalización"],
  ["Emerging Markets", "Mercados emergentes", "Mercado Emergentes"],
  ["Brazil", "Brasil"],
  ["Innovation & Technology", "Innovación y tecnología", "Innovación & Tecnología"],
  ["Inverse S&P 500", "S&P 500 inverso", "S&P 500 - Inverso"],
  ["Gold", "Oro", "Commodity - Oro"],
  ["China", "China"],
  ["European Corporates", "Corporativo europeo", "Corporativo Europa"],
  ["Biotechnology", "Biotecnología"],
  ["Developed Markets ex-U.S.", "Mercados desarrollados sin EE. UU.", "Merc. Desarrollados, ex US"],
  ["S&P 500 Value", "S&P 500 de valor", "S&P Value"],
  ["S&P 500 Growth", "S&P 500 de crecimiento", "S&P Growth"],
  ["Communication Services", "Servicios de comunicación", "Sector Comunicación"],
  ["Real Estate", "Bienes raíces", "Sector Real State"],
  ["S&P MidCap 400", "Índice S&P MidCap 400", "Indice S&P MidCap 400"],
  ["MSCI Japan", "Índice MSCI Japón", "Indice MSCI Japon"],
  ["Silver", "Plata", "Commodity - Plata"],
  ["Inverse Nasdaq 100", "Nasdaq 100 inverso", "Nasdaq 100 - Inverso"],
  ["Dividends", "Dividendos"],
  ["Uranium", "Uranio", "Commodity - Uranio"],
  ["S&P 500", "S&P 500"],
  ["Cybersecurity", "Ciberseguridad"],
];

const sectorAliases = new Map(sectorGroups.flatMap(group => group.map(alias => [normalized(alias), group[0]])));
const spanishSectors = new Map(sectorGroups.map(([english, spanish]) => [english, spanish]));
let englishColumns = false;
try { englishColumns = localStorage.getItem("phi-column-language") === "en"; } catch {}

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
  if (key === sectorColumn(sheet)) return sectorLabel(sectorKey(value));
  if (typeof value !== "number") return value;
  if (sheet.name === "Cedears" && (key === "D" || key === "O")) return percentage.format(value);
  return formatter.format(value);
}

function sheet() { return state.sheets[state.index]; }
function nameOf(row) { return row.v.A ?? row.v[sheet().columns[1][0]]; }
function tickerOf(row) { return row.v[sheet().columns[1][0]]; }
function sectorColumn(table) { return table.name === "Cedears" ? "X" : table.name === "ETF" ? "C" : "E"; }
function sectorKey(value) { return value ? sectorAliases.get(normalized(value)) ?? value : ""; }
function sectorOf(row) { return sectorKey(row.v[sectorColumn(sheet())]); }
function sectorLabel(key) { return englishColumns ? key : spanishSectors.get(key) ?? key; }
function columnLabel(label) { return columnNames[label]?.[englishColumns ? 1 : 0] ?? label; }
function unnamedColumn(key) { return englishColumns ? `Excel column ${key}` : `Columna ${key} del Excel`; }
function normalized(text) { return String(text ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }

function renderColumnControls(sector) {
  const select = $("#sector");
  select.lang = englishColumns ? "en" : "es";
  select.setAttribute("aria-label", englishColumns ? "Sector or theme" : "Sector o temática");
  select.replaceChildren(new Option(englishColumns ? "All sectors" : "Todos los sectores", ""));
  const sectors = [...new Set(sheet().rows.map(sectorOf).filter(Boolean))];
  sectors.sort((a, b) => sectorLabel(a).localeCompare(sectorLabel(b), select.lang));
  for (const key of sectors) select.add(new Option(sectorLabel(key), key));
  select.value = sector;

  const head = node("tr");
  head.lang = select.lang;
  for (const [key, label] of sheet().columns) {
    const cell = node("th", columnLabel(label));
    cell.scope = "col";
    if (!mobileColumns[sheet().name].includes(key)) cell.classList.add("wide-table-only");
    if (!label) cell.setAttribute("aria-label", unnamedColumn(key));
    head.append(cell);
  }
  $("#table thead").replaceChildren(head);
}

function renderLanguageButton() {
  const button = $("#column-language");
  button.setAttribute("aria-pressed", String(englishColumns));
  button.setAttribute("aria-label", englishColumns ? "Mostrar columnas y sectores en castellano" : "Mostrar columnas y sectores en inglés");
}

function selectSheet(index) {
  state.index = index;
  state.page = 0;
  const isFund = sheet().name === "ETF";
  for (const option of $("#sort").options) {
    if (["target", "forward"].includes(option.value)) option.disabled = isFund;
  }
  if (isFund && $("#sort").selectedOptions[0].disabled) $("#sort").value = "name";
  $(".valuation").hidden = isFund;
  if (isFund) $("#only").checked = false;
  for (const [i, button] of [...$("#sheets").children].entries()) button.setAttribute("aria-current", String(i === index));
  renderColumnControls("");
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
      if (!mobileColumns[table.name].includes(key)) td.classList.add("wide-table-only");
      if (key === "A") {
        const button = node("button", undefined, "row-open");
        button.append(node("span", nameOf(row), "company-name"));
        if (tickerOf(row)) button.append(node("span", tickerOf(row), "mobile-ticker"));
        button.type = "button";
        button.addEventListener("click", () => openAsset(row, table));
        td.append(button);
        const score = valuation(row, table);
        if (sort === "target" && score.target !== null) td.append(node("small", percentage.format(score.target) + " al objetivo", score.target >= 0 ? "positive" : "negative"));
        if (sort === "forward" && score.forward !== null) td.append(node("small", formatter.format(score.forward) + "× P/E futuro", "muted"));
      } else {
        td.textContent = displayed(value, key, table);
        if (key === sectorColumn(table)) td.lang = englishColumns ? "en" : "es";
        if (value == null) td.title = "Dato no disponible";
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
  const refreshed = table.rows.reduce((latest, row) => Math.max(latest, row.quoteTime ?? 0), 0);
  $("#quote-freshness").textContent = refreshed
    ? `Última cotización EE. UU. · ${localQuoteDate.format(refreshed)} (ART)`
    : table.quoteAsOf ? `Último corte verificado · ${table.quoteAsOf}` : "Fecha de corte sin confirmar";
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
  const info = node("p", row.quoteTime
    ? `Cotización de EE. UU. · ${localQuoteDate.format(row.quoteTime)} (ART). La ficha indica la fuente de cada campo contrastado.`
    : row.session ? `Cierre histórico contrastado · ${row.session}. La ficha indica la fuente de cada campo contrastado.`
    : "Valores de la planilla. Las fuentes disponibles figuran debajo.", "muted");
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
    const term = node("dt", label ? columnLabel(label) : unnamedColumn(key));
    term.lang = englishColumns ? "en" : "es";
    list.append(term, node("dd", displayed(row.v[key], key, table)));
  }
  body.append(list);
  const sources = Object.entries(row.sources);
  if (sources.length) {
    const details = node("details", undefined, "asset-sources");
    details.append(node("summary", "Fuentes de los campos verificados"));
    const sourceList = node("ul");
    for (const [key, [label, url]] of sources) {
      const li = node("li", (columnLabel(table.columns.find(col => col[0] === key)?.[1]) || key) + " · ");
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
  ctx.strokeStyle = "#aac0e44d";
  for (let i = 0; i <= 10; i++) grid(i, -3, i, 2);
  for (let i = -3; i <= 2; i++) grid(0, i, 10, i);
  const levels = [0.16, .23, .19, .32, .38, .31, .49, .58, .52, .64];
  for (let i = 0; i < levels.length; i++) {
    const left = x(i,-.4), base = y(i,-.4), top = base - height * levels[i] * .7;
    const w = width * .047, dx = width * .028, dy = height * .038;
    const light = levels[i] > (levels[i - 1] ?? 0);
    polygon([[left,base],[left+w,base-dy],[left+w,top-dy],[left,top]], light ? "#d5b985" : "#7699cc");
    polygon([[left+w,base-dy],[left+w+dx,base],[left+w+dx,top],[left+w,top-dy]], light ? "#96794f" : "#3f5f90");
    polygon([[left,top],[left+w,top-dy],[left+w+dx,top],[left+dx,top+dy]], light ? "#fff0c6" : "#bed4f4");
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

function quoteSymbol(row, table) {
  const symbol = row.v[table.columns[1][0]];
  const exchange = findMarket(row, table, symbol)?.split(":")[0];
  return ["NASDAQ", "NYSE", "AMEX"].includes(exchange) ? symbol : null;
}

function applyQuote(row, table, quote, feed) {
  const time = Date.parse(quote?.time);
  if (!Number.isFinite(time) || !(quote.price > 0) || time <= (row.quoteTime ?? 0)) return false;
  const tradeSession = sessionDate.format(time);
  if (table.quoteAsOfIso && tradeSession <= table.quoteAsOfIso) return false;
  const primary = table.name === "Cedears";
  const fields = { [primary ? "C" : table.name === "ETF" ? "D" : "G"]: quote.price };
  if (primary) {
    const daily = quote.daily;
    const barTime = Date.parse(daily?.time);
    const sameSession = Number.isFinite(barTime) && tradeSession === sessionDate.format(barTime);
    const previous = quote.previousClose;
    const delta = sameSession && previous > 0 ? quote.price - previous : null;
    Object.assign(fields, { D: delta === null ? null : delta / previous, E: delta, F: sameSession ? daily.open : null,
      G: sameSession ? daily.high : null, H: sameSession ? daily.low : null,
      I: previous > 0 ? previous : null, J: sameSession ? daily.volume : null });
    const target = numeric(row.v.M);
    if (target > 0 && !row.exclude) Object.assign(fields, { N: target - quote.price, O: target / quote.price - 1 });
  }
  const source = [`Alpaca · ${feed.toUpperCase()} · ${localQuoteDate.format(time)} ART`, "https://docs.alpaca.markets/us/docs/market-data-faq"];
  for (const [key, value] of Object.entries(fields)) {
    row.v[key] = value ?? null;
    if (value == null) delete row.sources[key];
    else if (key === "N" || key === "O") row.sources[key] = ["Cálculo con el precio objetivo y la última cotización", source[1]];
    else if (primary && key === "I") row.sources[key] = [source[0] + " · cierre previo", source[1]];
    else row.sources[key] = source;
  }
  row.quoteTime = time;
  return true;
}

let refreshing = false;
let providerConfigured = true;
async function refreshQuotes() {
  if (refreshing || !providerConfigured || document.hidden || !state.sheets.length) return;
  const entries = state.sheets.flatMap(table => table.rows.map(row => ({ table, row, symbol: quoteSymbol(row, table) })))
    .filter(entry => entry.symbol);
  const symbols = [...new Set(entries.map(entry => entry.symbol))].sort();
  if (!symbols.length) return;
  refreshing = true;
  try {
    const response = await fetch(`./api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`, { signal: AbortSignal.timeout(10000) });
    if (response.status === 503 || response.status === 404) { providerConfigured = false; return; }
    if (!response.ok) return;
    const { feed, quotes } = await response.json();
    if (!quotes || !["iex", "sip"].includes(feed)) return;
    let changed = false;
    for (const { row, table, symbol } of entries) changed = applyQuote(row, table, quotes[symbol], feed) || changed;
    if (changed) render();
  } catch {
    // Keep the last received quote and timestamp if the provider is unreachable.
  } finally {
    refreshing = false;
  }
}

async function loadMonitor() {
  $("#data-error").hidden = true;
  $("#status").textContent = "Cargando datos…";
  for (const control of [...controls, $("#prev"), $("#next")]) control.disabled = true;
  try {
    const embedded = $("#monitor-data").textContent.trim();
    let tables;
    if (embedded) {
      tables = JSON.parse(embedded);
    } else {
      const response = await fetch("./data.json");
      if (!response.ok) throw new Error("data unavailable");
      tables = await response.json();
    }
    if (!Array.isArray(tables) || tables.length !== 3 || tables.some(table =>
      !Array.isArray(table.columns) || !Array.isArray(table.rows) || table.rows.length === 0
    )) throw new Error("invalid data");
    for (const control of controls) control.disabled = false;
    initialize(tables);
    refreshQuotes();
  } catch {
    $("#status").textContent = "No se pudieron cargar los datos del monitor.";
    $("#data-error").hidden = false;
  }
}

$("#retry-data").addEventListener("click", loadMonitor);
$("#column-language").addEventListener("click", () => {
  englishColumns = !englishColumns;
  try { localStorage.setItem("phi-column-language", englishColumns ? "en" : "es"); } catch {}
  renderLanguageButton();
  if (!sheet()) return;
  renderColumnControls($("#sector").value);
  render();
});
renderLanguageButton();
window.setInterval(refreshQuotes, 60_000);
document.addEventListener("visibilitychange", refreshQuotes);
loadMonitor();
