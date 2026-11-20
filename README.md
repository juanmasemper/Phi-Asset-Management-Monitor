# Monitor de Phi Asset Management

Monitor de acciones, CEDEARs y ETF.

## Abrir el monitor

Creá una cuenta con tu correo o iniciá sesión. Si ya tenés una sesión abierta, elegí **Abrir monitor** en la pantalla de acceso. [Acceso a Phi Asset Management](https://phi-monitor-acceso.vercel.app/)

- Buscá por compañía o ticker y filtrá por sector.
- Usá **ES / EN** para cambiar el idioma de las columnas y las categorías.
- En el celular, deslizá la tabla para ver todas las columnas o elegí **Vista compacta**. Tocá una compañía para abrir su ficha.

## Trabajar en tu computadora

Con Python 3, ejecutá estos comandos desde la carpeta del proyecto. Usá la ruta de tu copia de `Monitor Juanchi.xlsx`.

```powershell
python read-workbook.py "C:/ruta/Monitor Juanchi.xlsx" .
python -m http.server 8000 --directory dist
```

Abrí [el monitor local](http://localhost:8000).

## Publicar una actualización

Ejecutá `python prepare-release.py` después de generar los datos. Publicá el contenido de `.release` en el proyecto protegido de Vercel. Ese paquete incluye las tres tablas.

GitHub guarda el código. El Excel y el paquete con datos quedan en tu computadora y en el despliegue protegido. Vercel saltea las compilaciones desde GitHub si el HTML viene sin las tablas.

Para publicar el sitio con cuentas, ejecutá `python prepare-account.py` y publicá `.release-account` en el proyecto Vercel vinculado a Clerk. La planilla queda en una función del servidor que verifica la sesión y el correo.

## Cotizaciones automáticas

Configurá `APCA_API_KEY_ID` y `APCA_API_SECRET_KEY` en Vercel con una cuenta de Alpaca habilitada para mostrar cotizaciones. `ALPACA_DATA_FEED` usa `iex` por defecto. Usá `sip` solo si tu plan lo incluye.

Con el proveedor activo, el monitor consulta cada 60 segundos los símbolos cubiertos de EE. UU. Las fichas indican la procedencia de los datos contrastados. Para los CEDEARs en pesos necesitás un feed de BYMA.
