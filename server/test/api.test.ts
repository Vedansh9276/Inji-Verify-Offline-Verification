import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app, start } from '../src/index'

let server: any

beforeAll(() => {
  server = start(0)
})

afterAll(() => {
  server?.close()
})

describe('API', () => {
  it('health returns ok', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('rejects non-array payload', async () => {
    const res = await request(app).post('/api/logs').send({})
    expect(res.status).toBe(400)
  })

  it('accepts valid logs and lists them', async () => {
    const now = Date.now()
    const payload = [
      { vcHash: 'abc', status: 'success', timestamp: now },
      { vcHash: 'def', status: 'failure', timestamp: now + 1, details: { reason: 'x' } },
    ]
    const post = await request(app).post('/api/logs').send(payload)
    expect(post.status).toBe(200)
    expect(post.body.stored).toBe(2)

    const list = await request(app).get('/api/logs').query({ limit: 10 })
    expect(list.status).toBe(200)
    expect(Array.isArray(list.body)).toBe(true)
    expect(list.body.length).toBeGreaterThanOrEqual(2)
  })

  it('filters by query', async () => {
    const res = await request(app).get('/api/logs').query({ q: 'success' })
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
