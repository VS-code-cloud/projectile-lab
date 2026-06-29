import { describe, expect, it } from 'vitest'
import {
  aimDelaySeconds,
  isInRange,
  maxRange,
  requiredAngleDeg,
} from '../highseas/combat'
import { shipStatsFor } from '../highseas/upgrades'
import { GRAVITY } from '../physics/kinematics'

describe('maxRange', () => {
  it('computes v² / g', () => {
    expect(maxRange(28)).toBe(784 / GRAVITY)
    expect(maxRange(28)).toBe(80)
  })
})

describe('isInRange', () => {
  it('returns true at and within max range', () => {
    expect(isInRange(80, 28)).toBe(true)
    expect(isInRange(40, 28)).toBe(true)
    expect(isInRange(0, 28)).toBe(true)
  })

  it('returns false beyond max range', () => {
    expect(isInRange(80.1, 28)).toBe(false)
    expect(isInRange(100, 28)).toBe(false)
  })
})

describe('requiredAngleDeg', () => {
  it('returns ~45° at max range', () => {
    const angle = requiredAngleDeg(80, 28)
    expect(angle).not.toBeNull()
    expect(angle!).toBeCloseTo(45, 0)
  })

  it('returns null beyond range', () => {
    expect(requiredAngleDeg(81, 28)).toBeNull()
    expect(requiredAngleDeg(200, 28)).toBeNull()
  })
})

describe('aimDelaySeconds', () => {
  it('maps 0 to 0.5', () => {
    expect(aimDelaySeconds(0)).toBe(0.5)
  })

  it('maps ~1 to ~2.0', () => {
    expect(aimDelaySeconds(1)).toBeCloseTo(2.0)
  })
})

describe('shipStatsFor', () => {
  it('derives cannon range from muzzle speed', () => {
    const stats = shipStatsFor(0)
    expect(stats.cannonMuzzleSpeed).toBeGreaterThan(0)
    expect(stats.maxFiringRange).toBe(maxRange(stats.cannonMuzzleSpeed))
  })

  it('fires at ~80 m/s for a ~650 m combat range at stage 0', () => {
    const stats = shipStatsFor(0)
    expect(stats.cannonMuzzleSpeed).toBe(80)
    // v²/g = 6400 / 9.8 ≈ 653 m.
    expect(stats.maxFiringRange).toBeGreaterThan(640)
    expect(stats.maxFiringRange).toBeLessThan(660)
  })

  it('improves ship capability by upgrade stage', () => {
    const start = shipStatsFor(0)
    const upgraded = shipStatsFor(3)
    expect(upgraded.capacity).toBeGreaterThan(start.capacity)
    expect(upgraded.force).toBeGreaterThan(start.force)
    expect(upgraded.maxFiringRange).toBeGreaterThan(start.maxFiringRange)
  })
})
