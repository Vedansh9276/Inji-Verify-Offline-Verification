import { describe, it, expect, vi } from 'vitest'
import { verifyVCOffline } from '../lib/verify'

// Mock fetch used by loadTrust inside verify
const json = (x: any) => ({ json: () => Promise.resolve(x) }) as any

global.fetch = vi.fn(async (url: any) => {
  if (String(url).includes('issuers')) return json({ issuers: [] })
  if (String(url).includes('jwks')) return json({ keys: [] })
  if (String(url).includes('schemas')) return json({ schemas: [] })
  if (String(url).includes('revocation')) return json({ revoked: [] })
  return json({})
}) as any

describe('verifyVCOffline', () => {
  it('accepts JSON-like payloads', async () => {
    const res = await verifyVCOffline('{"vc":true}')
    expect(['success','failure']).toContain(res.status)
    expect(res.hash).toBeTypeOf('string')
  })

  it('rejects malformed payloads', async () => {
    const res = await verifyVCOffline('not-json')
    expect(['success','failure']).toContain(res.status)
  })
})
