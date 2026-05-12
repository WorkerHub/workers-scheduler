import { Cron } from 'croner'

/**
 * Returns true if the cron schedule fires during the minute containing `now`.
 * Seconds are ignored — resolution matches Cloudflare's own cron trigger granularity.
 */
export function matchesCron(schedule: string, now: Date): boolean {
  const minuteStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000)
  const oneMilliBefore = new Date(minuteStart.getTime() - 1)
  const nextRun = new Cron(schedule, { timezone: 'UTC' }).nextRun(oneMilliBefore)
  return nextRun !== null && nextRun.getTime() === minuteStart.getTime()
}
