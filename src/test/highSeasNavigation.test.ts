import { describe, expect, it } from 'vitest'
import { TOWNS } from '../highseas/constants'
import {
  advanceAutonavProgress,
  applyShipControls,
  approachPosition,
  approachToStandoff,
  autonavPosition,
  clampPosition,
  displayedSpeedMetersPerSecond,
  distance,
  distanceMeters,
  distanceToTown,
  findTownAtPosition,
  headingToMovementVector,
  headingToRenderRotationDeg,
  headingFromInput,
  isInTownRadius,
  mapPositionPercent,
  MAX_SAIL_SPEED,
  moveByHeading,
  normalizedDistanceToMeters,
  renderRotationToHeadingDeg,
  resolveIslandCollision,
  SAIL_ACCEL,
  type ShipInput,
  type WorldPosition,
  TOWN_HARBOR_RADIUS,
  WORLD_DISTANCE_METERS,
  WORLD_MAX,
  WORLD_MIN,
  WORLD_SCALE_FACTOR,
} from '../highseas/navigation'

describe('distance', () => {
  it('computes euclidean distance between normalized positions', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    expect(distance({ x: 0.2, y: 0.35 }, { x: 0.55, y: 0.45 })).toBeCloseTo(0.364, 3)
  })

  it('converts normalized world distances to the expanded gameplay meter scale', () => {
    expect(WORLD_DISTANCE_METERS).toBe(6000)
    expect(normalizedDistanceToMeters(1)).toBe(6000)
    expect(distanceMeters({ x: 0.2, y: 0.35 }, { x: 0.55, y: 0.45 })).toBeCloseTo(
      Math.hypot(0.35, 0.1) * 6000,
      5,
    )
  })
})

describe('distanceToTown', () => {
  it('uses the town normalized coordinates', () => {
    const portRoyal = TOWNS[0]
    expect(distanceToTown({ x: portRoyal.x, y: portRoyal.y }, portRoyal)).toBe(0)
    expect(distanceToTown({ x: 0, y: 0 }, portRoyal)).toBeCloseTo(
      Math.hypot(portRoyal.x, portRoyal.y),
      5,
    )
  })
})

