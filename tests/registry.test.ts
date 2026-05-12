import { describe, it, expect, vi } from 'vitest'
import { readTasks, upsertWorker } from '../src/dispatcher/registry'
import type { RegisteredWorker } from '../src/types'

const makeKV = (stored: RegisteredWorker[] = []): KVNamespace =>
  ({
    get: vi.fn().mockResolvedValue(stored.length ? JSON.stringify(stored) : null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  }) as unknown as KVNamespace

describe('readTasks', () => {
  it('returns empty array when KV is empty', async () => {
    expect(await readTasks(makeKV())).toEqual([])
  })

  it('parses stored tasks from KV', async () => {
    const tasks: RegisteredWorker[] = [
      {
        id: 'worker.example.com',
        workerUrl: 'https://worker.example.com',
        schedules: ['0 * * * *'],
        registeredAt: 1000,
      },
    ]
    expect(await readTasks(makeKV(tasks))).toEqual(tasks)
  })
})

describe('upsertWorker', () => {
  it('adds a new worker when registry is empty', async () => {
    const kv = makeKV()
    await upsertWorker(kv, {
      workerUrl: 'https://worker.example.com',
      schedules: ['0 * * * *'],
    })
    const saved = JSON.parse(
      vi.mocked(kv.put).mock.calls[0][1] as string
    ) as RegisteredWorker[]
    expect(saved).toHaveLength(1)
    expect(saved[0].workerUrl).toBe('https://worker.example.com')
    expect(saved[0].id).toBe('worker.example.com')
  })

  it('replaces existing worker entry matched by hostname id', async () => {
    const existing: RegisteredWorker[] = [
      {
        id: 'worker.example.com',
        workerUrl: 'https://worker.example.com',
        schedules: ['0 * * * *'],
        registeredAt: 1000,
      },
    ]
    const kv = makeKV(existing)
    await upsertWorker(kv, {
      workerUrl: 'https://worker.example.com',
      schedules: ['0 8 * * *'],
    })
    const saved = JSON.parse(
      vi.mocked(kv.put).mock.calls[0][1] as string
    ) as RegisteredWorker[]
    expect(saved).toHaveLength(1)
    expect(saved[0].schedules).toEqual(['0 8 * * *'])
  })
})
