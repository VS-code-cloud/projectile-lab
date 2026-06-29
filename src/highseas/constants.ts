import type { Town, UpgradeTier } from './types'

// Two goods trade across the islands — rum and spice. Each port pays differently:
// Port Royal is a fair, all-purpose market; Tortuga (a rum-soaked pirate haven)
// pays a premium for rum but little for spice; Nassau, on the spice-trade routes,
// is the mirror image. So where you sell each good matters.
export const TOWNS: Town[] = [
  { id: 'port-royal', name: 'Port Royal', x: 0.2, y: 0.35, buyRates: { rum: 11, spice: 11 } },
  { id: 'tortuga', name: 'Tortuga', x: 0.55, y: 0.45, buyRates: { rum: 18, spice: 7 } },
  { id: 'nassau', name: 'Nassau', x: 0.78, y: 0.62, buyRates: { rum: 7, spice: 18 } },
]

export const UPGRADES: UpgradeTier[] = [
  { stage: 0, name: 'Sloop', capacity: 20, force: 4000, hullMax: 100, cost: 0 },
  {
    stage: 1,
    name: 'Reinforced Hold',
    capacity: 40,
    force: 6000,
    hullMax: 130,
    cost: 150,
  },
  {
    stage: 2,
    name: 'Streamlined Hull',
    capacity: 70,
    force: 9000,
    hullMax: 170,
    cost: 400,
  },
  {
    stage: 3,
    name: 'Galleon Rig',
    capacity: 120,
    force: 14000,
    hullMax: 240,
    cost: 1000,
  },
]

export const STARTING_TOWN_ID = TOWNS[0].id
