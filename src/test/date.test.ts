import { describe, it, expect } from 'vitest'
import { localDayDifference } from '../lib/date'

describe('localDayDifference', () => {
  it('returns 0 for two timestamps on the same calendar day', () => {
    const morning = new Date(2026, 5, 24, 8).getTime()
    const evening = new Date(2026, 5, 24, 23).getTime()
    expect(localDayDifference(morning, evening)).toBe(0)
  })

  it('returns 1 for consecutive calendar days even a few hours apart', () => {
    const lateNight = new Date(2026, 5, 24, 23).getTime()
    const nextMorning = new Date(2026, 5, 25, 1).getTime()
    expect(localDayDifference(lateNight, nextMorning)).toBe(1)
  })

  it('counts several whole calendar days', () => {
    const start = new Date(2026, 0, 1, 12).getTime()
    const later = new Date(2026, 0, 6, 9).getTime()
    expect(localDayDifference(start, later)).toBe(5)
  })

  it('spans month boundaries correctly', () => {
    const endOfJan = new Date(2026, 0, 31, 22).getTime()
    const startOfFeb = new Date(2026, 1, 1, 6).getTime()
    expect(localDayDifference(endOfJan, startOfFeb)).toBe(1)
  })
})
