/**
 * Base64 — codificador/decodificador del ecosistema Dotrino.
 * Convierte texto y archivos a Base64 y vuelve, con soporte para Unicode (UTF-8)
 * y variante URL-safe. 100% en el navegador: nada se sube a ningún servidor.
 */
import { registerSW } from 'virtual:pwa-register'
import './lang.js' // debe ir ANTES del topbar: migra 'base64.lang' → 'dotrino.lang'
import '@dotrino/topbar'
import '@dotrino/install'
import { getIdentity } from './services/identity'
import { getReputation } from './services/reputation'
import './style.css'

// Recarga cuando el SW nuevo toma control + re-chequeo periódico (CONVENCIONES §3).
const updateSW = registerSW({ immediate: true })
setInterval(() => updateSW(), 30 * 60 * 1000)

/* ---------------- i18n ---------------- */
const I18N = {
  es: {
    tagline: 'Codifica y decodifica texto y archivos en Base64. Todo ocurre en tu navegador.',
    encode: 'Codificar',
    decode: 'Decodificar',
    input: 'Entrada',
    output: 'Salida',
    placeholderInEnc: 'Escribe o pega el texto a codificar…',
    placeholderInDec: 'Pega el texto en Base64 a decodificar…',
    placeholderOut: 'El resultado aparecerá aquí',
    paste: 'Pegar',
    clear: 'Limpiar',
    upload: 'Subir archivo',
    copy: 'Copiar',
    copied: 'Copiado',
    download: 'Descargar',
    swap: 'Intercambiar',
    removeFile: 'Quitar archivo',
    urlSafe: 'Variante URL-safe',
    dataUri: 'Como URL de datos (data:)',
    wrap: 'Dividir en líneas',
    bytes: 'bytes',
    chars: 'caracteres',
    binary: 'Contenido binario',
    invalid: 'No es Base64 válido: revisa espacios o caracteres raros.',
    emptyPaste: 'El portapapeles está vacío.',
    noRead: 'No se pudo leer el portapapeles.',
    install: 'Instalar app',
    privacy: 'Todo ocurre en tu navegador. Nada se sube a ningún servidor.',
    fileLabel: 'archivo',
  },
  en: {
    tagline: 'Encode and decode text and files to Base64. Everything happens in your browser.',
    encode: 'Encode',
    decode: 'Decode',
    input: 'Input',
    output: 'Output',
    placeholderInEnc: 'Type or paste the text to encode…',
    placeholderInDec: 'Paste the Base64 text to decode…',
    placeholderOut: 'The result will appear here',
    paste: 'Paste',
    clear: 'Clear',
    upload: 'Upload file',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download',
    swap: 'Swap',
    removeFile: 'Remove file',
    urlSafe: 'URL-safe variant',
    dataUri: 'As data URL (data:)',
    wrap: 'Split into lines',
    bytes: 'bytes',
    chars: 'characters',
    binary: 'Binary content',
    invalid: 'Not valid Base64: check for spaces or odd characters.',
    emptyPaste: 'The clipboard is empty.',
    noRead: 'Could not read the clipboard.',
    install: 'Install app',
    privacy: 'Everything happens in your browser. Nothing is uploaded to any server.',
    fileLabel: 'file',
  },
}
/* El topbar es el DUEÑO del idioma: lo resuelve y lo persiste en 'dotrino.lang'
 * (preferencia compartida por todo el ecosistema). La app ya no tiene toggle ni
 * clave propios: lee el idioma del topbar y escucha su evento 'dotrino-lang'. */
const topbar = document.querySelector('dotrino-topbar')
const installEl = document.querySelector('dotrino-install')
let lang = topbar?.lang === 'en' ? 'en' : 'es'
const t = () => I18N[lang]

/* ---------------- Estado ---------------- */
let mode = 'encode'        // 'encode' | 'decode'
let urlSafe = false        // variante URL-safe (codificar)
let dataUri = false        // prefijo data: (codificar, archivo o texto)
let wrap = false           // dividir salida en líneas de 76
let input = ''
let output = ''            // texto resultante (o vacío)
let outBytes = 0           // tamaño en bytes de la salida
let error = ''
let binary = false         // la salida decodificada no es texto
let decodedMime = ''       // mime detectado al decodificar (data: URI)
let fileLoaded = null      // { name, size, mime } cuando se cargó un archivo (codificar)

