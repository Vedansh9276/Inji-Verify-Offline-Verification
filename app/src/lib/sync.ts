import { getUnsyncedLogs, markLogsSynced } from './db'

export async function syncLogs(endpoint: string) {
  const logs = await getUnsyncedLogs(200)
  if (!logs.length) return { uploaded: 0 }
  const payload = logs.map(l => ({
    vcHash: l.vcHash,
    status: l.status,
    details: l.details ?? null,
    timestamp: l.timestamp,
    source: 'pwa' as const,
  }))
  const res = await fetch(`${endpoint.replace(/\/$/, '')}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Sync failed: ${res.status}`)
  const data = await res.json()
  const uploadedIds = logs.map(l => l.id!).filter(Boolean)
  await markLogsSynced(uploadedIds)
  return { uploaded: data.stored ?? uploadedIds.length }
}
