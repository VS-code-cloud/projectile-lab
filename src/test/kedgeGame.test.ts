import { describe, expect, it } from 'vitest'
import { evaluateKedge, netForce } from '../lib/kedgeGame'

describe('netForce', () => {
  it('sums wind, current, and haul with sign', () => {
    expect(netForce(-300, 120, 240)).toBe(60)
  })
})

describe('evaluateKedge (wind=-300, current=120, targetNet=60, tolerance=20)', () => {
  const wind = -300
  const current = 120
  const targetNet = 60
  const tol = 20

  it('accepts the intended haul', () => {
    expect(evaluateKedge(240, wind, current, targetNet, tol).status).toBe('hit')
  })

  it('flags too little haul as short (net 20 N)', () => {
    expect(evaluateKedge(200, wind, current, targetNet, tol).status).toBe('short')
  })

  it('flags too much haul as far (net 120 N)', () => {
    expect(evaluateKedge(300, wind, current, targetNet, tol).status).toBe('far')
  })

  it('treats the zone bounds as inclusive hits', () => {
    expect(evaluateKedge(220, wind, current, targetNet, tol).status).toBe('hit')
    expect(evaluateKedge(260, wind, current, targetNet, tol).status).toBe('hit')
  })
})
