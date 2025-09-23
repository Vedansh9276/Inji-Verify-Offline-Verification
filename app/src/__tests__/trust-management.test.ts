import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createTrustManagementService,
  DEFAULT_TRUST_BUNDLE,
  createTrustBundleFromMOSIP,
  validateTrustBundleIntegrity,
  type TrustBundle,
  type TrustedIssuer
} from '../lib/trust-management'

describe('Trust Management Service', () => {
  let service: ReturnType<typeof createTrustManagementService>

  beforeEach(() => {
    service = createTrustManagementService()
    
    // Mock fetch for trust bundle loading
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(DEFAULT_TRUST_BUNDLE)
      })
    ) as any
  })

  describe('Trust Bundle Loading', () => {
    it('should load trust bundle successfully', async () => {
      await expect(service.loadTrustBundle('/trust/trust-bundle.json')).resolves.not.toThrow()
      
      const info = service.getTrustBundleInfo()
      expect(info).not.toBeNull()
      expect(info?.issuerCount).toBeGreaterThan(0)
    })

    it('should handle loading errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          statusText: 'Not Found'
        })
      ) as any

      await expect(service.loadTrustBundle('/invalid/path.json'))
        .rejects.toThrow('Failed to load trust bundle: Not Found')
    })

    it('should cache revocation lists', async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
      
      const info = service.getTrustBundleInfo()
      expect(info?.revocationListCount).toBeGreaterThan(0)
    })
  })

  describe('Issuer Trust Verification', () => {
    beforeEach(async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
    })

    it('should verify trusted issuer', async () => {
      const result = await service.verifyIssuerTrust('did:mosip:issuer:gov')
      expect(result).toBe(true)
    })

    it('should reject untrusted issuer', async () => {
      const result = await service.verifyIssuerTrust('did:unknown:issuer')
      expect(result).toBe(false)
    })

    it('should handle expired issuer', async () => {
      // Create expired issuer
      const expiredIssuer: TrustedIssuer = {
        id: 'did:mosip:issuer:expired',
        name: 'Expired Issuer',
        publicKeys: [{
          id: 'expired-key',
          type: 'Ed25519',
          publicKey: 'mock-key',
          algorithm: 'EdDSA',
          expiresAt: Date.now() - 86400000, // 1 day ago
          revoked: false
        }],
        metadata: {
          verificationMethod: 'expired-key',
          assertionMethod: 'expired-key',
          supportedProofTypes: ['Ed25519Signature2020']
        },
        lastUpdated: Date.now()
      }

      // Mock expired issuer in trust bundle
      const expiredBundle = {
        ...DEFAULT_TRUST_BUNDLE,
        issuers: [...DEFAULT_TRUST_BUNDLE.issuers, expiredIssuer]
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(expiredBundle)
        })
      ) as any

      await service.loadTrustBundle('/trust/trust-bundle.json')
      const result = await service.verifyIssuerTrust('did:mosip:issuer:expired')
      expect(result).toBe(false)
    })
  })

  describe('Public Key Management', () => {
    beforeEach(async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
    })

    it('should get issuer public key', async () => {
      const key = await service.getIssuerPublicKey('did:mosip:issuer:gov')
      expect(key).not.toBeNull()
      expect(key?.type).toBe('Ed25519')
      expect(key?.revoked).toBe(false)
    })

    it('should get specific key by ID', async () => {
      const key = await service.getIssuerPublicKey('did:mosip:issuer:gov', 'did:mosip:issuer:gov#key-1')
      expect(key).not.toBeNull()
      expect(key?.id).toBe('did:mosip:issuer:gov#key-1')
    })

    it('should return null for unknown issuer', async () => {
      const key = await service.getIssuerPublicKey('did:unknown:issuer')
      expect(key).toBeNull()
    })

    it('should return null for revoked key', async () => {
      // Create revoked key
      const revokedKey = {
        id: 'revoked-key',
        type: 'Ed25519' as const,
        publicKey: 'mock-key',
        algorithm: 'EdDSA',
        expiresAt: Date.now() + 86400000,
        revoked: true
      }

      const revokedIssuer: TrustedIssuer = {
        id: 'did:mosip:issuer:revoked',
        name: 'Revoked Issuer',
        publicKeys: [revokedKey],
        metadata: {
          verificationMethod: 'revoked-key',
          assertionMethod: 'revoked-key',
          supportedProofTypes: ['Ed25519Signature2020']
        },
        lastUpdated: Date.now()
      }

      const revokedBundle = {
        ...DEFAULT_TRUST_BUNDLE,
        issuers: [...DEFAULT_TRUST_BUNDLE.issuers, revokedIssuer]
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(revokedBundle)
        })
      ) as any

      await service.loadTrustBundle('/trust/trust-bundle.json')
      const key = await service.getIssuerPublicKey('did:mosip:issuer:revoked')
      expect(key).toBeNull()
    })
  })

  describe('Credential Revocation', () => {
    beforeEach(async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
    })

    it('should verify non-revoked credential', async () => {
      const result = await service.verifyCredentialRevocation('did:mosip:issuer:gov', 'cred-123')
      expect(result).toBe(true)
    })

    it('should handle missing revocation list', async () => {
      const result = await service.verifyCredentialRevocation('did:unknown:issuer', 'cred-123')
      expect(result).toBe(true) // Assume not revoked if no list available
    })

    it('should update revocation list', async () => {
      const revocationList = {
        issuerId: 'did:mosip:issuer:gov',
        revokedCredentials: ['cred-123'],
        lastUpdated: Date.now(),
        nextUpdate: Date.now() + 86400000,
        signature: 'mock-signature'
      }

      await service.updateRevocationList('did:mosip:issuer:gov', revocationList)
      
      const result = await service.verifyCredentialRevocation('did:mosip:issuer:gov', 'cred-123')
      expect(result).toBe(false) // Should be revoked now
    })
  })

  describe('Signature Verification', () => {
    beforeEach(async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
    })

    it('should verify signature', async () => {
      const mockCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:mosip:issuer:gov' }
      }

      const mockProof = {
        type: 'Ed25519Signature2020',
        verificationMethod: 'did:mosip:issuer:gov#key-1',
        proofValue: 'mock-signature'
      }

      const result = await service.verifySignature(mockCredential, mockProof, 'did:mosip:issuer:gov')
      expect(typeof result).toBe('boolean')
    })

    it('should handle missing public key', async () => {
      const mockCredential = { issuer: { id: 'did:unknown:issuer' } }
      const mockProof = { verificationMethod: 'unknown-key' }

      const result = await service.verifySignature(mockCredential, mockProof, 'did:unknown:issuer')
      expect(result).toBe(false)
    })
  })

  describe('Schema Validation', () => {
    beforeEach(async () => {
      await service.loadTrustBundle('/trust/trust-bundle.json')
    })

    it('should validate supported credential schema', async () => {
      const credential = {
        type: ['VerifiableCredential', 'MOSIPCredential']
      }

      const result = await service.validateCredentialSchema(credential)
      expect(result).toBe(true)
    })

    it('should reject unsupported credential schema', async () => {
      const credential = {
        type: ['UnsupportedCredential']
      }

      const result = await service.validateCredentialSchema(credential)
      expect(result).toBe(false)
    })
  })

  describe('Trust Bundle Validation', () => {
    it('should validate trust bundle integrity', async () => {
      const result = await service.isTrustBundleValid()
      expect(typeof result).toBe('boolean')
    })

    it('should handle expired trust bundle', async () => {
      const expiredBundle = {
        ...DEFAULT_TRUST_BUNDLE,
        expiresAt: Date.now() - 86400000 // 1 day ago
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(expiredBundle)
        })
      ) as any

      await service.loadTrustBundle('/trust/trust-bundle.json')
      const result = await service.isTrustBundleValid()
      expect(result).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    it('should create trust bundle from MOSIP data', async () => {
      const mosipData = {
        issuers: [{ id: 'test-issuer' }],
        revocationLists: [],
        schemas: [],
        contexts: [],
        version: '1.0.0',
        expiresAt: Date.now() + 86400000,
        signature: 'mock-signature'
      }

      const bundle = await createTrustBundleFromMOSIP(mosipData)
      
      expect(bundle.issuers).toHaveLength(1)
      expect(bundle.version).toBe('1.0.0')
      expect(bundle.signature).toBe('mock-signature')
    })

    it('should validate trust bundle integrity', () => {
      const validBundle: TrustBundle = {
        issuers: [{ 
          id: 'test',
          name: 'Test',
          publicKeys: [],
          metadata: { verificationMethod: '', assertionMethod: '', supportedProofTypes: [] },
          lastUpdated: Date.now()
        }],
        revocationLists: [],
        schemas: [],
        contexts: [],
        version: '1.0.0',
        expiresAt: Date.now() + 86400000,
        signature: 'mock'
      }

      expect(validateTrustBundleIntegrity(validBundle)).toBe(true)
    })

    it('should reject invalid trust bundle', () => {
      const invalidBundle = {
        issuers: [],
        revocationLists: [],
        schemas: [],
        contexts: [],
        version: '',
        expiresAt: Date.now() - 86400000, // Expired
        signature: ''
      }

      expect(validateTrustBundleIntegrity(invalidBundle as TrustBundle)).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle operations without loaded trust bundle', async () => {
      const unloadedService = createTrustManagementService()
      
      await expect(unloadedService.verifyIssuerTrust('test'))
        .rejects.toThrow('Trust bundle not loaded')
    })

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')))
      
      await expect(service.loadTrustBundle('/trust/trust-bundle.json'))
        .rejects.toThrow('Trust bundle loading failed: Network error')
    })
  })
})
