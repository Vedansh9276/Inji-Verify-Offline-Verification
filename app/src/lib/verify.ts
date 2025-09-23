import { injiVerify, loadTrust } from './inji'
import { validateQRPayload, sanitizeQRPayload, generateSecureHash } from './security'

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

// Keep for backward compatibility
export { simpleHash }

export async function verifyVCOffline(qrPayload: string): Promise<VerifyOutcome> {
  // Validate and sanitize input
  const validation = validateQRPayload(qrPayload)
  if (!validation.valid) {
    return {
      status: 'failure',
      message: validation.error || 'Invalid payload',
      hash: generateSecureHash(qrPayload)
    }
  }

  const sanitizedPayload = sanitizeQRPayload(qrPayload)
  const hash = generateSecureHash(sanitizedPayload)

  const trust = await loadTrust({
    issuersUrl: '/trust/issuers.json',
    jwksUrl: '/trust/jwks.json',
    schemasUrl: '/trust/schemas.json',
    revocationUrl: '/trust/revocation.json',
  })

  const result: any = await injiVerify(sanitizedPayload, trust)
  const ok = !!(result?.ok ?? result?.valid ?? result?.verified)
  const reason = result?.reason || (ok ? 'Verified' : 'Not verified')

  return {
    status: ok ? 'success' : 'failure',
    message: reason,
    hash,
    details: result,
  }
}
