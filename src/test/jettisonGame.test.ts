import { describe, expect, it } from 'vitest'
import {
  evaluateJettison,
  keepMass,
  resultingAccel,
} from '../lib/jettisonGame'

describe('keepMass', () => {
  it('computes m = F/a', () => {
    expect(keepMass(4000, 5)).toBe(800)
  })
})

describe('resultingAccel', () => {
  it('computes a = F/m', () => {
    expect(resultingAccel(4000, 800)).toBe(5)
  })
})

describe('evaluateJettison (force=4000, accelReq=5, tolerance=40)', () => {
  const force = 4000
  const accelReq = 5
  const tol = 40

  it('accepts the intended keep mass', () => {
    expect(evaluateJettison(800, force, accelReq, tol).status).toBe('hit')
  })

  it('flags keeping too little mass as short', () => {
    expect(evaluateJettison(740, force, accelReq, tol).status).toBe('short')
  })

  it('flags keeping too much mass as far', () => {
    expect(evaluateJettison(860, force, accelReq, tol).status).toBe('far')
  })

  it('treats the zone bounds as inclusive hits', () => {
    expect(evaluateJettison(760, force, accelReq, tol).status).toBe('hit')
    expect(evaluateJettison(840, force, accelReq, tol).status).toBe('hit')
  })
})
