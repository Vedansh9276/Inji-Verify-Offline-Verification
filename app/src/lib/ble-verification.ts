// BLE VC Verification Implementation
// Based on MOSIP Tuvali and OpenID4VP offline flows

export interface BLEVerificationConfig {
  deviceRole: 'wallet' | 'verifier'
  encryptionKey?: string
  timeoutMs: number
  maxRetries: number
}

export interface VCTransferPacket {
  credential: any
  proof: any
  metadata: {
    issuer: string
    issuedAt: string
    expiresAt?: string
    proofType: string
    context: string[]
  }
  nonce: string
  timestamp: number
}

export interface FaceMatchResult {
  match: boolean
  confidence: number
  error?: string
}

export interface BLEVerificationResult {
  success: boolean
  credential: any
  verification: {
    signatureValid: boolean
    issuerTrusted: boolean
    notExpired: boolean
    formatValid: boolean
    faceMatch?: FaceMatchResult
  }
  errors: string[]
  timestamp: number
}

class BLEVerificationService {
  private config: BLEVerificationConfig
  private isScanning = false
  private isAdvertising = false

  constructor(config: BLEVerificationConfig) {
    this.config = config
  }

  // Wallet Mode: Advertise VC for sharing
  async startAdvertising(credential: any, proof: any): Promise<void> {
    if (this.config.deviceRole !== 'wallet') {
      throw new Error('Only wallet devices can advertise credentials')
    }

    this.isAdvertising = true
    
    const packet: VCTransferPacket = {
      credential,
      proof,
      metadata: {
        issuer: credential.issuer?.id || 'unknown',
        issuedAt: credential.issuanceDate,
        expiresAt: credential.expirationDate,
        proofType: proof.type || 'Ed25519Signature2020',
        context: credential['@context'] || []
      },
      nonce: this.generateNonce(),
      timestamp: Date.now()
    }

    // In real implementation, this would use Web Bluetooth API
    // For now, simulate BLE advertising
    console.log('BLE Advertising VC:', packet.metadata.issuer)
    
    // Simulate advertising for demo
    setTimeout(() => {
      this.isAdvertising = false
    }, 30000) // 30 second timeout
  }

  // Verifier Mode: Scan for and receive VCs
  async scanForCredentials(): Promise<VCTransferPacket[]> {
    if (this.config.deviceRole !== 'verifier') {
      throw new Error('Only verifier devices can scan for credentials')
    }

    this.isScanning = true
    const foundCredentials: VCTransferPacket[] = []

    // In real implementation, this would use Web Bluetooth API
    // For now, simulate scanning
    console.log('BLE Scanning for VCs...')
    
    // Simulate finding credentials
    setTimeout(() => {
      this.isScanning = false
    }, 10000) // 10 second scan

    return foundCredentials
  }

  // Perform offline verification
  async verifyCredentialOffline(packet: VCTransferPacket): Promise<BLEVerificationResult> {
    const errors: string[] = []
    let signatureValid = false
    let issuerTrusted = false
    let notExpired = false
    let formatValid = false

    try {
      // 1. Validate credential format
      formatValid = this.validateCredentialFormat(packet.credential)
      if (!formatValid) {
        errors.push('Invalid credential format')
      }

      // 2. Check expiration
      notExpired = this.checkExpiration(packet.credential)
      if (!notExpired) {
        errors.push('Credential has expired')
      }

      // 3. Verify issuer trust
      issuerTrusted = await this.verifyIssuerTrust(packet.metadata.issuer)
      if (!issuerTrusted) {
        errors.push('Untrusted issuer')
      }

      // 4. Verify digital signature
      signatureValid = await this.verifySignature(packet.credential, packet.proof)
      if (!signatureValid) {
        errors.push('Invalid digital signature')
      }

      // 5. Optional face match
      let faceMatch: FaceMatchResult | undefined
      if (this.config.deviceRole === 'verifier') {
        faceMatch = await this.performFaceMatch(packet.credential)
      }

      const success = signatureValid && issuerTrusted && notExpired && formatValid

      return {
        success,
        credential: packet.credential,
        verification: {
          signatureValid,
          issuerTrusted,
          notExpired,
          formatValid,
          faceMatch
        },
        errors,
        timestamp: Date.now()
      }

    } catch (error: any) {
      errors.push(`Verification error: ${error.message}`)
      return {
        success: false,
        credential: packet.credential,
        verification: {
          signatureValid: false,
          issuerTrusted: false,
          notExpired: false,
          formatValid: false
        },
        errors,
        timestamp: Date.now()
      }
    }
  }

