import type { RegisterPayload } from '../types'

/**
 * POST registration to the dispatcher.
 * Failures are silently swallowed — the CI/CD register command is the reliable fallback.
 */
export async function registerSelf(
  dispatcherUrl: string,
  secret: string,
  workerUrl: string,
  schedules: string[]
): Promise<void> {
  try {
    const payload: RegisterPayload = { workerUrl, schedules }
    await fetch(`${dispatcherUrl}/register`, {
      method: 'POST',
      headers: {
        'X-Cron-Secret': secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    console.error('[workers-scheduler] Self-registration failed, will retry on next cold start')
  }
}