/* ---------------- Base64 (UTF-8 seguro) ---------------- */
function bytesToB64(bytes) {
  let bin = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  return btoa(bin)
}
function b64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
function toUrlSafe(b) { return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function fromUrlSafe(b) { let s = b.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return s }
function wrapLines(b) { return b.replace(/(.{76})/g, '$1\n').replace(/\n$/, '') }

const RE_B64 = /^[A-Za-z0-9+/_-]*={0,2}$/

function encodeText(text) {
  const bytes = new TextEncoder().encode(text)
  let b = bytesToB64(bytes)
  if (urlSafe) b = toUrlSafe(b)
  if (wrap) b = wrapLines(b)
  if (dataUri) b = 'data:text/plain;charset=utf-8;base64,' + (urlSafe ? toUrlSafe(bytesToB64(bytes)) : bytesToB64(bytes))
  outBytes = bytes.length
  return b
}

function encodeFile(file) {
  const reader = new FileReader()
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result)
    const raw = bytesToB64(bytes)
    let b = urlSafe ? toUrlSafe(raw) : raw
    if (wrap) b = wrapLines(b)
    if (dataUri) b = 'data:' + (file.type || 'application/octet-stream') + ';base64,' + raw
    outBytes = bytes.length
    output = b
    fileLoaded = { name: file.name, size: file.size, mime: file.type || 'application/octet-stream' }
    error = ''
    render()
  }
  reader.onerror = () => { error = 'No se pudo leer el archivo.'; render() }
  reader.readAsArrayBuffer(file)
}

function decode(text) {
  const trimmed = text.replace(/\s+/g, '')
  if (!trimmed) { output = ''; outBytes = 0; binary = false; decodedMime = ''; return }
  decodedMime = ''
  let payload = trimmed
  const m = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/i)
  if (m) {
    decodedMime = m[1] || 'application/octet-stream'
    payload = m[3] || ''
  }
  if (!RE_B64.test(payload) || payload.length % 4 !== 0) throw new Error('invalid')
  const bytes = b64ToBytes(fromUrlSafe(payload))
  outBytes = bytes.length
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    binary = false
    output = decoded
  } catch {
    binary = true
    output = ''
  }
}

function process() {
  error = ''
  binary = false
  try {
    if (mode === 'encode' && !fileLoaded) {
      output = input ? encodeText(input) : ''
    } else if (mode === 'decode') {
      decode(input)
    }
  } catch {
    error = t().invalid
    output = ''
    outBytes = 0
  }
  render()
}

/* ---------------- UI ---------------- */
const app = document.getElementById('app')

function fmt(n) { return n.toLocaleString(lang === 'es' ? 'es-EC' : 'en-US') }

