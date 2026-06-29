import { describe, expect, it } from 'vitest'
import { evaluateShove, forceToAccelerate, shoveAccel } from '../lib/shoveGame'

describe('forceToAccelerate', () => {
  it('computes F = m·a', () => {
    expect(forceToAccelerate(8000, 1)).toBe(8000)
    expect(forceToAccelerate(6000, 0.5)).toBe(3000)
    expect(forceToAccelerate(12000, 1.5)).toBe(18000)
  })
})

describe('shoveAccel', () => {
  it('computes a = F/m (inverse of forceToAccelerate)', () => {
    expect(shoveAccel(8000, 8000)).toBe(1)
    expect(shoveAccel(3000, 6000)).toBe(0.5)
    expect(shoveAccel(forceToAccelerate(10000, 1.2), 10000)).toBeCloseTo(1.2, 9)
  })
})

describe('evaluateShove', () => {
  it('grades the exact F = m·a force as a hit', () => {
    const r = evaluateShove(8000, 8000, 1, 300)
    expect(r.value).toBe(8000)
    expect(r.status).toBe('hit')
  })

  it('classifies too-weak pushes as short and too-strong as far', () => {
    expect(evaluateShove(3000, 8000, 1, 300).status).toBe('short')
    expect(evaluateShove(9000, 8000, 1, 300).status).toBe('far')
  })

  it('accepts anything inside the tolerance band (bounds inclusive)', () => {
    // target = 6000 * 1 = 6000, tolerance 300 -> [5700, 6300]
    expect(evaluateShove(5700, 6000, 1, 300).status).toBe('hit')
    expect(evaluateShove(6300, 6000, 1, 300).status).toBe('hit')
    expect(evaluateShove(5699, 6000, 1, 300).status).toBe('short')
    expect(evaluateShove(6301, 6000, 1, 300).status).toBe('far')
  })
})
