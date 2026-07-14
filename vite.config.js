import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'

// Hash del commit del build → <meta name="commit"> (CONVENCIONES-APPS.md §3).
let commit = 'dev'
try { commit = execSync('git rev-parse --short HEAD').toString().trim() } catch { /* sin git */ }

const commitMeta = {
  name: 'commit-meta',
  transformIndexHtml(html) {
    return html.replace('</head>', `  <meta name="commit" content="${commit}" />\n  </head>`)
  },
}

export default defineConfig({
  base: './',
  server: { port: 3300, host: true },
  plugins: [
    commitMeta,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'og.jpg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Base64 — Dotrino',
        short_name: 'Base64',
        description: 'Codificador y decodificador Base64 de texto y archivos. Funciona sin conexión.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b1120',
        theme_color: '#2563eb',
        launch_handler: { client_mode: 'focus-existing' },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
