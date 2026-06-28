import { Suspense, lazy, useEffect, useState } from 'react'
import type { Step } from '../../lessons/types'
import type { EncounterResult, PirateEncounter } from '../types'
import { maxRange, requiredAngleDeg } from '../combat'
import {
  enemyReturnFire,
  enemySunk,
  fireAtEnemy,
  hpPercent,
  initDuel,
  shipSunk,
  type DuelState,
} from '../navalDuel'

const CannonGame3D = lazy(
  () => import('../../components/interactive/CannonGame3D'),
)
const HeelDeckGame3D = lazy(
  () => import('../../components/interactive/HeelDeckGame3D'),
)

interface PirateBattleProps {
  encounter: PirateEncounter
  autoStart?: boolean
  /** The player's current hull HP (drives the player health bar + sink check). */
  hull: number
  /** The player's max hull HP at this ship tier. */
  hullMax: number
  onResolve: (result: EncounterResult) => void
}

type Phase = 'intro' | 'firing' | 'reloading' | 'won' | 'lost'

function gameFallback() {
  return <div className="h-72 w-full animate-shimmer rounded-xl" />
}

/**
 * Ship-to-ship duel against a pirate. Both hulls have a health bar. Each landed
 * cannon shot (the projectile mini-game) chips the enemy hull; if the enemy
 * survives you must reload via the inclined-plane challenge before firing
 * again, and the pirate returns fire while you reload. Win by sinking the enemy
 * (seize its cargo); lose if your hull is shot away, or retreat early and take a
 * parting shot. The cannon fires at a fixed muzzle speed, so the target is
 * always within range.
 */
