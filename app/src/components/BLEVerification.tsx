import React, { useState, useEffect } from 'react'
import { 
  createBLEVerificationService, 
  type BLEVerificationConfig, 
  type BLEVerificationResult
} from '../lib/ble-verification'
import { createFaceMatchService, DEFAULT_FACE_MATCH_CONFIG } from '../lib/face-match'
import { createTrustManagementService } from '../lib/trust-management'

interface BLEVerificationProps {
  deviceRole: 'wallet' | 'verifier'
  onVerificationComplete: (result: BLEVerificationResult) => void
}

export const BLEVerification: React.FC<BLEVerificationProps> = ({ 
  deviceRole, 
  onVerificationComplete 
}) => {
  const [isActive, setIsActive] = useState(false)
  const [status, setStatus] = useState<string>('Ready')
  const [verificationResult, setVerificationResult] = useState<BLEVerificationResult | null>(null)
  const [faceMatchEnabled, setFaceMatchEnabled] = useState(true)
  const [trustBundleLoaded, setTrustBundleLoaded] = useState(false)

  const config: BLEVerificationConfig = {
    deviceRole,
    timeoutMs: 30000,
    maxRetries: 3
  }

  const bleService = createBLEVerificationService(config)
  const faceMatchService = createFaceMatchService(DEFAULT_FACE_MATCH_CONFIG)
  const trustService = createTrustManagementService()

  useEffect(() => {
    initializeServices()
  }, [])

  const initializeServices = async () => {
    try {
      setStatus('Initializing services...')
      
      // Load trust bundle
      await trustService.loadTrustBundle('/trust/trust-bundle.json')
      setTrustBundleLoaded(true)
      
      // Initialize face matching service
      await faceMatchService.initialize()
      
      setStatus('Services initialized successfully')
    } catch (error: any) {
      setStatus(`Initialization failed: ${error.message}`)
    }
  }

  const handleWalletMode = async () => {
    if (deviceRole !== 'wallet') return

    setIsActive(true)
    setStatus('Advertising VC for sharing...')

    try {
      // In real implementation, get VC from wallet storage
      const mockCredential = {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'MOSIPCredential'],
        issuer: { id: 'did:mosip:issuer:gov' },
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: 'did:mosip:holder:123',
          name: 'John Doe',
          faceImage: 'base64-encoded-face-image'
        }
      }

      const mockProof = {
        type: 'Ed25519Signature2020',
        verificationMethod: 'did:mosip:issuer:gov#key-1',
        created: new Date().toISOString(),
        proofValue: 'mock-signature'
      }

      await bleService.startAdvertising(mockCredential, mockProof)
      setStatus('VC advertised successfully. Waiting for verifier...')
    } catch (error: any) {
      setStatus(`Advertising failed: ${error.message}`)
      setIsActive(false)
    }
  }

  const handleVerifierMode = async () => {
    if (deviceRole !== 'verifier') return

    setIsActive(true)
    setStatus('Scanning for VCs...')

    try {
      const foundCredentials = await bleService.scanForCredentials()
      
      if (foundCredentials.length === 0) {
        setStatus('No VCs found')
        setIsActive(false)
        return
      }

      setStatus(`Found ${foundCredentials.length} VC(s). Verifying...`)
      
      // Verify the first found credential
      const packet = foundCredentials[0]
      const result = await bleService.verifyCredentialOffline(packet)
      
      setVerificationResult(result)
      onVerificationComplete(result)
      
      if (result.success) {
        setStatus('VC verification successful!')
      } else {
        setStatus(`Verification failed: ${result.errors.join(', ')}`)
      }
      
      setIsActive(false)
    } catch (error: any) {
      setStatus(`Verification failed: ${error.message}`)
      setIsActive(false)
    }
  }

  const handleStop = () => {
    if (deviceRole === 'wallet') {
      bleService.stopAdvertising()
    } else {
      bleService.stopScanning()
    }
    setIsActive(false)
    setStatus('Stopped')
  }

  const handleFaceMatchToggle = () => {
    setFaceMatchEnabled(!faceMatchEnabled)
  }

  const renderWalletMode = () => (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Wallet Mode - Share VC</h3>
      <p>Share your Verifiable Credential with nearby verifiers via BLE.</p>
      
      <div style={{ marginBottom: '16px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={faceMatchEnabled} 
            onChange={handleFaceMatchToggle}
          />
          Enable face matching verification
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {!isActive ? (
          <button onClick={handleWalletMode} disabled={!trustBundleLoaded}>
            Start Advertising VC
          </button>
        ) : (
          <button onClick={handleStop}>Stop Advertising</button>
        )}
      </div>

      <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  )

  const renderVerifierMode = () => (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '16px' }}>
      <h3>Verifier Mode - Verify VC</h3>
      <p>Scan for and verify Verifiable Credentials from nearby wallets via BLE.</p>
      
      <div style={{ marginBottom: '16px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={faceMatchEnabled} 
            onChange={handleFaceMatchToggle}
          />
          Enable face matching verification
        </label>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {!isActive ? (
          <button onClick={handleVerifierMode} disabled={!trustBundleLoaded}>
            Start Scanning
          </button>
        ) : (
          <button onClick={handleStop}>Stop Scanning</button>
        )}
      </div>

      <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginBottom: '16px' }}>
        <strong>Status:</strong> {status}
      </div>

      {verificationResult && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: verificationResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${verificationResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '4px'
        }}>
          <h4>Verification Result</h4>
          <p><strong>Success:</strong> {verificationResult.success ? 'Yes' : 'No'}</p>
          
          <div style={{ marginTop: '8px' }}>
            <strong>Checks:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>Signature Valid: {verificationResult.verification.signatureValid ? '✓' : '✗'}</li>
              <li>Issuer Trusted: {verificationResult.verification.issuerTrusted ? '✓' : '✗'}</li>
              <li>Not Expired: {verificationResult.verification.notExpired ? '✓' : '✗'}</li>
              <li>Format Valid: {verificationResult.verification.formatValid ? '✓' : '✗'}</li>
              {verificationResult.verification.faceMatch && (
                <li>Face Match: {verificationResult.verification.faceMatch.match ? '✓' : '✗'} 
                  ({Math.round(verificationResult.verification.faceMatch.confidence * 100)}%)
                </li>
              )}
            </ul>
          </div>

          {verificationResult.errors.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Errors:</strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {verificationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div>
      {deviceRole === 'wallet' ? renderWalletMode() : renderVerifierMode()}
      
      <div style={{ padding: '8px', backgroundColor: '#e9ecef', borderRadius: '4px', fontSize: '12px' }}>
        <strong>Trust Bundle:</strong> {trustBundleLoaded ? 'Loaded' : 'Not loaded'} | 
        <strong> Face Match:</strong> {faceMatchService.isModelLoaded() ? 'Ready' : 'Not ready'}
      </div>
    </div>
  )
}

export default BLEVerification
