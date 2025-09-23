import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface VerifyDB extends DBSchema {
  logs: {
    key: number
    value: {
      id?: number
      vcHash: string
      status: 'success' | 'failure'
      details?: unknown
      timestamp: number
      synced?: 0 | 1
    }
    indexes: { 'by-synced': number; 'by-timestamp': number }
  }
  settings: {
    key: string
    value: unknown
  }
}

let dbPromise: Promise<IDBPDatabase<VerifyDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VerifyDB>('inji-verify-db', 1, {
      upgrade(db) {
        const logs = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
        logs.createIndex('by-synced', 'synced')
        logs.createIndex('by-timestamp', 'timestamp')
        db.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

export async function addLog(entry: Omit<VerifyDB['logs']['value'], 'id'>) {
  const db = await getDB()
  await db.add('logs', { ...entry, synced: 0 })
}

export async function getUnsyncedLogs(limit = 100) {
  const db = await getDB()
  const tx = db.transaction('logs')
  const idx = tx.store.index('by-synced')
  const results: VerifyDB['logs']['value'][] = []
  let cursor = await idx.openCursor(0)
  while (cursor && results.length < limit) {
    results.push(cursor.value)
    cursor = await cursor.continue()
  }
  await tx.done
  return results
}

export async function markLogsSynced(ids: number[]) {
  const db = await getDB()
  const tx = db.transaction('logs', 'readwrite')
  for (const id of ids) {
    const row = await tx.store.get(id)
    if (row) await tx.store.put({ ...row, synced: 1 })
  }
  await tx.done
}

export async function allLogs() {
  const db = await getDB()
  return db.getAll('logs')
}