describe('clampPosition', () => {
  it('keeps coordinates inside world bounds', () => {
    expect(clampPosition({ x: -0.2, y: 1.5 })).toEqual({ x: WORLD_MIN, y: WORLD_MAX })
    expect(clampPosition({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 })
  })

  it('returns clamped map percentages safe for mini-map marker placement', () => {
    expect(mapPositionPercent({ x: -0.2, y: 1.5 })).toEqual({ left: 0, top: 100 })
    expect(mapPositionPercent({ x: 0.375, y: 0.625 })).toEqual({ left: 37.5, top: 62.5 })
  })
})

describe('isInTownRadius / findTownAtPosition', () => {
  it('detects when the ship is within a town harbor radius', () => {
    const town = TOWNS[0]
    expect(isInTownRadius({ x: town.x, y: town.y }, town)).toBe(true)
    expect(isInTownRadius({ x: town.x + TOWN_HARBOR_RADIUS * 0.5, y: town.y }, town)).toBe(
      true,
    )
    expect(
      isInTownRadius({ x: town.x + TOWN_HARBOR_RADIUS * 2, y: town.y }, town),
    ).toBe(false)
  })

  it('returns the nearest town inside radius', () => {
    const town = TOWNS[1]
    expect(findTownAtPosition({ x: town.x, y: town.y }, TOWNS)?.id).toBe(town.id)
    expect(findTownAtPosition({ x: 0.01, y: 0.01 }, TOWNS)).toBeNull()
  })
})

describe('resolveIslandCollision', () => {
  const radius = 0.01

  it('pushes a position inside an island out to its shoreline', () => {
    const town = TOWNS[0]
    const inside: WorldPosition = { x: town.x + 0.001, y: town.y - 0.001 }
    const result = resolveIslandCollision(inside, TOWNS, radius)
    expect(result.collided).toBe(true)
    expect(distanceToTown(result.position, town)).toBeCloseTo(radius, 6)
    // Pushed radially outward, so the bearing from the town center is preserved.
    expect(result.position.x).toBeGreaterThan(town.x)
    expect(result.position.y).toBeLessThan(town.y)
  })

  it('leaves open-water positions untouched', () => {
    const open: WorldPosition = { x: 0.4, y: 0.12 }
    const result = resolveIslandCollision(open, TOWNS, radius)
    expect(result.collided).toBe(false)
    expect(result.position).toEqual(open)
  })

  it('pushes due east when exactly on a town center (no division by zero)', () => {
    const town = TOWNS[1]
    const result = resolveIslandCollision({ x: town.x, y: town.y }, TOWNS, radius)
    expect(result.collided).toBe(true)
    expect(result.position).toEqual({ x: town.x + radius, y: town.y })
  })
})

describe('headingFromInput', () => {
  it('turns left and right without wrapping past a full revolution', () => {
    expect(headingFromInput(0, { left: true }, 1)).toBe(-120)
    expect(headingFromInput(0, { right: true }, 1)).toBe(120)
    expect(headingFromInput(350, { right: true }, 1)).toBe(470)
  })

  it('ignores thrust keys for heading', () => {
    const input: ShipInput = { up: true, down: true }
    expect(headingFromInput(45, input, 1)).toBe(45)
  })
})

describe('moveByHeading', () => {
  it('moves east at 0 degrees and south at 90 degrees', () => {
    const east = moveByHeading({ x: 0.5, y: 0.5 }, 0, 0.1, 1)
    expect(east.x).toBeCloseTo(0.6, 5)
    expect(east.y).toBeCloseTo(0.5, 5)

    const south = moveByHeading({ x: 0.5, y: 0.5 }, 90, 0.1, 1)
    expect(south.x).toBeCloseTo(0.5, 5)
    expect(south.y).toBeCloseTo(0.6, 5)
  })

  it('exposes movement vectors that match the navigation heading convention', () => {
    expect(headingToMovementVector(0)).toEqual({ x: 1, y: 0 })
    const south = headingToMovementVector(90)
    expect(south.x).toBeCloseTo(0, 5)
    expect(south.y).toBeCloseTo(1, 5)
  })
})

describe('heading render conversion', () => {
  it('converts navigation headings to a +z bow render rotation', () => {
    expect(headingToRenderRotationDeg(0)).toBe(90)
    expect(headingToRenderRotationDeg(90)).toBe(0)
    expect(headingToRenderRotationDeg(180)).toBe(-90)
    expect(headingToRenderRotationDeg(-90)).toBe(180)
  })

  it('round-trips render rotations back to navigation headings', () => {
    for (const heading of [-90, 0, 35, 90, 180, 270]) {
      expect(renderRotationToHeadingDeg(headingToRenderRotationDeg(heading))).toBe(heading)
    }
  })
})

describe('applyShipControls', () => {
  it('accelerates forward with up and clamps at world edges', () => {
    const start: WorldPosition = { x: 0.95, y: 0.5 }
    // Sail far longer than a frame so the (deliberately slow) ship still reaches
    // the edge from near it; position must clamp inside the world bounds.
    const next = applyShipControls(start, 0, 0, { up: true }, 20)
    expect(next.position.x).toBe(WORLD_MAX)
    expect(next.speed).toBeGreaterThan(0)
  })

  it('slows with down and can reverse slightly', () => {
    const next = applyShipControls({ x: 0.5, y: 0.5 }, 0, 0.12, { down: true }, 1)
    expect(next.speed).toBeLessThan(0.12)
  })

  it('combines turning and thrust in one tick', () => {
    const next = applyShipControls({ x: 0.2, y: 0.2 }, 0, 0, { up: true, right: true }, 1)
    expect(next.headingDeg).toBeGreaterThan(0)
    expect(next.position.y).toBeGreaterThan(0.2)
    expect(next.speed).toBeGreaterThan(0)
  })

  it('takes several seconds of throttle to reach top speed (heavy momentum)', () => {
    // One second of throttle from rest must NOT already be at max speed...
    const afterOneSecond = applyShipControls({ x: 0.5, y: 0.5 }, 0, 0, { up: true }, 1)
    expect(afterOneSecond.speed).toBeCloseTo(SAIL_ACCEL, 6)
    expect(afterOneSecond.speed).toBeLessThan(MAX_SAIL_SPEED * 0.25)
    // ...and reaching full throttle should take more than 4 seconds.
    expect(MAX_SAIL_SPEED / SAIL_ACCEL).toBeGreaterThan(4)

    // Integrating many small ticks still clamps cleanly at the unchanged top speed.
    let speed = 0
    for (let i = 0; i < 600; i++) {
      speed = applyShipControls({ x: 0.5, y: 0.5 }, 0, speed, { up: true }, 0.05).speed
    }
    expect(speed).toBeCloseTo(MAX_SAIL_SPEED, 6)
  })
})

describe('approachPosition', () => {
  it('steps toward the target by at most maxStep', () => {
    const moved = approachPosition({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.25)
    expect(moved.x).toBeCloseTo(0.25, 6)
    expect(moved.y).toBeCloseTo(0, 6)
  })

  it('moves along the diagonal toward the target', () => {
    const moved = approachPosition({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)
    // 5 units along a 3-4-5 triangle lands exactly on the target.
    expect(moved.x).toBeCloseTo(3, 6)
    expect(moved.y).toBeCloseTo(4, 6)
  })

  it('snaps to the target without overshooting when within one step', () => {
    const moved = approachPosition({ x: 0.4, y: 0.4 }, { x: 0.42, y: 0.4 }, 0.1)
    expect(moved).toEqual({ x: 0.42, y: 0.4 })
  })

  it('returns the target when already there (no division by zero)', () => {
    const moved = approachPosition({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.1)
    expect(moved).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('approachToStandoff', () => {
  it('steps toward the target but never crosses the standoff ring', () => {
    // From 1.0 away, a 0.5 step toward standoff 0.2 lands at 0.5 (still outside).
    const moved = approachToStandoff({ x: 0, y: 0 }, { x: 1, y: 0 }, 0.5, 0.2)
    expect(moved.x).toBeCloseTo(0.5, 6)
    expect(moved.y).toBeCloseTo(0, 6)
  })

  it('stops exactly at the standoff ring instead of overshooting onto the target', () => {
    // Distance 1.0, standoff 0.2: a huge step still only closes to 0.2 away.
    const moved = approachToStandoff({ x: 0, y: 0 }, { x: 1, y: 0 }, 10, 0.2)
    expect(moved.x).toBeCloseTo(0.8, 6)
    expect(moved.y).toBeCloseTo(0, 6)
  })

  it('holds position when already at or inside the standoff ring', () => {
    const inside = approachToStandoff({ x: 0.9, y: 0 }, { x: 1, y: 0 }, 10, 0.2)
    expect(inside).toEqual({ x: 0.9, y: 0 })
  })

  it('never pushes back out when closer than the standoff ring', () => {
    const veryClose = approachToStandoff({ x: 0.99, y: 0 }, { x: 1, y: 0 }, 10, 0.2)
    expect(veryClose).toEqual({ x: 0.99, y: 0 })
  })

  it('returns the source when already on the target (no division by zero)', () => {
    const moved = approachToStandoff({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, 0.1, 0.2)
    expect(moved).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('displayed sailing speed', () => {
  it('shows the original speed even though the ship traverses 10x slower', () => {
    // Actual normalized speed is divided by WORLD_SCALE_FACTOR...
    expect(WORLD_SCALE_FACTOR).toBe(10)
    expect(MAX_SAIL_SPEED).toBeCloseTo(0.0035, 6)
    // ...but the HUD multiplies it back, so max throttle still reads ~210 m/s
    // (the pre-change value: old MAX_SAIL_SPEED 0.035 * WORLD_DISTANCE_METERS).
    expect(displayedSpeedMetersPerSecond(MAX_SAIL_SPEED)).toBeCloseTo(210, 5)
    expect(displayedSpeedMetersPerSecond(0)).toBe(0)
    expect(displayedSpeedMetersPerSecond(-MAX_SAIL_SPEED)).toBeCloseTo(210, 5)
  })
})

describe('autonav progress', () => {
  const from = { x: TOWNS[0].x, y: TOWNS[0].y }
  const to = { x: TOWNS[1].x, y: TOWNS[1].y }

  it('advances progress proportionally to elapsed time and route length', () => {
    const p1 = advanceAutonavProgress(0, from, to, 1)
    const p2 = advanceAutonavProgress(0, from, to, 2)
    expect(p1).toBeGreaterThan(0)
    expect(p1).toBeLessThan(1)
    expect(p2).toBeGreaterThan(p1)
  })

  it('clamps progress at 1 and interpolates position along the route', () => {
    expect(advanceAutonavProgress(0.95, from, to, 100)).toBe(1)
    expect(autonavPosition(from, to, 0)).toEqual(from)
    expect(autonavPosition(from, to, 1)).toEqual(to)
    const mid = autonavPosition(from, to, 0.5)
    expect(mid.x).toBeCloseTo((from.x + to.x) / 2, 5)
    expect(mid.y).toBeCloseTo((from.y + to.y) / 2, 5)
  })
})