function render() {
  const _ = t()
  const enc = mode === 'encode'
  app.innerHTML = `
    <main class="wrap">
      <h1 class="tagline">${_.tagline}</h1>

      <div class="modebar" role="tablist" aria-label="mode">
        <button role="tab" aria-selected="${enc}" class="${enc ? 'on' : ''}" data-mode="encode" data-testid="mode-encode">${_.encode}</button>
        <button role="tab" aria-selected="${!enc}" class="${!enc ? 'on' : ''}" data-mode="decode" data-testid="mode-decode">${_.decode}</button>
      </div>

      <div class="opts">
        ${enc ? `
          <label class="opt"><input type="checkbox" data-opt="urlSafe" ${urlSafe ? 'checked' : ''} /> <span>${_.urlSafe}</span></label>
          <label class="opt"><input type="checkbox" data-opt="dataUri" ${dataUri ? 'checked' : ''} /> <span>${_.dataUri}</span></label>
        ` : ''}
        <label class="opt"><input type="checkbox" data-opt="wrap" ${wrap ? 'checked' : ''} /> <span>${_.wrap}</span></label>
      </div>

      <section class="card">
        <div class="card-head">
          <span class="card-title">${_.input}</span>
          ${fileLoaded ? `<span class="filechip" data-testid="filechip">📎 ${esc(fileLoaded.name)} · ${fmt(fileLoaded.size)} ${_.bytes}</span>` : ''}
          <span class="count">${enc ? `${fmt([...input].length)} ${_.chars} · ${fmt(new TextEncoder().encode(input).length)} ${_.bytes}` : `${fmt(input.length)} ${_.chars}`}</span>
        </div>
        ${fileLoaded
          ? `<div class="filedrop"><button class="btn btn-link" data-act="removeFile">✕ ${_.removeFile}</button></div>`
          : `<textarea id="in" class="area" rows="8" spellcheck="false" autocomplete="off"
                placeholder="${enc ? _.placeholderInEnc : _.placeholderInDec}" data-testid="input">${esc(input)}</textarea>`}
        <div class="btn-row">
          ${fileLoaded ? '' : `<button class="btn btn-ghost" data-act="paste" data-testid="paste">${clipIcon()} ${_.paste}</button>`}
          ${fileLoaded ? '' : `<button class="btn btn-ghost" data-act="clear" data-testid="clear">${trashIcon()} ${_.clear}</button>`}
          ${enc ? `<button class="btn btn-ghost" data-act="upload" data-testid="upload">${upIcon()} ${_.upload}</button>` : ''}
        </div>
      </section>

      <div class="swap-row"><button class="btn btn-swap" data-act="swap" data-testid="swap" title="${_.swap}">${swapIcon()}</button></div>

      <section class="card">
        <div class="card-head">
          <span class="card-title">${_.output}</span>
          <span class="count">${binary ? `${_.binary} · ${fmt(outBytes)} ${_.bytes}` : `${fmt(output.length)} ${_.chars} · ${fmt(outBytes)} ${_.bytes}`}</span>
        </div>
        ${error
          ? `<p class="error" data-testid="error">${error}</p>`
          : binary
            ? `<p class="binary">${_.binary} · ${decodedMime || 'application/octet-stream'} · ${fmt(outBytes)} ${_.bytes}</p>`
            : `<textarea id="out" class="area out" rows="8" spellcheck="false" readonly
                  placeholder="${_.placeholderOut}" data-testid="output">${esc(output)}</textarea>`}
        <div class="btn-row">
          <button class="btn btn-ghost" data-act="copy" data-testid="copy" ${output || binary ? '' : 'disabled'}>${copyIcon()} ${_.copy}</button>
          ${(mode === 'decode') ? `<button class="btn btn-ghost" data-act="download" data-testid="download" ${output || binary ? '' : 'disabled'}>${dlIcon()} ${_.download}</button>` : ''}
        </div>
      </section>

      <p class="privacy">${_.privacy}</p>
    </main>
    <input type="file" id="file" hidden />
  `
  wire()
}

function wire() {
  app.querySelectorAll('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      mode = b.dataset.mode
      fileLoaded = null
      process()
    }))

  app.querySelectorAll('[data-opt]').forEach((cb) =>
    cb.addEventListener('change', () => {
      const k = cb.dataset.opt
      if (k === 'urlSafe') urlSafe = cb.checked
      else if (k === 'dataUri') dataUri = cb.checked
      else if (k === 'wrap') wrap = cb.checked
      process()
    }))

  const ta = app.querySelector('#in')
  if (ta) {
    ta.addEventListener('input', () => { input = ta.value; processLive() })
  }

  const file = app.querySelector('#file')
  if (file) file.addEventListener('change', (e) => { const f = e.target.files?.[0]; if (f) { input = ''; encodeFile(f) } })

  app.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const act = el.dataset.act
      if (act === 'paste') paste()
      else if (act === 'clear') { input = ''; fileLoaded = null; process() }
      else if (act === 'removeFile') { fileLoaded = null; output = ''; outBytes = 0; process() }
      else if (act === 'upload') file.click()
      else if (act === 'copy') copyOut(el)
      else if (act === 'download') downloadOut()
      else if (act === 'swap') swap()
    })
  })
}

