import { describe, it, expect } from 'vitest'
import { checkAnswer } from '../lib/checkAnswer'
import type { Step } from '../lessons/types'

/** Builds a minimal question step for grading tests. */
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

  describe('exact match after rounding', () => {
    it('passes when submitted value equals expected exactly', () => {
      expect(checkAnswer(makeStep([40]), [40])).toBe(true)
      expect(checkAnswer(makeStep([3.1]), [3.1])).toBe(true)
    })

    it('passes when submitted value rounds to expected', () => {
      expect(checkAnswer(makeStep([40]), [40.4])).toBe(true)
      expect(checkAnswer(makeStep([3.1]), [3.14])).toBe(true)
    })

    it('requires integer expected values to round to exactly that integer', () => {
      const step = makeStep([40])
      expect(checkAnswer(step, [39])).toBe(false)
      expect(checkAnswer(step, [41])).toBe(false)
      expect(checkAnswer(step, [39.4])).toBe(false)
      expect(checkAnswer(step, [40.5])).toBe(false)
    })

    it('requires one-decimal expected values to round to exactly that value', () => {
      const step = makeStep([3.1])
      expect(checkAnswer(step, [3.0])).toBe(false)
      expect(checkAnswer(step, [3.2])).toBe(false)
      expect(checkAnswer(step, [2.99])).toBe(false)
      expect(checkAnswer(step, [3.21])).toBe(false)
    })
  })

  describe('multi-value answers', () => {
    it('checks each index independently', () => {
      const step = makeStep([10, 3.1])
      expect(checkAnswer(step, [10, 3.1])).toBe(true)
      expect(checkAnswer(step, [10, 3.2])).toBe(false)
      expect(checkAnswer(step, [11, 3.1])).toBe(false)
    })
  })

  describe('tolerance field ignored', () => {
    it('does not accept values within explicit tolerance that round incorrectly', () => {
      const step = makeStep([10, 20], [0.5, 2])
      expect(checkAnswer(step, [10.4, 21.9])).toBe(false)
      expect(checkAnswer(step, [10, 20])).toBe(true)
    })
  })

  describe('EPSILON boundary', () => {
    it('accepts floating-point noise on an otherwise exact value', () => {
      const step = makeStep([3.1])
      expect(checkAnswer(step, [3.1 + 1e-10])).toBe(true)
    })

    it('rejects a value that rounds away from expected', () => {
      const step = makeStep([3.1])
      expect(checkAnswer(step, [3.15])).toBe(false)
    })
  })
})
