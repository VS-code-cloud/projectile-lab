import { describe, expect, it } from 'vitest'
import { wakeIntensity, wakeLength, wakeOpacity } from '../highseas/wakeField'

describe('wakeIntensity', () => {
  it('is 0 at rest and 1 at top speed', () => {
    expect(wakeIntensity(0, 0.0035)).toBe(0)
    expect(wakeIntensity(0.0035, 0.0035)).toBe(1)
    expect(wakeIntensity(0.00175, 0.0035)).toBeCloseTo(0.5, 6)
  })

  it('uses speed magnitude (reversing still churns foam) and clamps', () => {
    expect(wakeIntensity(-0.0035, 0.0035)).toBe(1)
    expect(wakeIntensity(0.01, 0.0035)).toBe(1)
  })

  it('is safe when maxSpeed is zero', () => {
    expect(wakeIntensity(0.5, 0)).toBe(0)
  })
})

describe('wakeLength', () => {
  it('interpolates between min and max by intensity', () => {
    expect(wakeLength(0, 4, 40)).toBe(4)
    expect(wakeLength(1, 4, 40)).toBe(40)
    expect(wakeLength(0.5, 4, 40)).toBe(22)
  })
})

describe('wakeOpacity', () => {
  it('is 0 at rest and grows nonlinearly toward the cap', () => {
    expect(wakeOpacity(0)).toBe(0)
    expect(wakeOpacity(1)).toBeCloseTo(0.85, 6)
    // Smoothstep keeps low speeds calmer than a linear ramp would (below the
    // midpoint; at 0.5 smoothstep equals linear).
    expect(wakeOpacity(0.25)).toBeLessThan(0.25 * 0.85)
  })
})