// Live: actualiza salida sin re-render del textarea (mantiene el foco/curser).
function processLive() {
  error = ''
  binary = false
  try {
    if (mode === 'encode' && !fileLoaded) {
      output = input ? encodeText(input) : ''
    } else if (mode === 'decode') {
      decode(input)
    }
  } catch {
    error = t().invalid
    output = ''
    outBytes = 0
  }
  // Actualiza solo salida + contadores sin perder el foco del input.
  const outTa = app.querySelector('#out')
  if (outTa) outTa.value = output
  else {
    // la tarjeta de salida puede cambiar entre texto / error / binario → re-render.
    render()
    return
  }
  // refresca contadores
  const _ = t()
  const counts = app.querySelectorAll('.count')
  const enc = mode === 'encode'
  const inCount = enc ? `${fmt([...input].length)} ${_.chars} · ${fmt(new TextEncoder().encode(input).length)} ${_.bytes}` : `${fmt(input.length)} ${_.chars}`
  const outCount = binary ? `${_.binary} · ${fmt(outBytes)} ${_.bytes}` : `${fmt(output.length)} ${_.chars} · ${fmt(outBytes)} ${_.bytes}`
  if (counts[0]) counts[0].textContent = inCount
  if (counts[1]) counts[1].textContent = outCount
  // habilita/deshabilita botones de salida
  const copyBtn = app.querySelector('[data-act="copy"]')
  if (copyBtn) copyBtn.disabled = !(output || binary)
  const dlBtn = app.querySelector('[data-act="download"]')
  if (dlBtn) dlBtn.disabled = !(output || binary)
}

function paste() {
  navigator.clipboard?.readText().then((text) => {
    if (!text) { flashError(t().emptyPaste); return }
    input = text
    fileLoaded = null
    process()
    const ta = app.querySelector('#in'); if (ta) ta.focus()
  }).catch(() => flashError(t().noRead))
}

function copyOut(btn) {
  const data = output
  navigator.clipboard?.writeText(data).then(() => {
    const old = btn.innerHTML
    btn.innerHTML = copyIcon() + ' ' + t().copied
    setTimeout(() => { btn.innerHTML = old }, 1500)
  }).catch(() => {})
}

function downloadOut() {
  const text = app.querySelector('#in')?.value ?? input
  const trimmed = text.replace(/\s+/g, '')
  let payload = trimmed
  let mime = 'application/octet-stream'
  const m = trimmed.match(/^data:([^;,]+)?(;base64)?,(.*)$/i)
  if (m) { mime = m[1] || mime; payload = m[3] || '' }
  if (!payload) return
  let bytes
  try { bytes = b64ToBytes(fromUrlSafe(payload)) } catch { return }
  const ext = (mime.split('/')[1] || 'bin').split(';')[0]
  const name = `dotrino-base64.${ext}`
  const blob = new Blob([bytes], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function swap() {
  if (fileLoaded) return
  const wasOut = output
  mode = mode === 'encode' ? 'decode' : 'encode'
  input = wasOut
  output = ''
  process()
}

function flashError(msg) {
  error = msg
  render()
  setTimeout(() => { if (error === msg) { error = ''; render() } }, 2500)
}

/* ---------------- helpers / iconos ---------------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clipIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const trashIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-9 0v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6"/></svg>'
const upIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>'
const copyIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
const dlIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>'
const swapIcon = () => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>'

/* ---------------- Topbar (§5 / §6.1) ---------------- */
// Tema del modal "Mi perfil": espeja la paleta de la app (ver style.css) para que
// no desentone con el azul oscuro de Base64.
const PROFILE_THEME = {
  '--ccp-bg': '#0b1120', '--ccp-bg-2': '#111a2b', '--ccp-bg-3': '#131c2e', '--ccp-bg-4': '#182238',
  '--ccp-border': '#243049', '--ccp-text': '#e6edf6', '--ccp-muted': '#8a99b3',
  '--ccp-accent': '#2563eb', '--ccp-accent-2': '#3b82f6', '--ccp-accent-text': '#ffffff',
  '--ccp-input-bg': '#0d1526', '--ccp-radius': '16px',
  '--ccp-font': 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  '--ccp-font-mono': 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
}

if (topbar) {
  topbar.profileTheme = PROFILE_THEME
  // Idioma: el topbar manda. <dotrino-install> vive en LIGHT DOM, así que hay que
  // propagarle el idioma a mano (no lo hereda del componente).
  topbar.addEventListener('dotrino-lang', (e) => {
    lang = e.detail?.lang === 'en' ? 'en' : 'es'
    installEl?.setAttribute('lang', lang)
    render()
  })
}
installEl?.setAttribute('lang', lang)

// Identidad + reputación: las pide el botón de perfil del topbar (§6.1). Sin vault
// alcanzable quedan en null y el botón simplemente no abre el modal: la app sigue
// funcionando entera (codificar/decodificar es 100% local).
;(async () => {
  const id = await getIdentity()
  if (!topbar || !id) return
  topbar.identity = id
  const rep = await getReputation()
  if (rep) topbar.reputation = rep
})()

render()
