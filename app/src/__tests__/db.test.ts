import { describe, it, expect, beforeAll } from 'vitest'
import { getDB, addLog, getUnsyncedLogs, markLogsSynced, allLogs } from '../lib/db'

describe('IndexedDB logs', () => {
  beforeAll(async () => {
    // init DB in test env (fake-indexeddb via Vitest env)
    await getDB()
  })

  it('adds and fetches unsynced logs', async () => {
    const t = Date.now()
    await addLog({ vcHash: 'hash1', status: 'success', timestamp: t })
    const unsynced = await getUnsyncedLogs()
    expect(unsynced.length).toBeGreaterThan(0)
  })

  it('marks logs as synced', async () => {
    const logs = await allLogs()
    const ids = logs.map(l => l.id!).filter(Boolean)
    await markLogsSynced(ids)
    const unsynced = await getUnsyncedLogs()
    expect(unsynced.length).toBe(0)
  })
})
