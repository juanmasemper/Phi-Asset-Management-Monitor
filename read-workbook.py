"""Extract the three monitor tables and their Excel cached values."""
import json
import re
import sys
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def strings(node):
    return "".join(t.text or "" for t in node.iter(NS + "t"))


def read_tables(path):
    with ZipFile(path) as book:
        shared = [
            strings(node) for node in ET.fromstring(book.read("xl/sharedStrings.xml"))
        ] if "xl/sharedStrings.xml" in book.namelist() else []
        workbook = ET.fromstring(book.read("xl/workbook.xml"))
        relationships = {
            r.attrib["Id"]: r.attrib["Target"]
            for r in ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
        }
        for sheet in workbook.find(NS + "sheets"):
            name = sheet.attrib["name"]
            relation = next(v for k, v in sheet.attrib.items() if k.endswith("}id"))
            target = relationships[relation]
            xml = ET.fromstring(book.read(target.lstrip("/") if target.startswith("/") else "xl/" + target))
            rows = {}
            formulas = Counter()
            for row in xml.find(NS + "sheetData"):
                cells = {}
                for cell in row:
                    raw = cell.findtext(NS + "v")
                    formula = cell.findtext(NS + "f")
                    kind = cell.get("t")
                    if kind == "s" and raw is not None:
                        raw = shared[int(raw)]
                    elif kind == "inlineStr":
                        raw = strings(cell)
                    elif raw is not None and kind not in {"e", "str", "b", "d"}:
                        raw = float(raw) if "." in raw or "E" in raw.upper() else int(raw)
                    col = re.match(r"[A-Z]+", cell.get("r")).group()
                    if formula:
                        formulas[(col, formula.split("(")[0][:70])] += 1
                    if raw is not None or formula:
                        cells[col] = raw
                if cells:
                    rows[int(row.get("r"))] = cells
            yield name, rows, formulas


def clean(value):
    if isinstance(value, str):
        if value in {"-", "–", "—"} or value.startswith(("#N/A", "#REF!", "#VALUE!", "#DIV/0!", "#NAME?", "#NUM!", "#NULL!", "=AI(")):
            return None
        return " ".join(value.split())
    return value


