/**
 * Idioma: el topbar (@dotrino/topbar) es la fuente de verdad y persiste la
 * preferencia en 'dotrino.lang' (compartida por todo el ecosistema). Esta app
 * guardaba antes la suya en 'base64.lang'; la migramos UNA vez para no resetear
 * el idioma a quien ya lo había elegido.
 *
 * OJO CON EL ORDEN: este módulo debe evaluarse ANTES de '@dotrino/topbar'. El
 * topbar resuelve el idioma en su connectedCallback, que corre al definirse el
 * elemento (es decir, al evaluarse su módulo). Por eso main.js lo importa
 * primero; no reordenes ese import.
 */
const OLD_KEY = 'base64.lang'
const KEY = 'dotrino.lang'

try {
  const old = localStorage.getItem(OLD_KEY)
  if (old) {
    if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, old === 'en' ? 'en' : 'es')
    localStorage.removeItem(OLD_KEY) // migrado: la clave vieja ya no manda
  }
} catch (_) { /* modo privado: sin persistencia, el topbar cae a navigator.language */ }
