import { describe, it, expect } from 'vitest'
import { matchesCron } from '../src/dispatcher/scheduler'

describe('matchesCron', () => {
  it('matches hourly schedule at the correct minute', () => {
    const date = new Date('2024-01-15T14:00:00.000Z')
    expect(matchesCron('0 * * * *', date)).toBe(true)
  })

  it('does not match hourly schedule at wrong minute', () => {
    const date = new Date('2024-01-15T14:05:00.000Z')
    expect(matchesCron('0 * * * *', date)).toBe(false)
  })

  it('matches daily schedule at correct hour and minute', () => {
    const date = new Date('2024-01-15T08:00:00.000Z')
    expect(matchesCron('0 8 * * *', date)).toBe(true)
  })

  it('does not match daily schedule at wrong hour', () => {
    const date = new Date('2024-01-15T09:00:00.000Z')
    expect(matchesCron('0 8 * * *', date)).toBe(false)
  })

  it('matches every-minute schedule at any time', () => {
    const date = new Date('2024-01-15T14:37:00.000Z')
    expect(matchesCron('* * * * *', date)).toBe(true)
  })

  it('rounds down to minute boundary — seconds are ignored', () => {
    // 14:00:45 should still match "0 * * * *"
    const date = new Date('2024-01-15T14:00:45.000Z')
    expect(matchesCron('0 * * * *', date)).toBe(true)
  })
})