def export(tables, directory):
    research = directory / "research.json"
    market = json.loads(research.read_text(encoding="utf-8")) if research.is_file() else {"history": {}}
    wba = "https://www.sycamorepartners.com/news-article/sycamore-partners-completes-acquisition-of-walgreens-boots-alliance"
    layouts = {"Cedears": (1, "B"), "ETF": (1, "B"), "Base Cedears": (2, "D")}
    alternate = {"A": ("B",), "N": ("M",), "Q": ("P",), "U": ("T",), "W": ("V",),
                 "Y": ("X",), "AB": ("AA",), "AD": ("AC",), "AG": ("AF",),
                 "AJ": ("AI", "AK"), "AN": ("AM", "AO"), "AR": ("AQ", "AS")}
    base = {row.get("D"): row for n, row in tables[2][1].items() if n > 2}
    sheets = []
    for name, rows, _ in tables:
        header, symbol_col = layouts[name]
        labels = dict(rows[header])
        if name == "Cedears":
            labels = {**{k: v for k, v in labels.items() if k <= "M"}, "N": "", "O": "",
                      **{k: v for k, v in labels.items() if k > "M"}}
        listing = []
        for index, row in rows.items():
            if index <= header or not (row.get(symbol_col) or clean(row.get("A"))):
                continue
            values = {
                col: next((clean(row.get(c)) for c in [col, *(alternate.get(col, ()) if name == "Base Cedears" else ())]
                           if clean(row.get(c)) is not None), None)
                for col in labels
            }
            item = {"row": index, "v": values, "sources": {}}
            symbol = values[symbol_col]
            if name == "Cedears":
                if values["A"] == "SAMSUNG":
                    symbol = "005930.KS"
                    values["B"] = symbol
                    item["sources"]["B"] = ["Samsung Investor Relations", "https://www.samsung.com/global/ir/ir-resources/faq/"]
                if symbol == "NASDAQ:WBA":
                    values["A"] = "Walgreens Boots Alliance"
                    item["note"] = "Dejó de cotizar tras su adquisición en agosto de 2025."
                    item["sources"]["A"] = ["Sycamore Partners", wba]
                if values["A"] == "Stellantis NV":
                    item["note"] = "El Excel usa STLA. Se identifica como Stellantis (NYSE:STLA). Tesla usa NASDAQ:TSLA."
                if symbol == "ANT":
                    item["note"] = "El TARGET y Forw P/E del Excel coinciden con los de META. Se conservan para revisión y se excluyen de la comparación."
                    item["exclude"] = True
                if symbol == "WEGE3":
                    item["note"] = "La fila del Excel corresponde al CEDEAR en ARS."
                verified = market["history"].get(symbol)
                if symbol == "005930.KS":
                    item["note"] = "Acción ordinaria de Samsung Electronics en Corea. Precios expresados en KRW."
                    if verified:
                        values.update(C=verified["close"], I=verified["close"], J=verified["volume"], D=0, E=0)
                        for col in "CIJ":
                            item["sources"][col] = ["Yahoo Finance · 19 nov 2026", verified["url"]]
                if verified and isinstance(values["I"], (float, int)) and abs(values["I"] - verified["close"]) < .011:
                    reference = ["Yahoo Finance · 19 nov 2026", verified["url"]]
                    for col, key in (("F", "open"), ("G", "high"), ("H", "low")):
                        if values[col] is None:
                            values[col] = verified[key]
                            item["sources"][col] = reference
                    previous = verified.get("previous")
                    if values["D"] == 0 and values["E"] == 0 and previous:
                        values["E"] = round(verified["close"] - previous, 2)
                        values["D"] = values["E"] / previous
                        for col in "DE":
                            item["sources"][col] = reference
                    item["session"] = "19 nov 2026"
                elif values["D"] == 0 and values["E"] == 0 and values["F"] is None:
                    values.update(D=None, E=None)
                if symbol == "MU" and values["Q"] is None and market.get("micron"):
                    values["Q"] = "17 dic 2026"
                    item["sources"]["Q"] = ["Micron Investor Relations", market["micron"]]
                if values["X"] is None and base.get(symbol, {}).get("E"):
                    values["X"] = base[symbol]["E"]
                    item["sources"]["X"] = ["Excel · pestaña Base Cedears", None]
                if symbol == "SKHY" and verified and verified.get("beta") and values["T"] is None:
                    values["T"] = verified["beta"]
                    item["sources"]["T"] = ["Yahoo Finance · Beta mensual de 5 años", verified["url"]]
            if name == "ETF" and values["D"] is None and symbol == "SGOV" and market["history"].get(symbol):
                verified = market["history"][symbol]
                values["D"] = verified["close"]
                item["session"] = "19 nov 2026"
                item["sources"]["D"] = ["Yahoo Finance · 19 nov 2026", verified["url"]]
            listing.append(item)
        sheets.append({"name": name, "columns": list(labels.items()), "rows": listing})
    (directory / "dist" / "data.json").write_text(json.dumps(sheets, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for sheet in sheets:
        print(sheet["name"], len(sheet["rows"]), sum("session" in row for row in sheet["rows"]))


if __name__ == "__main__":
    tables = list(read_tables(sys.argv[1]))
    if len(sys.argv) == 2:
        for name, rows, formulas in tables:
            print(name, len(rows), list(rows.items())[:5])
            print("Errors", Counter((k,v) for row in rows.values() for k,v in row.items() if isinstance(v,str) and v.startswith(("#", "=AI"))))
            print("Formulas", formulas.most_common(65))
            print("Symbols", [(n, row.get("A"), row.get("D" if name == "Base Cedears" else "B")) for n,row in rows.items()][:250])
    else:
        export(tables, Path(sys.argv[2]))
