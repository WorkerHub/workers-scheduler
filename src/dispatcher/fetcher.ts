const MAX_ATTEMPTS = 3

/**
 * POST to a downstream worker's /cron/trigger endpoint.
 * Retries up to 3 times on any failure.
 * Never throws — failures are logged and the next cron cycle retries naturally.
 */
export async function dispatchWithRetry(
  workerUrl: string,
  secret: string,
  schedule: string
): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${workerUrl}/cron/trigger`, {
        method: 'POST',
        headers: {
          'X-Cron-Secret': secret,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ schedule }),
      })
      if (res.ok) return
      console.error(
        `[dispatcher] ${workerUrl} schedule="${schedule}" attempt=${attempt} status=${res.status}`
      )
    } catch (err) {
      console.error(
        `[dispatcher] ${workerUrl} schedule="${schedule}" attempt=${attempt} error=${err}`
      )
    }
  }
  console.error(
    `[dispatcher] Giving up on ${workerUrl} schedule="${schedule}" after ${MAX_ATTEMPTS} attempts`
  )
}
