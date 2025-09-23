import { useEffect, useRef, useState } from 'react'
import './App.css'
import { scanOnce, resetScanner } from './lib/scanner'
import { verifyVCOffline } from './lib/verify'
import { addLog, allLogs } from './lib/db'
import { syncLogs } from './lib/sync'

const DEFAULT_ENDPOINT = import.meta.env.VITE_SYNC_ENDPOINT || 'http://localhost:4000'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [scanning, setScanning] = useState(false)
  const [lastResult, setLastResult] = useState<null | { status: 'success' | 'failure'; message: string }>(null)
  const [online, setOnline] = useState(navigator.onLine)
  const [logs, setLogs] = useState<any[]>([])
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_ENDPOINT)
  const [busy, setBusy] = useState(false)

  const refreshLogs = async () => setLogs(await allLogs())

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    refreshLogs()
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
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
    try {
      setBusy(true)
      const res = await syncLogs(endpoint)
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
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs-${new Date().toISOString()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>INJI Offline Verifier</h1>
      <p>Status: {online ? 'Online' : 'Offline'}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {!scanning ? (
          <button onClick={startScan} disabled={busy}>Start Scan</button>
        ) : (
          <button onClick={stopScan}>Stop Scan</button>
        )}
        <button onClick={onSync} disabled={busy}>Sync Now</button>
        <button onClick={onExport} disabled={busy}>Export Logs</button>
        <input style={{ flex: 1, minWidth: 240 }} value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="Sync endpoint" />
      </div>

      <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 8, marginBottom: 16 }}>
        <h3>Camera</h3>
        <video ref={videoRef} playsInline style={{ width: '100%', borderRadius: 8 }} />
      </div>

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
        <h3>Logs</h3>
        <div style={{ maxHeight: 240, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Time</th>
                <th style={{ textAlign: 'left' }}>Hash</th>
                <th style={{ textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.timestamp).toLocaleString()}</td>
                  <td>{l.vcHash}</td>
                  <td>{l.status}</td>
                </tr>
              ))}
              {!logs.length && (
                <tr><td colSpan={3}>No logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default App
