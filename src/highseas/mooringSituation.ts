import { netForce } from '../lib/kedgeGame'

/**
 * A randomized-but-solvable docking (kedge) situation. Wind pushes the ship
 * toward the rocks (negative), the current helps toward the dock (positive), and
 * the player must set a rope pull so the net force lands on a gentle positive
 * `targetNet` into the berth.
 */
export interface MooringSituation {
  windForce: number
  currentForce: number
  targetNet: number
  tolerance: number
  /** The rope pull that makes the net force exactly `targetNet` (the answer). */
  correctHaul: number
}

function randInt(rand: () => number, min: number, max: number): number {
  return Math.round(min + rand() * (max - min))
}

/**
 * Generate a fresh, reasonable docking situation. The correct answer is computed
 * at runtime from the random variables — the force balance is linear
 * (`net = wind + current + haul`), so `correctHaul = targetNet − wind − current`
 * is exact integer arithmetic (no expression engine needed). The ranges keep the
 * answer within the game's accepted input window and always solvable.
 */
export function generateMooringSituation(rand: () => number = Math.random): MooringSituation {
  const windForce = -randInt(rand, 220, 420)
  const currentForce = randInt(rand, 80, 220)
  const targetNet = randInt(rand, 40, 90)
  const tolerance = randInt(rand, 18, 26)
  const correctHaul = targetNet - windForce - currentForce
  return { windForce, currentForce, targetNet, tolerance, correctHaul }
}

/** Net force the ship feels for a given rope pull in this situation. */
export function mooringNetForce(situation: MooringSituation, haul: number): number {
  return netForce(situation.windForce, situation.currentForce, haul)
}
