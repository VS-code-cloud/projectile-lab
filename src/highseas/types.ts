import type {
  HighSeasPosition,
  HighSeasRoute,
  HighSeasSave,
} from '../firebase/firestore'

export type { HighSeasPosition, HighSeasRoute, HighSeasSave }

/** A port the player can sail to and trade cargo at. */
export interface Town {
  id: string
  name: string
  /** Normalized map position in [0, 1] (x = west→east, y = north→south). */
  x: number
  y: number
  /** Coins paid per unit of cargo sold here. */
  buyRate: number
}

/** A cargo-hold + engine upgrade tier. */
export interface UpgradeTier {
  stage: number
  name: string
  /** Maximum cargo units the hold can carry. */
  capacity: number
  /** Engine/sail force F (N) used by the navy-escape (jettison) math. */
  force: number
  /** Maximum hull hit points at this tier. */
  hullMax: number
  /** Coin cost to buy this tier (0 for the starting tier). */
  cost: number
}

/** The kinds of encounter that can occur while sailing a route. */
export type EncounterKind = 'pirate' | 'navy' | 'overboard' | 'whirlpool'

/** Attack a pirate via the 2D cannon (projectile) challenge. */
export interface PirateEncounter {
  kind: 'pirate'
  /** Horizontal distance to the enemy hull (m) — the cannon target. */
  distance: number
  /** Constant muzzle speed (m/s); sets max range = v²/g (reached at 45°). */
  muzzleSpeed: number
  /** Landing tolerance band (m) counted as a hit. */
  tolerance: number
  /** Cargo looted when the pirate is sunk. */
  loot: number
  /** Hull damage taken if the pirate's return fire connects. */
  damage: number
  /** Seconds the pirate waits before firing back (0.5–2.0). */
  aimDelay: number
  /** Enemy hull hit points for the multi-round duel (sinks at 0). */
  enemyHpMax: number
}

/** Flee a navy ship via the jettison (Newton's second law) challenge. */
export interface NavyEncounter {
  kind: 'navy'
  /** Your sail/engine force F (N). */
  force: number
  /** Acceleration you must reach to outrun them (m/s²). */
  escapeAccel: number
  /** Kept-mass tolerance band (kg) for a clean escape. */
  tolerance: number
  /** Hull damage taken if you fail to escape. */
  damage: number
}

/** Rescue a crew member overboard via the 1D coast-to-stop challenge. */
export interface OverboardEncounter {
  kind: 'overboard'
  /** Speed when the sails are cut (m/s). */
  v0: number
  /** Drag deceleration (m/s²). */
  a: number
  /** Distance tolerance band (m). */
  tolerance: number
  /** Coins rewarded for a successful rescue. */
  reward: number
}

/** Slingshot free of a whirlpool via the circular-motion challenge. */
export interface WhirlpoolEncounter {
  kind: 'whirlpool'
  /** Hold radius (m). */
  radius: number
  /** Centripetal acceleration the hull can bear (m/s²). */
  targetAccel: number
  /** Acceleration tolerance band (m/s²). */
  tolerance: number
  /** Hull damage taken if you fail. */
  damage: number
}

/** Any sea encounter, discriminated by `kind`. */
export type Encounter =
  | PirateEncounter
  | NavyEncounter
  | OverboardEncounter
  | WhirlpoolEncounter

/** The consequence of resolving an encounter, applied to the save. */
export interface EncounterResult {
  /** Whether the challenge was passed. */
  won: boolean
  /** Direct coin delta (selling looted cargo at a town is separate). */
  coins: number
  /** Cargo delta: positive = loot gained, negative = jettisoned. */
  cargo: number
  /** Hull damage taken (>= 0). */
  damage: number
  /**
   * When true, this damage can bruise but never sink the ship: the hull is
   * floored at 1 HP instead of 0. Used for hazards you survive by taking a hit
   * (failing a whirlpool, running from the navy) so they never end the voyage.
   */
  survivable?: boolean
}
