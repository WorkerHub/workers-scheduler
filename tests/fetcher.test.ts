import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatchWithRetry } from '../src/dispatcher/fetcher'

describe('dispatchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('calls fetch once on success', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 200 }))
    await dispatchWithRetry('https://worker.example.com', 'secret', '0 * * * *')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries exactly 3 times then stops', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network error'))
    await dispatchWithRetry('https://worker.example.com', 'secret', '0 * * * *')
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('succeeds on second attempt after first failure', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(new Response('OK', { status: 200 }))
    await dispatchWithRetry('https://worker.example.com', 'secret', '0 * * * *')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('POSTs to /cron/trigger with correct headers and body', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('OK', { status: 200 }))
    await dispatchWithRetry('https://worker.example.com', 'my-secret', '0 8 * * *')
    expect(fetch).toHaveBeenCalledWith(
      'https://worker.example.com/cron/trigger',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Cron-Secret': 'my-secret',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ schedule: '0 8 * * *' }),
      })
    )
  })

  it('does not throw after exhausting all retries', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('always fails'))
    await expect(
      dispatchWithRetry('https://worker.example.com', 'secret', '0 * * * *')
    ).resolves.not.toThrow()
  })
})
