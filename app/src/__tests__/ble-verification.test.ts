import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  createBLEVerificationService, 
  type BLEVerificationConfig,
  encodeVCForBLE,
  decodeVCFromBLE,
  encodeAsCWT
} from '../lib/ble-verification'

describe('BLE Verification Service', () => {
  let config: BLEVerificationConfig
  let service: ReturnType<typeof createBLEVerificationService>

  beforeEach(() => {
    config = {
      deviceRole: 'verifier',
      timeoutMs: 30000,
      maxRetries: 3
    }
    service = createBLEVerificationService(config)
  })

  describe('Wallet Mode', () => {
    beforeEach(() => {
      config.deviceRole = 'wallet'
      service = createBLEVerificationService(config)
    })

    it('should start advertising VC', async () => {
      const mockCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:mosip:issuer:gov' },
        credentialSubject: { id: 'did:mosip:holder:123' }
      }

      const mockProof = {
        type: 'Ed25519Signature2020',
        verificationMethod: 'did:mosip:issuer:gov#key-1',
        proofValue: 'mock-signature'
      }

      await expect(service.startAdvertising(mockCredential, mockProof)).resolves.not.toThrow()
      expect(service.getStatus().isAdvertising).toBe(true)
    })

    it('should reject advertising in verifier mode', async () => {
      config.deviceRole = 'verifier'
      service = createBLEVerificationService(config)

      const mockCredential = { issuer: { id: 'test' } }
      const mockProof = { type: 'Ed25519Signature2020' }

      await expect(service.startAdvertising(mockCredential, mockProof))
        .rejects.toThrow('Only wallet devices can advertise credentials')
    })

    it('should stop advertising', () => {
      service.stopAdvertising()
      expect(service.getStatus().isAdvertising).toBe(false)
    })
  })

  describe('Verifier Mode', () => {
    beforeEach(() => {
      config.deviceRole = 'verifier'
      service = createBLEVerificationService(config)
    })

    it('should scan for credentials', async () => {
      const credentials = await service.scanForCredentials()
      expect(Array.isArray(credentials)).toBe(true)
      expect(service.getStatus().isScanning).toBe(true)
    })

    it('should reject scanning in wallet mode', async () => {
      config.deviceRole = 'wallet'
      service = createBLEVerificationService(config)

      await expect(service.scanForCredentials())
        .rejects.toThrow('Only verifier devices can scan for credentials')
    })

    it('should stop scanning', () => {
      service.stopScanning()
      expect(service.getStatus().isScanning).toBe(false)
    })
  })

  describe('Offline Verification', () => {
    const mockPacket = {
      credential: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential'],
        issuer: { id: 'did:mosip:issuer:gov' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:mosip:holder:123' }
      },
      proof: {
        type: 'Ed25519Signature2020',
        verificationMethod: 'did:mosip:issuer:gov#key-1',
        proofValue: 'mock-signature'
      },
      metadata: {
        issuer: 'did:mosip:issuer:gov',
        issuedAt: new Date().toISOString(),
        proofType: 'Ed25519Signature2020',
        context: ['https://www.w3.org/2018/credentials/v1']
      },
      nonce: 'test-nonce',
      timestamp: Date.now()
    }

    it('should verify valid credential', async () => {
      const result = await service.verifyCredentialOffline(mockPacket)
      
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('credential')
      expect(result).toHaveProperty('verification')
      expect(result).toHaveProperty('errors')
      expect(result).toHaveProperty('timestamp')
      
      expect(result.verification).toHaveProperty('signatureValid')
      expect(result.verification).toHaveProperty('issuerTrusted')
      expect(result.verification).toHaveProperty('notExpired')
      expect(result.verification).toHaveProperty('formatValid')
    })

    it('should handle invalid credential format', async () => {
      const invalidPacket = {
        ...mockPacket,
        credential: { invalid: 'format' }
      }

      const result = await service.verifyCredentialOffline(invalidPacket)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('Invalid credential format')
    })

    it('should handle expired credential', async () => {
      const expiredPacket = {
        ...mockPacket,
        credential: {
          ...mockPacket.credential,
          expirationDate: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      }

      const result = await service.verifyCredentialOffline(expiredPacket)
      expect(result.verification.notExpired).toBe(false)
    })
  })

  describe('Encoding/Decoding', () => {
    const mockPacket = {
      credential: { issuer: { id: 'test' } },
      proof: { type: 'Ed25519Signature2020' },
      metadata: { issuer: 'test', issuedAt: new Date().toISOString(), proofType: 'Ed25519Signature2020', context: [] },
      nonce: 'test-nonce',
      timestamp: Date.now()
    }

    it('should encode and decode VC packet', () => {
      const encoded = encodeVCForBLE(mockPacket)
      const decoded = decodeVCFromBLE(encoded)
      
      expect(decoded).toEqual(mockPacket)
    })

    it('should encode as CWT', () => {
      const encoded = encodeAsCWT(mockPacket)
      expect(encoded).toBeInstanceOf(Uint8Array)
      expect(encoded.length).toBeGreaterThan(0)
    })

    it('should handle empty packet', () => {
      const emptyPacket = {
        credential: {},
        proof: {},
        metadata: { issuer: '', issuedAt: '', proofType: '', context: [] },
        nonce: '',
        timestamp: 0
      }

      const encoded = encodeVCForBLE(emptyPacket)
      const decoded = decodeVCFromBLE(encoded)
      
      expect(decoded).toEqual(emptyPacket)
    })
  })

  describe('Error Handling', () => {
    it('should handle verification errors gracefully', async () => {
      const invalidPacket = {
        credential: null,
        proof: null,
        metadata: null,
        nonce: '',
        timestamp: 0
      }

      const result = await service.verifyCredentialOffline(invalidPacket as any)
      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should handle network errors', async () => {
      // Mock network error
      vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const result = await service.scanForCredentials()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
