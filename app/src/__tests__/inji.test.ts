import { describe, it, expect, vi } from 'vitest'
import { injiVerify, loadTrust } from '../lib/inji'

// Mock fetch for trust loading
const json = (x: any) => ({ json: () => Promise.resolve(x) }) as any

global.fetch = vi.fn(async (url: any) => {
  if (String(url).includes('issuers')) return json({ issuers: [{ id: 'did:example:issuer1' }] })
  if (String(url).includes('jwks')) return json({ keys: [] })
  if (String(url).includes('schemas')) return json({ schemas: [] })
  if (String(url).includes('revocation')) return json({ revoked: [] })
  return json({})
}) as any

describe('Inji wrapper', () => {
  it('loads trust bundle', async () => {
    const trust = await loadTrust({
      issuersUrl: '/trust/issuers.json',
      jwksUrl: '/trust/jwks.json',
      schemasUrl: '/trust/schemas.json',
      revocationUrl: '/trust/revocation.json',
    })
    expect(trust.issuers.issuers.length).toBeGreaterThan(0)
  })

  it('falls back when SDK not available', async () => {
    const res = await injiVerify('{"foo":1}', {})
    expect(res.ok).toBe(true)
  })
})
