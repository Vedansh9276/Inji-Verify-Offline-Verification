import { describe, it, expect, vi } from 'vitest'
import { syncLogs } from '../lib/sync'
import * as db from '../lib/db'

describe('syncLogs', () => {
  it('handles empty queue', async () => {
    vi.spyOn(db, 'getUnsyncedLogs').mockResolvedValueOnce([] as any)
    const res = await syncLogs('http://example.com')
    expect(res.uploaded).toBe(0)
  })

  it('uploads and marks synced', async () => {
    const logs = [{ id: 1, vcHash: 'h', status: 'success', timestamp: Date.now(), synced: 0 }]
    vi.spyOn(db, 'getUnsyncedLogs').mockResolvedValueOnce(logs as any)
    vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({ ok: true, json: async () => ({ stored: 1 }) } as any)
    const mark = vi.spyOn(db, 'markLogsSynced').mockResolvedValueOnce()
    const res = await syncLogs('http://example.com')
    expect(res.uploaded).toBe(1)
    expect(mark).toHaveBeenCalledWith([1])
  })
})
