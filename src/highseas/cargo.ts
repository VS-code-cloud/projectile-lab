import type { CargoDelta, CargoGood, CargoHold } from './types'

/** The tradeable goods, in display order. */
export const CARGO_GOODS: CargoGood[] = ['rum', 'spice']

/** A positive cargo delta of `amount` units of a single good. */
export function lootDelta(good: CargoGood, amount: number): CargoDelta {
  return good === 'rum' ? { rum: amount } : { spice: amount }
}

/** Human-readable labels for each good. */
export const CARGO_LABELS: Record<CargoGood, string> = {
  rum: 'Rum',
  spice: 'Spice',
}

/** An empty hold. */
export function emptyHold(): CargoHold {
  return { rum: 0, spice: 0 }
}

/**
 * Coerces any stored cargo value into a {@link CargoHold}. Handles legacy saves
 * where `cargo` was a single number (treated as rum) and missing fields.
 */
export function toHold(cargo: CargoHold | number | null | undefined): CargoHold {
  if (typeof cargo === 'number') return { rum: Math.max(0, cargo), spice: 0 }
  if (!cargo) return emptyHold()
  return { rum: cargo.rum ?? 0, spice: cargo.spice ?? 0 }
}

/** Total units in the hold. */
export function holdTotal(hold: CargoHold): number {
  return hold.rum + hold.spice
}

/** Coin value of the hold at a town's per-good buy rates. */
export function holdValue(
  hold: CargoHold,
  rates: Record<CargoGood, number>,
): number {
  return hold.rum * rates.rum + hold.spice * rates.spice
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
  const dRum = delta.rum ?? 0
  const dSpice = delta.spice ?? 0
  let rum = Math.max(0, hold.rum + dRum)
  let spice = Math.max(0, hold.spice + dSpice)
  let over = rum + spice - capacity
  const trimSpice = () => {
    const t = Math.min(over, spice)
    spice -= t
    over -= t
  }
  const trimRum = () => {
    const t = Math.min(over, rum)
    rum -= t
    over -= t
  }
  if (over > 0 && dSpice > 0) trimSpice()
  if (over > 0 && dRum > 0) trimRum()
  if (over > 0) trimSpice()
  if (over > 0) trimRum()
  return { rum, spice }
}
