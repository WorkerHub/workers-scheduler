import type { DispatcherEnv, RegisterPayload } from '../types'
import { matchesCron } from './scheduler'
import { readTasks, upsertWorker } from './registry'
import { dispatchWithRetry } from './fetcher'

export default {
  /**
   * Fires every minute. Reads all registered workers from KV,
   * matches their schedules against the current time, and
   * dispatches concurrently to matching workers.
   */
  async scheduled(
    event: ScheduledEvent,
    env: DispatcherEnv,
    ctx: ExecutionContext
  ): Promise<void> {
    let tasks
    try {
      tasks = await readTasks(env.CRON_REGISTRY)
    } catch (err) {
      console.error('[dispatcher] Failed to read KV registry:', err)
      return
    }

    const now = new Date(event.scheduledTime)
    const dispatches: Promise<void>[] = []

    for (const worker of tasks) {
      for (const schedule of worker.schedules) {
        if (matchesCron(schedule, now)) {
          dispatches.push(
            dispatchWithRetry(worker.workerUrl, env.CRON_SECRET, schedule)
          )
        }
      }
    }

    ctx.waitUntil(Promise.allSettled(dispatches))
  },

  /**
   * Handles POST /register — downstream workers call this to register
   * or update their cron schedules. Verifies X-Cron-Secret header.
   */
  async fetch(request: Request, env: DispatcherEnv): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/register' && request.method === 'POST') {
      const secret = request.headers.get('X-Cron-Secret')
      if (secret !== env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 })
      }

      let payload: RegisterPayload
      try {
        payload = (await request.json()) as RegisterPayload
      } catch {
        return new Response('Invalid JSON', { status: 400 })
      }

      if (!payload.workerUrl || !Array.isArray(payload.schedules)) {
        return new Response('Missing workerUrl or schedules', { status: 400 })
      }

      try {
        await upsertWorker(env.CRON_REGISTRY, payload)
      } catch (err) {
        console.error('[dispatcher] Failed to upsert worker:', err)
        return new Response('Internal Server Error', { status: 500 })
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  },
}
