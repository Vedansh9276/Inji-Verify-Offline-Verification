import { getDB } from './db'

export interface AppSettings {
  syncEndpoint: string
  wifiOnlySync: boolean
  autoSync: boolean
  syncInterval: number // minutes
}

const DEFAULT_SETTINGS: AppSettings = {
  syncEndpoint: import.meta.env.VITE_SYNC_ENDPOINT || 'http://localhost:4000',
  wifiOnlySync: true,
  autoSync: true,
  syncInterval: 5,
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const stored = await db.get('settings', 'app')
  return { ...DEFAULT_SETTINGS, ...(stored || {}) }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const db = await getDB()
  const current = await getSettings()
  const updated = { ...current, ...settings }
  await db.put('settings', updated, 'app')
}

export function isWifiConnection(): boolean {
  // Simplified check - in real app, use Network Information API
  return (navigator as any).connection?.type === 'wifi' || true
}