  private validateCredentialFormat(credential: any): boolean {
    return !!(
      credential &&
      credential['@context'] &&
      credential.type &&
      credential.issuer &&
      credential.credentialSubject
    )
  }

  private checkExpiration(credential: any): boolean {
    if (!credential.expirationDate) return true
    return new Date(credential.expirationDate) > new Date()
  }

  private async verifyIssuerTrust(issuerId: string): Promise<boolean> {
    // Check against pre-provisioned trusted issuers
    const trustedIssuers = await this.getTrustedIssuers()
    return trustedIssuers.includes(issuerId)
  }

  private async verifySignature(_credential: any, _proof: any): Promise<boolean> {
    // Use pre-provisioned issuer public keys for signature verification
    const issuerKeys = await this.getIssuerPublicKeys(_credential.issuer?.id)
    if (!issuerKeys) return false

    // In real implementation, this would use Web Crypto API
    // For now, simulate signature verification
    return Math.random() > 0.1 // 90% success rate for demo
  }

  private async performFaceMatch(_credential: any): Promise<FaceMatchResult> {
    // In real implementation, this would use tflite/ML Kit
    // For now, simulate face matching
    return {
      match: Math.random() > 0.2, // 80% match rate for demo
      confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
    }
  }

  private async getTrustedIssuers(): Promise<string[]> {
    // Load from secure storage
    return [
      'did:mosip:issuer:gov',
      'did:mosip:issuer:health',
      'did:mosip:issuer:education'
    ]
  }

  private async getIssuerPublicKeys(issuerId?: string): Promise<any> {
    // Load issuer public keys from secure storage
    return {
      'did:mosip:issuer:gov': { type: 'Ed25519', publicKey: 'mock-key-1' },
      'did:mosip:issuer:health': { type: 'RSA', publicKey: 'mock-key-2' },
      'did:mosip:issuer:education': { type: 'Ed25519', publicKey: 'mock-key-3' }
    }[issuerId || '']
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  stopAdvertising(): void {
    this.isAdvertising = false
  }

  stopScanning(): void {
    this.isScanning = false
  }

  getStatus(): { isScanning: boolean; isAdvertising: boolean } {
    return {
      isScanning: this.isScanning,
      isAdvertising: this.isAdvertising
    }
  }
}

export const createBLEVerificationService = (config: BLEVerificationConfig) => 
  new BLEVerificationService(config)

// Compact encoding utilities for BLE transfer
export function encodeVCForBLE(packet: VCTransferPacket): Uint8Array {
  const json = JSON.stringify(packet)
  const encoder = new TextEncoder()
  return encoder.encode(json)
}

export function decodeVCFromBLE(data: Uint8Array): VCTransferPacket {
  const decoder = new TextDecoder()
  const json = decoder.decode(data)
  return JSON.parse(json)
}

// CWT/CBOR encoding for compact transfer (MOSIP Claim 169 style)
export function encodeAsCWT(packet: VCTransferPacket): Uint8Array {
  // Simplified CWT encoding - in real implementation use proper CBOR library
  const compact = {
    iss: packet.metadata.issuer,
    iat: packet.timestamp,
    exp: packet.metadata.expiresAt ? new Date(packet.metadata.expiresAt).getTime() : undefined,
    vc: packet.credential,
    proof: packet.proof,
    nonce: packet.nonce
  }
  
  const json = JSON.stringify(compact)
  const encoder = new TextEncoder()
  return encoder.encode(json)
}
