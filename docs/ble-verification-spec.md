# BLE VC Verification Technical Specification

## Overview

This document specifies the implementation of offline Verifiable Credential (VC) verification over Bluetooth Low Energy (BLE) for the INJI Offline Verifier application, based on MOSIP's existing capabilities and OpenID4VP offline flows.

## Architecture

### Components

1. **BLE Verification Service** (`lib/ble-verification.ts`)
   - Handles BLE communication and VC transfer
   - Manages device roles (wallet/verifier)
   - Performs offline verification logic

2. **Face Matching Service** (`lib/face-match.ts`)
   - Offline face detection and matching
   - Uses tflite/ML Kit approach (MOSIP compatible)
   - Configurable confidence thresholds

3. **Trust Management Service** (`lib/trust-management.ts`)
   - Pre-provisioned issuer public keys
   - Revocation list caching
   - Trust bundle validation

4. **BLE Verification UI** (`components/BLEVerification.tsx`)
   - Wallet and verifier mode interfaces
   - Real-time status updates
   - Verification result display

## BLE Protocol Specification

### Device Roles

- **Wallet Device**: Advertises VCs for sharing
- **Verifier Device**: Scans for and receives VCs

### VC Transfer Packet Format

```typescript
interface VCTransferPacket {
  credential: VerifiableCredential
  proof: ProofObject
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
```

### Compact Encoding (CWT/CBOR)

For efficient BLE transfer, VCs are encoded using CWT (CBOR Web Token) format:

```typescript
interface CWTClaims {
  iss: string        // Issuer ID
  iat: number       // Issued at timestamp
  exp?: number      // Expiration timestamp
  vc: any          // Verifiable Credential
  proof: any       // Proof object
  nonce: string    // Anti-replay nonce
}
```

## Verification Process

### 1. Pre-verification Setup

- Load trust bundle with issuer public keys
- Initialize face matching model
- Verify trust bundle integrity and expiration

### 2. BLE Communication

#### Wallet Mode (Advertising)
1. Create VC transfer packet with nonce
2. Encode packet using CWT format
3. Advertise encoded packet via BLE
4. Wait for verifier connection
5. Transfer packet securely

#### Verifier Mode (Scanning)
1. Scan for BLE advertisements
2. Connect to wallet device
3. Receive encoded packet
4. Decode CWT packet
5. Validate packet integrity

### 3. Offline Verification Steps

1. **Format Validation**
   - Validate VC structure and required fields
   - Check credential context and type

2. **Expiration Check**
   - Verify credential not expired
   - Check issuance date validity

3. **Issuer Trust Verification**
   - Lookup issuer in trust bundle
   - Verify issuer public key availability
   - Check issuer metadata

4. **Digital Signature Verification**
   - Extract proof object
   - Get issuer public key
   - Verify signature using Web Crypto API
   - Support proof types: Ed25519Signature2020, RsaSignature2018

5. **Revocation Check**
   - Check cached revocation list
   - Verify credential not revoked
   - Handle missing revocation lists gracefully

6. **Face Matching (Optional)**
   - Extract face image from credential
   - Capture live face image
   - Perform offline face matching
   - Return confidence score

### 4. Result Generation

```typescript
interface BLEVerificationResult {
  success: boolean
  credential: VerifiableCredential
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
```

## Security Considerations

### BLE Security

1. **Encryption**: All BLE communications encrypted
2. **Authentication**: Device pairing and bonding
3. **MITM Protection**: Secure pairing procedures
4. **Replay Protection**: Nonce-based anti-replay

### Cryptographic Security

1. **Key Management**: Secure storage of issuer public keys
2. **Signature Verification**: Web Crypto API for cryptographic operations
3. **Trust Bundle Integrity**: Signature verification of trust bundles
4. **Revocation Lists**: Cryptographic verification of revocation data

### Privacy Protection

1. **PII Handling**: Secure processing of personal information
2. **Face Data**: Local processing only, no network transmission
3. **Audit Logging**: Secure local logging of verification events
4. **Data Minimization**: Only necessary data transferred

## Trust Bundle Format

### Structure

