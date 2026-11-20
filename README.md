# Monitor Juanchi

Monitor de acciones, CEDEARs y ETF de Phi Asset Management. La interfaz conserva los encabezados y el orden de columnas de la planilla. El orden inicial de filas es alfabético.

## Uso local

Desde la raíz del proyecto, ejecutá los siguientes comandos con Python 3.

```powershell
python read-workbook.py "C:/ruta/Monitor Juanchi.xlsx" .
python -m http.server 8000 --directory dist
```

Abrí [el monitor local](http://localhost:8000). La extracción genera `dist/data.json` sin modificar el Excel. El monitor también permite abrir un `data.json` local desde el navegador. Git excluye el Excel, los datos generados y el archivo local de investigación.

## Cotizaciones y valuación

Las tablas muestran valores de referencia. Las fichas enlazan a las fuentes externas y, para instrumentos con mercado identificado, permiten cargar un gráfico de TradingView. La disponibilidad y demora del gráfico dependen de cada mercado. Los criterios de valuación usan el precio y el objetivo de la misma pestaña y el P/E futuro positivo.
