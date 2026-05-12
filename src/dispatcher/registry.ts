import type { RegisteredWorker, RegisterPayload } from '../types'

const KV_KEY = 'tasks'

export async function readTasks(kv: KVNamespace): Promise<RegisteredWorker[]> {
  const raw = await kv.get(KV_KEY)
  if (!raw) return []
  return JSON.parse(raw) as RegisteredWorker[]
}

export async function upsertWorker(kv: KVNamespace, payload: RegisterPayload): Promise<void> {
  const tasks = await readTasks(kv)
  const id = new URL(payload.workerUrl).hostname
  const entry: RegisteredWorker = {
    id,
    workerUrl: payload.workerUrl,
    schedules: payload.schedules,
    registeredAt: Date.now(),
  }
  const updated = [...tasks.filter((t) => t.id !== id), entry]
  await kv.put(KV_KEY, JSON.stringify(updated))
}
