import { describe, expect, it } from 'vitest'
import {
  centripetalAccel,
  centripetalForce,
  evaluateOrbit,
  period,
} from '../lib/maelstromGame'

describe('centripetalAccel', () => {
  it('computes v²/r', () => {
    expect(centripetalAccel(10, 5)).toBe(20)
  })
})

describe('evaluateOrbit', () => {
  const target = 20
  const tolerance = 2
  const r = 5

  it('hits when a = v²/r lands in the band', () => {
    expect(evaluateOrbit(10, r, target, tolerance).status).toBe('hit')
  })

  it('is short when rowing too slowly', () => {
    const result = evaluateOrbit(9, r, target, tolerance)
    expect(result.status).toBe('short')
    expect(result.value).toBeCloseTo(16.2, 1)
  })

  it('is far when rowing too fast', () => {
    const result = evaluateOrbit(11, r, target, tolerance)
    expect(result.status).toBe('far')
    expect(result.value).toBeCloseTo(24.2, 1)
  })
})

describe('period', () => {
  it('computes 2πr/v', () => {
    expect(period(5, 10)).toBeCloseTo(3.14, 2)
  })
})

describe('centripetalForce', () => {
  it('computes m·v²/r', () => {
    expect(centripetalForce(50, 10, 5)).toBe(1000)
  })
})
