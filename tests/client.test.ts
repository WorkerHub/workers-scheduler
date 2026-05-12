import { describe, it, expect, vi } from 'vitest'
import { defineCronHandlers } from '../src/client/index'

const makeCtx = (): ExecutionContext => ({
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
})

const makeEnv = (overrides: Record<string, string> = {}) => ({
  CRON_SECRET: 'test-secret',
  CRON_DISPATCHER_URL: 'https://dispatcher.example.com',
  CRON_WORKER_URL: 'https://my-worker.example.com',
  ...overrides,
})

describe('defineCronHandlers', () => {
  it('returns manifest with registered schedules', async () => {
    const handlers = defineCronHandlers({
      '0 * * * *': async () => {},
      '0 8 * * *': async () => {},
    })
    const req = new Request('https://worker.dev/cron/manifest')
    const res = await handlers.handleRequest(req, makeEnv(), makeCtx())
    expect(res.status).toBe(200)
    const body = (await res.json()) as { schedules: string[] }
    expect(body.schedules).toEqual(['0 * * * *', '0 8 * * *'])
  })

  it('returns 401 on /cron/trigger with wrong secret', async () => {
    const handlers = defineCronHandlers({ '0 * * * *': async () => {} })
    const req = new Request('https://worker.dev/cron/trigger', {
      method: 'POST',
      headers: { 'X-Cron-Secret': 'wrong', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: '0 * * * *' }),
    })
    const res = await handlers.handleRequest(req, makeEnv(), makeCtx())
    expect(res.status).toBe(401)
  })

  it('returns 404 on /cron/trigger with unknown schedule', async () => {
    const handlers = defineCronHandlers({ '0 * * * *': async () => {} })
    const req = new Request('https://worker.dev/cron/trigger', {
      method: 'POST',
      headers: { 'X-Cron-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: '0 6 * * *' }),
    })
    const res = await handlers.handleRequest(req, makeEnv(), makeCtx())
    expect(res.status).toBe(404)
  })

  it('invokes handler via waitUntil on valid trigger', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const handlers = defineCronHandlers({ '0 * * * *': handler })
    const ctx = makeCtx()
    const req = new Request('https://worker.dev/cron/trigger', {
      method: 'POST',
      headers: { 'X-Cron-Secret': 'test-secret', 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule: '0 * * * *' }),
    })
    const res = await handlers.handleRequest(req, makeEnv(), ctx)
    expect(res.status).toBe(200)
    expect(ctx.waitUntil).toHaveBeenCalled()
  })

  it('returns 404 for unknown paths', async () => {
    const handlers = defineCronHandlers({ '0 * * * *': async () => {} })
    const req = new Request('https://worker.dev/other')
    const res = await handlers.handleRequest(req, makeEnv(), makeCtx())
    expect(res.status).toBe(404)
  })
})
