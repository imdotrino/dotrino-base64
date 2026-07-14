# Base64 — Dotrino

Codificador y decodificador **Base64** de texto y archivos del ecosistema
Dotrino. Convierte texto o archivos a Base64 y vuelve, con soporte para
**Unicode (UTF-8)** y variante **URL-safe**. 100% en el navegador: nada se sube
a ningún servidor.

PWA instalable que funciona sin conexión. Bilingüe (es/en).

## Características

- **Codificar / decodificar** texto en Base64, seguro para Unicode (UTF-8).
- **Archivos**: codifica un archivo a Base64 (o como URL de datos `data:`) y
  decodifica Base64 de vuelta a un archivo descargable.
- **Variante URL-safe** (`-_` en vez de `+/`) y **división en líneas** (76 cols).
- **Detección de binario**: si el resultado de decodificar no es texto, ofrece
  descargarlo como archivo en vez de mostrarlo.
- **Intercambiar** entrada/salida con un clic (codificar ↔ decodificar).
- Pegar, copiar, limpiar y descargar.
- Bilingüe (es/en), estética oscura, responsive con `safe-area`.
- Sin anuncios, sin cookies, sin rastreo, sin cuentas.

## Stack

Vite (sin framework) + `vite-plugin-pwa`. Web Components del ecosistema:
`<dotrino-support>` y `<dotrino-install>`.

## Desarrollo

```sh
npm install
npm run dev      # http://localhost:3300
npm run build    # → dist/
npm run preview
```

## Deploy

GitHub Actions construye `dist/` y lo publica en GitHub Pages bajo el subdominio
**`https://base64.dotrino.com/`** (`.github/workflows/deploy.yml`).

## Privacidad

Todo ocurre en tu navegador. El texto/archivo que codificas o decodificas no se
envía a ningún servidor. Analítica cookieless autohospedada (GoatCounter) que
solo cuenta visitas a la página, sin datos personales.

## Licencia

MIT — © Dotrino
