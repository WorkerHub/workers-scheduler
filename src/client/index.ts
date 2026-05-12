import type { CronHandlerConfig, CronHandlerInstance, CronManifest } from '../types'
import { registerSelf } from './register'

export function defineCronHandlers<Env extends Record<string, string>>(
  config: CronHandlerConfig<Env>
): CronHandlerInstance {
  const schedules = Object.keys(config)
  let selfRegistered = false

  return {
    async handleRequest(
      request: Request,
      env: Record<string, string>,
      ctx: ExecutionContext
    ): Promise<Response> {
      // Self-register in the background on first request — no latency impact
      if (
        !selfRegistered &&
        env.CRON_DISPATCHER_URL &&
        env.CRON_SECRET &&
        env.CRON_WORKER_URL
      ) {
        selfRegistered = true
        ctx.waitUntil(
          registerSelf(
            env.CRON_DISPATCHER_URL,
            env.CRON_SECRET,
            env.CRON_WORKER_URL,
            schedules
          )
        )
      }

      const url = new URL(request.url)

      // GET /cron/manifest — return declared schedules
      if (url.pathname === '/cron/manifest' && request.method === 'GET') {
        const body: CronManifest = { schedules }
        return new Response(JSON.stringify(body), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // POST /cron/trigger — validate secret, route to handler
      if (url.pathname === '/cron/trigger' && request.method === 'POST') {
        const secret = request.headers.get('X-Cron-Secret')
        if (secret !== env.CRON_SECRET) {
          return new Response('Unauthorized', { status: 401 })
        }

        const { schedule } = (await request.json()) as { schedule: string }
        const handler = config[schedule] as CronHandlerConfig<Env>[string] | undefined

        if (!handler) {
          return new Response('Schedule not found', { status: 404 })
        }

        ctx.waitUntil(handler(env as unknown as Env))
        return new Response('OK')
      }

      return new Response('Not Found', { status: 404 })
    },
  }
}
