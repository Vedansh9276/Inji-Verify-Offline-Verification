import { injiVerify, loadTrust } from './inji'

export type VerifyOutcome = {
  status: 'success' | 'failure'
  message: string
  hash: string
  details?: unknown
}

function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i) | 0
  }
  return (h >>> 0).toString(16)
}

export async function verifyVCOffline(qrPayload: string): Promise<VerifyOutcome> {
  const trimmed = qrPayload.trim()
  const hash = simpleHash(trimmed)

  const trust = await loadTrust({
    issuersUrl: '/trust/issuers.json',
    jwksUrl: '/trust/jwks.json',
    schemasUrl: '/trust/schemas.json',
    revocationUrl: '/trust/revocation.json',
  })

  const result: any = await injiVerify(trimmed, trust)
  const ok = !!(result?.ok ?? result?.valid ?? result?.verified)
  const reason = result?.reason || (ok ? 'Verified' : 'Not verified')

  return {
    status: ok ? 'success' : 'failure',
    message: reason,
    hash,
    details: result,
  }
}
