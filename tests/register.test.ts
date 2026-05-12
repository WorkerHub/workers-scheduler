import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerSelf } from '../src/client/register'

describe('registerSelf', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('POSTs to /register with correct headers and payload', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 200 }))

    await registerSelf(
      'https://dispatcher.example.com',
      'my-secret',
      'https://my-worker.example.com',
      ['0 * * * *', '0 8 * * *']
    )

    expect(fetch).toHaveBeenCalledWith(
      'https://dispatcher.example.com/register',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Cron-Secret': 'my-secret',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          workerUrl: 'https://my-worker.example.com',
          schedules: ['0 * * * *', '0 8 * * *'],
        }),
      })
    )
  })

  it('does not throw if dispatcher returns non-200', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('Error', { status: 500 }))
    await expect(
      registerSelf('https://dispatcher.example.com', 'secret', 'https://worker.example.com', [])
    ).resolves.not.toThrow()
  })

  it('does not throw if fetch itself fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    await expect(
      registerSelf('https://dispatcher.example.com', 'secret', 'https://worker.example.com', [])
    ).resolves.not.toThrow()
  })
})
