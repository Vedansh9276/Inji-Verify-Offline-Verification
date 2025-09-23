import { syncLogs } from './sync'
import { getUnsyncedLogs } from './db'
import { getSettings, isWifiConnection } from './settings'

let syncTimer: NodeJS.Timeout | null = null
let isOnline = navigator.onLine

export function startBackgroundSync() {
  if (syncTimer) return
  
  const runSync = async () => {
    if (!isOnline) return
    
    const settings = await getSettings()
    if (!settings.autoSync) return
    
    if (settings.wifiOnlySync && !isWifiConnection()) return
    
    const unsynced = await getUnsyncedLogs()
    if (unsynced.length === 0) return
    
    try {
      await syncLogs(settings.syncEndpoint)
      console.log(`Background sync: uploaded ${unsynced.length} logs`)
    } catch (error) {
      console.warn('Background sync failed:', error)
    }
  }
  
  // Initial sync
  runSync()
  
  // Periodic sync
  syncTimer = setInterval(runSync, 5 * 60 * 1000) // Default 5 minutes
}

export function stopBackgroundSync() {
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
}

export function updateConnectivityStatus(online: boolean) {
  isOnline = online
  if (online) {
    startBackgroundSync()
  } else {
    stopBackgroundSync()
  }
}
