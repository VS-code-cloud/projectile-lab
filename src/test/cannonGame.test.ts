import { createElement } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  classifyDistance,
  evaluateShot,
  shotDistance,
} from '../lib/cannonGame'
import projectileLesson from '../lessons/projectile-2d.json'
import type { Step } from '../lessons/types'
import CannonGame3D from '../components/interactive/CannonGame3D'

describe('shotDistance', () => {
  it('matches the flat-ground range relationship', () => {
    // Max range at 45 deg for v=80, g=9.8 is v^2/g = 653.06 m.
    expect(shotDistance(80, 45)).toBeCloseTo(653.06, 1)
  })

  it('is symmetric for complementary angles', () => {
    expect(shotDistance(80, 25)).toBeCloseTo(shotDistance(80, 65), 6)
  })
})

describe('classifyDistance', () => {
  const target = 500
  const tol = 5

  it('treats the zone bounds as inclusive hits', () => {
    expect(classifyDistance(495, target, tol)).toBe('hit')
    expect(classifyDistance(500, target, tol)).toBe('hit')
    expect(classifyDistance(505, target, tol)).toBe('hit')
  })

  it('flags landings before the zone as short', () => {
    expect(classifyDistance(494.9, target, tol)).toBe('short')
    expect(classifyDistance(0, target, tol)).toBe('short')
  })

  it('flags landings past the zone as far', () => {
    expect(classifyDistance(505.1, target, tol)).toBe('far')
    expect(classifyDistance(653, target, tol)).toBe('far')
  })
})

describe('evaluateShot (v=80, target=500, tolerance=5)', () => {
  const v = 80
  const target = 500
  const tol = 5

  it('accepts the two intended whole-degree solutions', () => {
    for (const angle of [25, 65]) {
      const result = evaluateShot(v, angle, target, tol)
      expect(result.status).toBe('hit')
      expect(result.distance).toBeGreaterThanOrEqual(target - tol)
      expect(result.distance).toBeLessThanOrEqual(target + tol)
    }
  })

  it('rejects the adjacent degrees that fall outside the zone', () => {
    expect(evaluateShot(v, 24, target, tol).status).toBe('short')
    expect(evaluateShot(v, 26, target, tol).status).toBe('far')
  })

  it('classifies clearly wrong angles', () => {
    expect(evaluateShot(v, 10, target, tol).status).toBe('short')
    expect(evaluateShot(v, 45, target, tol).status).toBe('far')
  })
})

describe('CannonGame3D retheme', () => {
  const baseStep: Step = {
    uid: 'test-cannon',
    stepType: 'question',
    displayText: '',
    interactiveComponent: 'CannonGame3D',
    expected: [500],
    explanation: '',
    params: { v: 80, target: 500, tolerance: 5 },
  }

  it('keeps the capstone at 500 m and describes firing from the player ship at an enemy pirate ship', () => {
    const finalStep = projectileLesson.steps.at(-1)

    expect(finalStep?.uid).toBe('step-7-cannon-game')
    expect(finalStep?.expected).toEqual([500])
    expect(finalStep?.params).toEqual({ v: 80, target: 500, tolerance: 5 })
    expect(finalStep?.displayText).toMatch(/player ship/i)
    expect(finalStep?.displayText).toMatch(/enemy pirate ship/i)
    expect(finalStep?.displayText).toMatch(/500 m/i)
    expect(finalStep?.explanation).toMatch(/enemy pirate ship/i)
    expect(finalStep?.explanation).toMatch(/500 m/i)
  })

  it('uses ship-to-ship copy for lesson and high-seas modes without fort defense language', () => {
    const lessonView = render(
      createElement(CannonGame3D, {
        step: baseStep,
        answered: false,
        submittedValues: null,
        isCorrect: null,
        onSubmit: vi.fn(),
      }),
    )

    expect(lessonView.container).toHaveTextContent(/Final challenge: fire from your ship!/i)
    expect(lessonView.container).toHaveTextContent(/enemy pirate ship/i)
    expect(lessonView.container).toHaveTextContent(/500 m/i)
    expect(lessonView.container).not.toHaveTextContent(/fort|defend your fort/i)
    lessonView.unmount()

    const highSeasStep: Step = {
      ...baseStep,
      params: { v: 80, target: 384, tolerance: 5, highSeasMode: 1 },
    }
    const highSeasView = render(
      createElement(CannonGame3D, {
        step: highSeasStep,
        answered: false,
        submittedValues: null,
        isCorrect: null,
        onSubmit: vi.fn(),
      }),
    )

    expect(highSeasView.container).toHaveTextContent(/Pirate battle:/i)
    expect(highSeasView.container).toHaveTextContent(/enemy pirate ship/i)
    expect(highSeasView.container).toHaveTextContent(/384 m/i)
    expect(highSeasView.container).not.toHaveTextContent(/fort|defend your fort/i)
  })
})