export function PirateBattle({
  encounter,
  autoStart = false,
  hull,
  hullMax,
  onResolve,
}: PirateBattleProps) {
  const [duel, setDuel] = useState<DuelState>(() =>
    initDuel({ enemyHpMax: encounter.enemyHpMax, hullMax, hull }),
  )
  const [phase, setPhase] = useState<Phase>(autoStart ? 'firing' : 'intro')
  const [ready, setReady] = useState(encounter.aimDelay <= 0)
  // Increments per fired shot so the cannon/reload mini-games remount fresh.
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (encounter.aimDelay <= 0) return
    const timer = setTimeout(() => setReady(true), encounter.aimDelay * 1000)
    return () => clearTimeout(timer)
  }, [encounter.aimDelay])

  // Each clean hit chips the enemy down in ~3 shots; the pirate's reply while
  // you reload takes a portion of its full broadside off your hull.
  const chip = Math.max(1, Math.ceil(encounter.enemyHpMax / 3))
  const returnFire = Math.max(5, Math.round(encounter.damage * 0.6))
  const range = maxRange(encounter.muzzleSpeed)
  const angle = requiredAngleDeg(encounter.distance, encounter.muzzleSpeed)

  const cannonStep: Step = {
    uid: 'high-seas-pirate',
    stepType: 'question',
    displayText: '',
    interactiveComponent: 'CannonGame3D',
    expected: [encounter.distance],
    explanation: '',
    params: {
      v: encounter.muzzleSpeed,
      target: encounter.distance,
      tolerance: encounter.tolerance,
      highSeasMode: 1,
    },
  }

  const reloadStep: Step = {
    uid: 'high-seas-reload',
    stepType: 'question',
    displayText: '',
    interactiveComponent: 'HeelDeckGame3D',
    expected: [7],
    explanation: '',
    params: { length: 5, target: 7, tolerance: 0.4 },
  }

  /** A cannon shot landed on the enemy: chip its hull, then take its reply. */
  function handleHit() {
    const afterHit = fireAtEnemy(duel, chip)
    if (enemySunk(afterHit)) {
      setDuel(afterHit)
      setPhase('won')
      return
    }
    const afterReply = enemyReturnFire(afterHit, returnFire)
    setDuel(afterReply)
    setPhase(shipSunk(afterReply) ? 'lost' : 'reloading')
  }

  /** Reload finished (keg rolled to the gun crew): line up the next shot. */
  function handleReloaded() {
    setRound((r) => r + 1)
    setPhase('firing')
  }

  return (
    <div className="space-y-3">
      <div className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              Pirates ahead!
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              Trade broadsides until one ship goes down. Land a hit, then{' '}
              <span className="font-semibold">reload</span> to fire again — the
              pirate shoots back while you do.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Distance {encounter.distance} m · cannon range {range.toFixed(0)} m.
              {phase === 'intro' &&
                (ready
                  ? ' Your gun crew has a firing solution.'
                  : ` Gun crew is aiming for ${encounter.aimDelay.toFixed(1)} s.`)}
            </p>
          </div>
        </div>
        <DuelHealthBars duel={duel} />
      </div>

      {phase === 'intro' && (
        <div className="card flex flex-wrap items-center justify-end gap-3 p-4">
          <button
            type="button"
            onClick={() =>
              onResolve({
                won: false,
                coins: 0,
                cargo: 0,
                damage: encounter.damage,
              })
            }
            className="btn-ghost min-h-11 px-4 text-rose-600"
          >
            Retreat
          </button>
          <button
            type="button"
            onClick={() => setPhase('firing')}
            disabled={!ready}
            className="btn-primary min-h-11 px-4 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open fire
          </button>
        </div>
      )}

      {phase === 'firing' && (
        <>
          <ProjectileSolutionPanel
            distance={encounter.distance}
            muzzleSpeed={encounter.muzzleSpeed}
            range={range}
            angle={angle}
          />
          <Suspense fallback={gameFallback()}>
            <CannonGame3D
              key={`fire-${round}`}
              step={cannonStep}
              answered={false}
              submittedValues={null}
              isCorrect={null}
              onSubmit={handleHit}
            />
          </Suspense>
        </>
      )}

      {phase === 'reloading' && (
        <Suspense fallback={gameFallback()}>
          <HeelDeckGame3D
            key={`reload-${round}`}
            step={reloadStep}
            answered={false}
            submittedValues={null}
            isCorrect={null}
            onSubmit={handleReloaded}
          />
        </Suspense>
      )}

      {phase === 'won' && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-emerald-300 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">
            Pirate ship sunk! You haul {encounter.loot} cargo aboard.
          </p>
          <button
            type="button"
            onClick={() =>
              onResolve({
                won: true,
                coins: 0,
                cargo: encounter.loot,
                damage: hull - duel.hull,
              })
            }
            className="btn-primary min-h-11 px-4"
          >
            Claim loot &amp; sail on
          </button>
        </div>
      )}

      {phase === 'lost' && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-rose-300 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">
            Their broadside breaks your hull — the ship is going down.
          </p>
          <button
            type="button"
            onClick={() =>
              onResolve({ won: false, coins: 0, cargo: 0, damage: hull })
            }
            className="btn-primary min-h-11 px-4"
          >
            Abandon ship
          </button>
        </div>
      )}
    </div>
  )
}

/** Side-by-side hull bars for the player ship and the enemy pirate. */
function DuelHealthBars({ duel }: { duel: DuelState }) {
  const playerPct = hpPercent(duel.hull, duel.hullMax)
  const enemyPct = hpPercent(duel.enemyHp, duel.enemyHpMax)
  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <HealthBar label="Your hull" pct={playerPct} color="bg-emerald-500" />
      <HealthBar label="Pirate hull" pct={enemyPct} color="bg-rose-500" />
    </div>
  )
}

function HealthBar({
  label,
  pct,
  color,
}: {
  label: string
  pct: number
  color: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>{label}</span>
        <span className="num">{pct}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ProjectileSolutionPanel({
  distance,
  muzzleSpeed,
  range,
  angle,
}: {
  distance: number
  muzzleSpeed: number
  range: number
  angle: number | null
}) {
  return (
    <div className="card border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
      <h3 className="font-display text-sm font-semibold">Fire-control math</h3>
      <p className="mt-1">
        With v = {muzzleSpeed} m/s, max range is {range.toFixed(0)} m at 45°.
        This target is {distance} m away, so a valid low arc is{' '}
        <span className="font-semibold">
          {angle === null ? 'out of range' : `${angle.toFixed(1)}°`}
        </span>
        .
      </p>
    </div>
  )
}
