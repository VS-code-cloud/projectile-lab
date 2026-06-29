import type { CargoDelta, CargoGood, CargoHold } from './types'

/** The tradeable goods, in display order. */
export const CARGO_GOODS: CargoGood[] = ['silk', 'spice']

/** A positive cargo delta of `amount` units of a single good. */
export function lootDelta(good: CargoGood, amount: number): CargoDelta {
  return good === 'silk' ? { silk: amount } : { spice: amount }
}

/** Human-readable labels for each good. */
export const CARGO_LABELS: Record<CargoGood, string> = {
  silk: 'Silk',
  spice: 'Spice',
}

/** An empty hold. */
export function emptyHold(): CargoHold {
  return { silk: 0, spice: 0 }
}

/**
 * Coerces any stored cargo value into a {@link CargoHold}. Handles legacy saves
 * where `cargo` was a single number, or where the first good was stored under
 * its old `rum` key, and fills in any missing fields.
 */
export function toHold(cargo: CargoHold | number | null | undefined): CargoHold {
  if (typeof cargo === 'number') return { silk: Math.max(0, cargo), spice: 0 }
  if (!cargo) return emptyHold()
  const legacyRum = (cargo as { rum?: number }).rum ?? 0
  return { silk: cargo.silk ?? legacyRum, spice: cargo.spice ?? 0 }
}

/** Total units in the hold. */
export function holdTotal(hold: CargoHold): number {
  return hold.silk + hold.spice
}

/** Coin value of the hold at a town's per-good buy rates. */
export function holdValue(
  hold: CargoHold,
  rates: Record<CargoGood, number>,
): number {
  return hold.silk * rates.silk + hold.spice * rates.spice
}

/**
 * Applies a per-good delta to the hold, flooring each good at 0 and trimming any
 * total above `capacity`. Overflow is removed from goods that were just added to
 * (loot you can't fit), then from anywhere as a fallback (e.g. capacity shrank).
 */
export function applyCargoDelta(
  hold: CargoHold,
  delta: CargoDelta,
  capacity: number,
): CargoHold {
  const dSilk = delta.silk ?? 0
  const dSpice = delta.spice ?? 0
  let silk = Math.max(0, hold.silk + dSilk)
  let spice = Math.max(0, hold.spice + dSpice)
  let over = silk + spice - capacity
  const trimSpice = () => {
    const t = Math.min(over, spice)
    spice -= t
    over -= t
  }
  const trimSilk = () => {
    const t = Math.min(over, silk)
    silk -= t
    over -= t
  }
  if (over > 0 && dSpice > 0) trimSpice()
  if (over > 0 && dSilk > 0) trimSilk()
  if (over > 0) trimSpice()
  if (over > 0) trimSilk()
  return { silk, spice }
}
