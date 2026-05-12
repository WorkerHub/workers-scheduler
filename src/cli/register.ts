#!/usr/bin/env node
/// <reference types="node" />
/**
 * Usage:
 *   npx workers-scheduler register \
 *     --worker-url https://my-worker.workers.dev \
 *     --dispatcher-url https://dispatcher.workers.dev \
 *     --secret <CRON_SECRET>
 */

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 ? args[idx + 1] : undefined
}

async function main() {
  const workerUrl = getArg('worker-url')
  const dispatcherUrl = getArg('dispatcher-url')
  const secret = getArg('secret')

  if (!workerUrl || !dispatcherUrl || !secret) {
    console.error(
      'Usage: npx workers-scheduler register --worker-url <url> --dispatcher-url <url> --secret <secret>'
    )
    process.exit(1)
  }

  // Step 1: fetch manifest from downstream worker
  console.log(`Fetching manifest from ${workerUrl}/cron/manifest ...`)
  const manifestRes = await fetch(`${workerUrl}/cron/manifest`)
  if (!manifestRes.ok) {
    console.error(`Failed to fetch manifest: ${manifestRes.status} ${manifestRes.statusText}`)
    process.exit(1)
  }
  const { schedules } = (await manifestRes.json()) as { schedules: string[] }
  console.log(`Found schedules: ${schedules.join(', ')}`)

  // Step 2: register with dispatcher
  console.log(`Registering with dispatcher ...`)
  const registerRes = await fetch(`${dispatcherUrl}/register`, {
    method: 'POST',
    headers: {
      'X-Cron-Secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ workerUrl, schedules }),
  })

  if (!registerRes.ok) {
    console.error(`Registration failed: ${registerRes.status} ${registerRes.statusText}`)
    process.exit(1)
  }

  console.log(`Registered ${workerUrl} with ${schedules.length} schedule(s)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
