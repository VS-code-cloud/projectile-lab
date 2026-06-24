import { describe, it, expect } from 'vitest'
import { checkAnswer } from '../lib/checkAnswer'
import type { Step } from '../lessons/types'

/** Builds a minimal question step for tolerance testing. */
function makeStep(expected: number[], tolerance?: number[]): Step {
  return {
    uid: 'q1',
    stepType: 'question',
    displayText: 'test',
    interactiveComponent: 'NumericAnswer',
    expected,
    explanation: '',
    tolerance,
  }
}

describe('checkAnswer', () => {
  it('returns false when the number of values does not match', () => {
    expect(checkAnswer(makeStep([1, 2]), [1])).toBe(false)
    expect(checkAnswer(makeStep([1]), [1, 2])).toBe(false)
    expect(checkAnswer(makeStep([1]), [])).toBe(false)
  })

  describe('explicit tolerances', () => {
    it('passes when every value is within its explicit tolerance', () => {
      const step = makeStep([10, 20], [0.5, 2])
      expect(checkAnswer(step, [10.4, 21.9])).toBe(true)
    })

    it('fails when any value is outside its explicit tolerance', () => {
      const step = makeStep([10, 20], [0.5, 2])
      expect(checkAnswer(step, [10.4, 22.5])).toBe(false)
    })

    it('respects per-index tolerances independently', () => {
      const step = makeStep([5, 5], [0.1, 3])
      expect(checkAnswer(step, [5.05, 7.9])).toBe(true)
      expect(checkAnswer(step, [5.2, 5])).toBe(false)
    })
  })

  describe('inferred tolerance from decimal places', () => {
    it('treats an integer expected value as +/- 1', () => {
      const step = makeStep([40])
      expect(checkAnswer(step, [40])).toBe(true)
      expect(checkAnswer(step, [41])).toBe(true)
      expect(checkAnswer(step, [39])).toBe(true)
      expect(checkAnswer(step, [41.5])).toBe(false)
      expect(checkAnswer(step, [38.5])).toBe(false)
    })

    it('treats one decimal place as +/- 0.1 at the boundary', () => {
      const step = makeStep([3.1])
      expect(checkAnswer(step, [3.1])).toBe(true)
      expect(checkAnswer(step, [3.0])).toBe(true)
      expect(checkAnswer(step, [3.2])).toBe(true)
      expect(checkAnswer(step, [2.99])).toBe(false)
      expect(checkAnswer(step, [3.21])).toBe(false)
    })
  })

  describe('EPSILON boundary', () => {
    it('accepts a value a hair beyond tolerance within EPSILON', () => {
      const step = makeStep([1], [0.5])
      // 1.5 + 1e-10 is within tolerance + EPSILON (1e-9).
      expect(checkAnswer(step, [1.5 + 1e-10])).toBe(true)
    })

    it('rejects a value beyond tolerance plus EPSILON', () => {
      const step = makeStep([1], [0.5])
      expect(checkAnswer(step, [1.5 + 1e-6])).toBe(false)
    })
  })
})
