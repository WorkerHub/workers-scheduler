/** A worker registered with the dispatcher */
export interface RegisteredWorker {
  /** Derived from workerUrl hostname, used as upsert key */
  id: string
  workerUrl: string
  schedules: string[]
  registeredAt: number
}

/** Shape of GET /cron/manifest response */
export interface CronManifest {
  schedules: string[]
}

/** Body of POST /register */
export interface RegisterPayload {
  workerUrl: string
  schedules: string[]
}

/** Dispatcher Worker environment bindings */
export interface DispatcherEnv {
  CRON_REGISTRY: KVNamespace
  CRON_SECRET: string
}

/** Handler function declared by downstream workers */
export type CronHandlerFn<Env = unknown> = (env: Env) => Promise<void>

/** Map of cron schedule → handler, passed to defineCronHandlers() */
export interface CronHandlerConfig<Env = unknown> {
  [schedule: string]: CronHandlerFn<Env>
}

/** Returned by defineCronHandlers() */
export interface CronHandlerInstance {
  handleRequest(
    request: Request,
    env: Record<string, string>,
    ctx: ExecutionContext
  ): Promise<Response>
}
