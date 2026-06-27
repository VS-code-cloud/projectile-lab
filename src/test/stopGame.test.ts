import { describe, expect, it } from 'vitest'
import { coastingDistance, evaluateStop } from '../lib/stopGame'

describe('coastingDistance', () => {
  it('computes v0²/(2a)', () => {
    expect(coastingDistance(20, 2)).toBe(100)
  })
})

describe('evaluateStop (v0=20, a=2, tolerance=5)', () => {
  const v0 = 20
  const a = 2
  const tol = 5

  it('classifies hits, short, and far at whole meters', () => {
    expect(evaluateStop(100, v0, a, tol).status).toBe('hit')
    expect(evaluateStop(90, v0, a, tol).status).toBe('short')
    expect(evaluateStop(110, v0, a, tol).status).toBe('far')
  })

  it('treats band bounds as inclusive hits', () => {
    expect(evaluateStop(95, v0, a, tol).status).toBe('hit')
    expect(evaluateStop(105, v0, a, tol).status).toBe('hit')
    expect(evaluateStop(94.9, v0, a, tol).status).toBe('short')
    expect(evaluateStop(105.1, v0, a, tol).status).toBe('far')
  })
})
