// Puente al registro de reputación (@dotrino/reputation, backend rep.dotrino.com).
// Lo consume el modal de perfil del topbar (§6.1): cualquier app puede ser
// calificada, así que la utilidad local también tiene identidad y reputación.
import { createVaultReputation } from '@dotrino/reputation'
import { getIdentity } from './identity'

let _rep = null

/** Instancia compartida de reputación (o null si no hay vault). */
export async function getReputation () {
  if (_rep) return _rep
  const id = await getIdentity()
  if (!id) return null
  try { _rep = createVaultReputation(id) } catch (_) { _rep = null }
  return _rep
}
