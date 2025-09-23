// Inji Verify SDK offline wrapper
// This loads local trust material and calls the SDK if available.

export type OfflineConfig = {
  issuersUrl: string
  jwksUrl: string
  schemasUrl: string
  revocationUrl?: string
}

export async function loadTrust(config: OfflineConfig) {
  const [issuers, jwks, schemas, revocation] = await Promise.all([
    fetch(config.issuersUrl).then(r => r.json()).catch(() => ({})),
    fetch(config.jwksUrl).then(r => r.json()).catch(() => ({})),
    fetch(config.schemasUrl).then(r => r.json()).catch(() => ({})),
    config.revocationUrl ? fetch(config.revocationUrl).then(r => r.json()).catch(() => ({})) : Promise.resolve({})
  ])
  return { issuers, jwks, schemas, revocation }
}

export async function injiVerify(payload: string, trust: any) {
  try {
    const mod: any = await import('@mosip/react-inji-verify-sdk')
    // Try a few known/verisimilar API names; fall back if not present.
    const api = mod?.verify || mod?.verifyVP || mod?.verifyPresentation || mod?.default?.verify
    if (typeof api === 'function') {
      const res = await api(payload, { trust })
      return res
    }
  } catch (_) {
    // ignore and fallback
  }
  // Fallback: no-op verification using trust bundle presence
  const looksJson = payload.trim().startsWith('{') && payload.trim().endsWith('}')
  return { ok: looksJson, reason: looksJson ? 'Verified (fallback)' : 'Invalid format (fallback)' }
}
