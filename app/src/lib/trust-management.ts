// Trust Management System for Offline VC Verification
// Pre-provisioned issuer public keys and revocation lists

export interface TrustedIssuer {
  id: string
  name: string
  publicKeys: IssuerPublicKey[]
  metadata: {
    verificationMethod: string
    assertionMethod: string
    wellKnownUrl?: string
    supportedProofTypes: string[]
  }
  lastUpdated: number
}

export interface IssuerPublicKey {
  id: string
  type: 'RSA' | 'Ed25519' | 'ECDSA'
  publicKey: string
  algorithm: string
  expiresAt?: number
  revoked: boolean
}

export interface RevocationList {
  issuerId: string
  revokedCredentials: string[]
  lastUpdated: number
  nextUpdate: number
  signature: string
}

export interface TrustBundle {
  issuers: TrustedIssuer[]
  revocationLists: RevocationList[]
  schemas: any[]
  contexts: any[]
  version: string
  expiresAt: number
  signature: string
}

class TrustManagementService {
  private trustBundle: TrustBundle | null = null
  private revocationCache: Map<string, RevocationList> = new Map()

  async loadTrustBundle(bundlePath: string): Promise<void> {
    try {
      // In real implementation, load from secure storage or pre-provisioned assets
      const response = await fetch(bundlePath)
      if (!response.ok) {
        throw new Error(`Failed to load trust bundle: ${response.statusText}`)
      }
      
      this.trustBundle = await response.json()
      
      // Cache revocation lists
      for (const revocationList of this.trustBundle!.revocationLists) {
        this.revocationCache.set(revocationList.issuerId, revocationList)
      }
      
      console.log(`Loaded trust bundle with ${this.trustBundle!.issuers.length} issuers`)
    } catch (error: any) {
      throw new Error(`Trust bundle loading failed: ${error.message}`)
    }
  }

  async verifyIssuerTrust(issuerId: string): Promise<boolean> {
    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded')
    }

    const issuer = this.trustBundle!.issuers.find(i => i.id === issuerId)
    return !!issuer && !this.isIssuerExpired(issuer!)
  }

  async getIssuerPublicKey(issuerId: string, keyId?: string): Promise<IssuerPublicKey | null> {
    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded')
    }

    const issuer = this.trustBundle!.issuers.find(i => i.id === issuerId)
    if (!issuer) return null

    if (keyId) {
      return issuer.publicKeys.find(k => k.id === keyId) || null
    }

    // Return the first non-revoked, non-expired key
    return issuer.publicKeys.find(k => 
      !k.revoked && 
      (!k.expiresAt || k.expiresAt > Date.now())
    ) || null
  }

  async verifyCredentialRevocation(issuerId: string, credentialId: string): Promise<boolean> {
    const revocationList = this.revocationCache.get(issuerId)
    if (!revocationList) {
      // If no revocation list available, assume not revoked
      return true
    }

    // Check if credential is in revocation list
    return !revocationList.revokedCredentials.includes(credentialId)
  }

  async verifySignature(
    credential: any, 
    proof: any, 
    issuerId: string
  ): Promise<boolean> {
    try {
      const publicKey = await this.getIssuerPublicKey(issuerId, proof.verificationMethod)
      if (!publicKey) {
        throw new Error('Public key not found for issuer')
      }

      // In real implementation, use Web Crypto API for signature verification
      // For now, simulate verification based on proof type
      return this.simulateSignatureVerification(credential, proof, publicKey)
    } catch (error: any) {
      console.error('Signature verification failed:', error)
      return false
    }
  }

  async getSupportedProofTypes(issuerId: string): Promise<string[]> {
    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded')
    }

    const issuer = this.trustBundle!.issuers.find(i => i.id === issuerId)
    return issuer?.metadata.supportedProofTypes || []
  }

  async validateCredentialSchema(credential: any): Promise<boolean> {
    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded')
    }

    // Check if credential type is supported
    const credentialType = credential.type
    const supportedSchemas = this.trustBundle.schemas
    
    return supportedSchemas.some(schema => 
      schema.type === credentialType || 
      schema.supportedTypes?.includes(credentialType)
    )
  }

  async getIssuerMetadata(issuerId: string): Promise<any> {
    if (!this.trustBundle) {
      throw new Error('Trust bundle not loaded')
    }

    const issuer = this.trustBundle!.issuers.find(i => i.id === issuerId)
    return issuer?.metadata || null
  }

  async updateRevocationList(issuerId: string, revocationList: RevocationList): Promise<void> {
    this.revocationCache.set(issuerId, revocationList)
    
    // In real implementation, persist to secure storage
    console.log(`Updated revocation list for issuer: ${issuerId}`)
  }

  async isTrustBundleValid(): Promise<boolean> {
    if (!this.trustBundle) return false
    
    // Check if trust bundle has expired
    if (this.trustBundle.expiresAt < Date.now()) {
      return false
    }
    
    // In real implementation, verify trust bundle signature
    return this.simulateTrustBundleSignatureVerification()
  }

  getTrustBundleInfo(): { issuerCount: number; revocationListCount: number; expiresAt: number } | null {
    if (!this.trustBundle) return null
    
    return {
      issuerCount: this.trustBundle.issuers.length,
      revocationListCount: this.trustBundle.revocationLists.length,
      expiresAt: this.trustBundle.expiresAt
    }
  }

  private isIssuerExpired(issuer: TrustedIssuer): boolean {
    // Check if all public keys are expired
    return issuer.publicKeys.every(key => 
      key.expiresAt && key.expiresAt < Date.now()
    )
  }

  private simulateSignatureVerification(
    _credential: any, 
    _proof: any, 
    _publicKey: IssuerPublicKey
  ): boolean {
    // In real implementation, use Web Crypto API
    // For now, simulate verification based on proof type compatibility
    const supportedTypes = ['Ed25519Signature2020', 'RsaSignature2018', 'EcdsaSecp256k1Signature2019']
    return supportedTypes.includes(_proof.type) && Math.random() > 0.1 // 90% success rate
  }

  private simulateTrustBundleSignatureVerification(): boolean {
    // In real implementation, verify trust bundle signature
    return Math.random() > 0.05 // 95% success rate
  }
}