```typescript
interface TrustBundle {
  issuers: TrustedIssuer[]
  revocationLists: RevocationList[]
  schemas: SchemaDefinition[]
  contexts: ContextDefinition[]
  version: string
  expiresAt: number
  signature: string
}
```

### Issuer Configuration

```typescript
interface TrustedIssuer {
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
```

### Revocation List

```typescript
interface RevocationList {
  issuerId: string
  revokedCredentials: string[]
  lastUpdated: number
  nextUpdate: number
  signature: string
}
```

## Face Matching Specification

### Model Requirements

- **Format**: TensorFlow Lite (.tflite)
- **Size**: Optimized for mobile deployment
- **Accuracy**: Minimum 95% accuracy on test set
- **Performance**: <500ms inference time

### Face Detection

```typescript
interface FaceDetectionResult {
  faces: Array<{
    boundingBox: { x: number; y: number; width: number; height: number }
    landmarks: Array<{ x: number; y: number }>
    confidence: number
  }>
  success: boolean
  error?: string
}
```

### Face Matching

```typescript
interface FaceMatchResult {
  match: boolean
  confidence: number
  similarity: number
  error?: string
}
```

## Error Handling

### BLE Errors

- Connection failures
- Timeout errors
- Data corruption
- Device compatibility issues

### Verification Errors

- Invalid credential format
- Expired credentials
- Untrusted issuers
- Invalid signatures
- Revoked credentials
- Face match failures

### Recovery Strategies

- Automatic retry with exponential backoff
- Graceful degradation (skip optional checks)
- User-friendly error messages
- Fallback to QR code verification

## Performance Requirements

### BLE Transfer

- **Latency**: <5 seconds for VC transfer
- **Throughput**: Support VCs up to 10KB
- **Range**: 10-meter effective range
- **Battery**: Minimal impact on device battery

### Verification

- **Speed**: <2 seconds for complete verification
- **Memory**: <50MB RAM usage
- **Storage**: <100MB for trust bundle and models
- **CPU**: Efficient cryptographic operations

## Platform Compatibility

### Web (PWA)

- Web Bluetooth API support
- Service Worker for offline operation
- IndexedDB for local storage
- Web Crypto API for cryptography

### Android (Capacitor)

- Native BLE implementation
- Hardware keystore integration
- Camera API for face capture
- Secure storage for sensitive data

### iOS Limitations

- Tuvali iOS limitations noted
- Alternative implementation strategies
- Cross-platform compatibility considerations

## Testing Strategy

### Unit Tests

- BLE service functionality
- Face matching algorithms
- Trust management operations
- Cryptographic operations

### Integration Tests

- End-to-end BLE verification
- Trust bundle loading and validation
- Face matching pipeline
- Error handling scenarios

### Security Tests

- BLE security validation
- Cryptographic implementation testing
- Privacy compliance verification
- Penetration testing

## Deployment Considerations

### Trust Bundle Distribution

- Secure distribution channels
- Integrity verification
- Update mechanisms
- Rollback procedures

### Model Deployment

- Face matching model distribution
- Version management
- Performance optimization
- Compatibility testing

### Configuration Management

- Environment-specific settings
- Feature flags
- Debugging capabilities
- Monitoring and logging

## Future Enhancements

### Advanced Features

- Multi-VC batch verification
- Advanced revocation mechanisms
- Enhanced face matching models
- Cross-platform improvements

### Performance Optimizations

- Parallel verification processes
- Caching strategies
- Memory optimization
- Battery life improvements

### Security Enhancements

- Hardware security module integration
- Advanced threat detection
- Privacy-preserving techniques
- Zero-knowledge proofs

## Compliance and Standards

### Standards Compliance

- W3C VC Data Model 1.1/2.0
- OpenID4VP offline flows
- MOSIP Claim 169 specification
- Bluetooth LE security standards

### Regulatory Compliance

- Data protection regulations
- Privacy requirements
- Security standards
- Audit requirements

## Conclusion

This specification provides a comprehensive framework for implementing offline BLE VC verification that aligns with MOSIP's existing capabilities while extending functionality for fully offline field operations. The implementation prioritizes security, privacy, and performance while maintaining compatibility with existing MOSIP infrastructure.
