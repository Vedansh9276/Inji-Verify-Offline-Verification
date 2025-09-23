import { useEffect, useRef, useState } from 'react'
import './App.css'
import { scanOnce, resetScanner } from './lib/scanner'
import { verifyVCOffline } from './lib/verify'
import { addLog, allLogs } from './lib/db'
import { syncLogs } from './lib/sync'
import { getSettings, saveSettings, type AppSettings } from './lib/settings'
import { stopBackgroundSync, updateConnectivityStatus } from './lib/background-sync'
import { exportToCSV, exportToJSON } from './lib/export'
import BLEVerification from './components/BLEVerification'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<null | { status: 'success' | 'failure'; message: string }>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [logs, setLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [busy, setBusy] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failure'>('all')
  const [verificationMode, setVerificationMode] = useState<'qr' | 'ble'>('qr')
  const [deviceRole, setDeviceRole] = useState<'wallet' | 'verifier'>('verifier')

  const refreshLogs = async () => setLogs(await allLogs())

  useEffect(() => {
    const loadSettings = async () => {
      const s = await getSettings()
      setSettings(s)
    }
    loadSettings()

    const onOnline = () => {
      setOnline(true)
      updateConnectivityStatus(true)
    }
    const onOffline = () => {
      setOnline(false)
      updateConnectivityStatus(false)
    }
    
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    refreshLogs()
    
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      stopBackgroundSync()
    }
  }, [])

  const startScan = async () => {
    try {
      setScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      // Decode one QR, then stop
      if (videoRef.current) {
        const text = await scanOnce(videoRef.current)
        if (text) {
          const outcome = await verifyVCOffline(text)
          setLastResult({ status: outcome.status, message: outcome.message })
          await addLog({ vcHash: outcome.hash, status: outcome.status, details: outcome.details, timestamp: Date.now() })
          await refreshLogs()
        }
      }
    } catch (e: any) {
      setLastResult({ status: 'failure', message: e?.message ?? 'Camera error' })
    } finally {
      stopScan()
    }
  }

  const stopScan = () => {
    const video = videoRef.current
    if (video && video.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      video.srcObject = null
    }
    resetScanner()
    setScanning(false)
  }

  const onSync = async () => {
    if (!settings) return
    try {
      setBusy(true)
      const res = await syncLogs(settings.syncEndpoint)
      setLastResult({ status: 'success', message: `Synced ${res.uploaded} logs` })
      await refreshLogs()
    } catch (e: any) {
      setLastResult({ status: 'failure', message: e?.message ?? 'Sync failed' })
    } finally {
      setBusy(false)
    }
  }

  const onExport = async () => {
    const data = await allLogs()
    const timestamp = new Date().toISOString().split('T')[0]
    exportToJSON(data, `logs-${timestamp}.json`)
  }

  const onExportCSV = async () => {
    const data = await allLogs()
    const timestamp = new Date().toISOString().split('T')[0]
    exportToCSV(data, `logs-${timestamp}.csv`)
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.vcHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.status.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleBLEVerificationComplete = async (result: any) => {
    const outcome = {
      status: result.success ? 'success' as const : 'failure' as const,
      message: result.success ? 'BLE verification successful' : result.errors.join(', '),
      hash: `ble-${Date.now()}`,
      details: result
    }
    
    setLastResult(outcome)
    await addLog({ 
      vcHash: outcome.hash, 
      status: outcome.status, 
      details: outcome.details, 
      timestamp: Date.now() 
    })
    await refreshLogs()
  }

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    if (!settings) return
    const updated = { ...settings, [key]: value }
    await saveSettings({ [key]: value })
    setSettings(updated)
  }

  if (!settings) return <div>Loading...</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>INJI Offline Verifier</h1>
      <p>Status: {online ? 'Online' : 'Offline'} | Auto-sync: {settings.autoSync ? 'ON' : 'OFF'}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <label>Mode:</label>
          <select value={verificationMode} onChange={e => setVerificationMode(e.target.value as any)}>
            <option value="qr">QR Code</option>
            <option value="ble">BLE Verification</option>
          </select>
        </div>
        
        {verificationMode === 'qr' && (
          <>
            {!scanning ? (
              <button onClick={startScan} disabled={busy}>Start Scan</button>
            ) : (
              <button onClick={stopScan}>Stop Scan</button>
            )}
          </>
        )}
        
        {verificationMode === 'ble' && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <label>Role:</label>
            <select value={deviceRole} onChange={e => setDeviceRole(e.target.value as any)}>
              <option value="verifier">Verifier</option>
              <option value="wallet">Wallet</option>
            </select>
          </div>
        )}
        
        <button onClick={onSync} disabled={busy}>Sync Now</button>
        <button onClick={onExport} disabled={busy}>Export JSON</button>
        <button onClick={onExportCSV} disabled={busy}>Export CSV</button>
        <button onClick={() => setShowSettings(!showSettings)}>Settings</button>
      </div>

      {showSettings && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, marginBottom: 16 }}>
          <h3>Settings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label>
              Sync Endpoint:
              <input 
                style={{ width: '100%', marginLeft: 8 }} 
                value={settings.syncEndpoint} 
                onChange={e => updateSetting('syncEndpoint', e.target.value)} 
              />
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={settings.wifiOnlySync} 
                onChange={e => updateSetting('wifiOnlySync', e.target.checked)} 
              />
              WiFi-only sync
            </label>
            <label>
              <input 
                type="checkbox" 
                checked={settings.autoSync} 
                onChange={e => updateSetting('autoSync', e.target.checked)} 
              />
              Auto-sync when online
            </label>
            <label>
              Sync Interval (minutes):
              <input 
                type="number" 
                min="1" 
                max="60" 
                value={settings.syncInterval} 
                onChange={e => updateSetting('syncInterval', parseInt(e.target.value))} 
              />
            </label>
          </div>
        </div>
      )}

      {verificationMode === 'qr' && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, marginBottom: 16 }}>
          <h3>Camera</h3>
          <video ref={videoRef} playsInline style={{ width: '100%', borderRadius: 8 }} />
        </div>
      )}

      {verificationMode === 'ble' && (
        <BLEVerification 
          deviceRole={deviceRole}
          onVerificationComplete={handleBLEVerificationComplete}
        />
      )}

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, marginBottom: 16 }}>
        <h3>Last Result</h3>
        {lastResult ? (
          <div>
            <strong>{lastResult.status.toUpperCase()}</strong>
            <div>{lastResult.message}</div>
          </div>
        ) : (
          <div>No scans yet.</div>
        )}
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8 }}>
        <h3>Logs ({filteredLogs.length}/{logs.length})</h3>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <input 
            style={{ flex: 1, minWidth: 200 }} 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="success">Success Only</option>
            <option value="failure">Failure Only</option>
          </select>
        </div>
        
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Time</th>
                <th style={{ textAlign: 'left' }}>Hash</th>
                <th style={{ textAlign: 'left' }}>Status</th>
                <th style={{ textAlign: 'left' }}>Synced</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.timestamp).toLocaleString()}</td>
                  <td>{l.vcHash}</td>
                  <td>{l.status}</td>
                  <td>{l.synced ? '✓' : '✗'}</td>
                </tr>
              ))}
              {!filteredLogs.length && (
                <tr><td colSpan={4}>No logs match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default App