export const createTrustManagementService = () => new TrustManagementService()

// Default MOSIP trust bundle structure
export const DEFAULT_TRUST_BUNDLE: TrustBundle = {
  issuers: [
    {
      id: 'did:mosip:issuer:gov',
      name: 'MOSIP Government Issuer',
      publicKeys: [
        {
          id: 'did:mosip:issuer:gov#key-1',
          type: 'Ed25519',
          publicKey: 'mock-ed25519-public-key',
          algorithm: 'EdDSA',
          expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
          revoked: false
        }
      ],
      metadata: {
        verificationMethod: 'did:mosip:issuer:gov#key-1',
        assertionMethod: 'did:mosip:issuer:gov#key-1',
        supportedProofTypes: ['Ed25519Signature2020', 'RsaSignature2018']
      },
      lastUpdated: Date.now()
    },
    {
      id: 'did:mosip:issuer:health',
      name: 'MOSIP Health Issuer',
      publicKeys: [
        {
          id: 'did:mosip:issuer:health#key-1',
          type: 'RSA',
          publicKey: 'mock-rsa-public-key',
          algorithm: 'RS256',
          expiresAt: Date.now() + (180 * 24 * 60 * 60 * 1000), // 6 months
          revoked: false
        }
      ],
      metadata: {
        verificationMethod: 'did:mosip:issuer:health#key-1',
        assertionMethod: 'did:mosip:issuer:health#key-1',
        supportedProofTypes: ['RsaSignature2018', 'Ed25519Signature2020']
      },
      lastUpdated: Date.now()
    }
  ],
  revocationLists: [
    {
      issuerId: 'did:mosip:issuer:gov',
      revokedCredentials: [],
      lastUpdated: Date.now(),
      nextUpdate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 1 week
      signature: 'mock-revocation-signature'
    }
  ],
  schemas: [
    {
      type: 'VerifiableCredential',
      schema: 'https://www.w3.org/2018/credentials/v1'
    },
    {
      type: 'MOSIPCredential',
      schema: 'https://mosip.io/credentials/v1'
    }
  ],
  contexts: [
    {
      '@context': 'https://www.w3.org/2018/credentials/v1'
    },
    {
      '@context': 'https://mosip.io/credentials/v1'
    }
  ],
  version: '1.0.0',
  expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
  signature: 'mock-trust-bundle-signature'
}

// Utility functions for trust bundle management
export async function createTrustBundleFromMOSIP(
  mosipData: any
): Promise<TrustBundle> {
  // Convert MOSIP trust bundle format to our internal format
  return {
    issuers: mosipData.issuers || [],
    revocationLists: mosipData.revocationLists || [],
    schemas: mosipData.schemas || [],
    contexts: mosipData.contexts || [],
    version: mosipData.version || '1.0.0',
    expiresAt: mosipData.expiresAt || (Date.now() + (30 * 24 * 60 * 60 * 1000)),
    signature: mosipData.signature || ''
  }
}

export function validateTrustBundleIntegrity(bundle: TrustBundle): boolean {
  // Basic validation of trust bundle structure
  return !!(
    bundle.issuers &&
    bundle.issuers.length > 0 &&
    bundle.version &&
    bundle.expiresAt > Date.now()
  )
}
