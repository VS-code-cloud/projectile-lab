import { describe, expect, it } from 'vitest'
import { parseNewAssetsFlag } from '../highseas/assets'

describe('parseNewAssetsFlag', () => {
  it('is off by default (no env, no query) — production-safe procedural path', () => {
    expect(parseNewAssetsFlag(undefined, '')).toBe(false)
    expect(parseNewAssetsFlag('', '')).toBe(false)
  })

  it('enables on an explicit truthy env value', () => {
    expect(parseNewAssetsFlag('true', '')).toBe(true)
    expect(parseNewAssetsFlag('1', '')).toBe(true)
    expect(parseNewAssetsFlag('TRUE', '')).toBe(true)
  })

  it('treats other env values as off', () => {
    expect(parseNewAssetsFlag('false', '')).toBe(false)
    expect(parseNewAssetsFlag('0', '')).toBe(false)
    expect(parseNewAssetsFlag('no', '')).toBe(false)
  })

  it('enables via the ?newAssets query override (dev testing of the HD path)', () => {
    expect(parseNewAssetsFlag(undefined, '?newAssets')).toBe(true)
    expect(parseNewAssetsFlag(undefined, '?newAssets=1')).toBe(true)
    expect(parseNewAssetsFlag(undefined, '?foo=bar&newAssets=true')).toBe(true)
  })

  it('lets ?newAssets=0/false explicitly force the override off', () => {
    expect(parseNewAssetsFlag(undefined, '?newAssets=0')).toBe(false)
    expect(parseNewAssetsFlag(undefined, '?newAssets=false')).toBe(false)
  })

  it('env enable wins even without a query param', () => {
    expect(parseNewAssetsFlag('1', '?other=1')).toBe(true)
  })
})
