import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import type { Step } from '../../lessons/types'
import type { ShotStatus } from '../../lib/cannonGame'
import type { EncounterResult, PirateEncounter } from '../types'
import { maxRange } from '../combat'
import { mulberry32 } from '../rng'
import { CARGO_LABELS, lootDelta } from '../cargo'
import { BOARDING_METERS, buildBoardingEncounter } from '../worldEncounters'
import { BoardingBattle } from './BoardingBattle'
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
  /** Voyage seed + upgrade stage, used to build a boarding melee if they close in. */
  seed: number
  stage: number
  onResolve: (result: EncounterResult) => void
}

type Phase = 'intro' | 'firing' | 'reloading' | 'boarding' | 'won' | 'lost'

function gameFallback() {
  return <div className="h-72 w-full animate-shimmer rounded-xl" />
}

/**
 * Ship-to-ship duel against a pirate. Both hulls have a health bar. Two clean
 * cannon hits sink the enemy — but each MISS lets the pirate either return fire
 * (minor hull damage) or close the distance (~50/50). If they close inside the
 * boarding range, the duel turns into a three-phase melee. You must work out the
 * firing angle yourself: the scene shows the range, not the solution.
 */
export function PirateBattle({
  encounter,
  autoStart = false,
  hull,
  hullMax,
  seed,
  stage,
  onResolve,
}: PirateBattleProps) {
  const [duel, setDuel] = useState<DuelState>(() =>
    initDuel({ enemyHpMax: encounter.enemyHpMax, hullMax, hull }),
  )
  const [phase, setPhase] = useState<Phase>(autoStart ? 'firing' : 'intro')
  const [ready, setReady] = useState(encounter.aimDelay <= 0)
  // Current distance to the pirate (m); shrinks each time a miss lets it close.
  const [distance, setDistance] = useState(encounter.distance)
  // Increments per fired shot so the cannon/reload mini-games remount fresh.
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (encounter.aimDelay <= 0) return
    const timer = setTimeout(() => setReady(true), encounter.aimDelay * 1000)
    return () => clearTimeout(timer)
  }, [encounter.aimDelay])

  // Two clean hits sink the enemy. A full broadside lands while you reload after
  // a hit; a miss earns only a graze if they choose to shoot back.
  const chip = Math.max(1, Math.ceil(encounter.enemyHpMax / 2))
  const fullBroadside = Math.max(5, Math.round(encounter.damage * 0.6))
  const grazeDamage = Math.max(3, Math.round(encounter.damage * 0.35))
  const range = maxRange(encounter.muzzleSpeed)

  // Which good this pirate is carrying as plunder (stable per encounter).
  const lootGood = useMemo(
    () => (mulberry32(seed + encounter.distance + 3)() < 0.5 ? 'rum' : 'spice'),
    [seed, encounter.distance],
  )

  // A boarding melee built once, used if the pirate closes inside boarding range.
  const boardingEncounter = useMemo(
    () => buildBoardingEncounter(mulberry32(seed + encounter.distance + 17), stage),
    [seed, encounter.distance, stage],
  )

  const cannonStep: Step = {
    uid: 'high-seas-pirate',
    stepType: 'question',
    displayText: '',
    interactiveComponent: 'CannonGame3D',
    expected: [distance],
    explanation: '',
    params: {
      v: encounter.muzzleSpeed,
      target: distance,
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
    const afterReply = enemyReturnFire(afterHit, fullBroadside)
    setDuel(afterReply)
    setPhase(shipSunk(afterReply) ? 'lost' : 'reloading')
  }

  /** A cannon shot missed: ~50/50 they return fire (minor) or close the gap. */
  function handleMiss() {
    if (Math.random() < 0.5) {
      const afterReply = enemyReturnFire(duel, grazeDamage)
      setDuel(afterReply)
      if (shipSunk(afterReply)) setPhase('lost')
      return
    }
    const closer = Math.round(distance * 0.5)
    if (closer <= BOARDING_METERS) {
      setPhase('boarding')
      return
    }
    setDistance(closer)
    setRound((r) => r + 1)
  }

  /** Reload finished (keg rolled to the gun crew): line up the next shot. */
  function handleReloaded() {
    setRound((r) => r + 1)
    setPhase('firing')
  }

  if (phase === 'boarding') {
    return (
      <BoardingBattle
        encounter={boardingEncounter}
        foe="pirate"
        hull={duel.hull}
        hullMax={hullMax}
        priorDamage={hull - duel.hull}
        onResolve={onResolve}
      />
    )
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
              Two solid hits will sink them — but every miss lets them shoot back
              or close in. Land a hit, then <span className="font-semibold">reload</span>{' '}
              to fire again. Get the launch angle right and they go down fast.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Distance {distance} m · cannon range {range.toFixed(0)} m.
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
                cargo: {},
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
        <Suspense fallback={gameFallback()}>
          <CannonGame3D
            key={`fire-${round}`}
            step={cannonStep}
            answered={false}
            submittedValues={null}
            isCorrect={null}
            onSubmit={handleHit}
            onAttempt={(status: ShotStatus) => {
              if (status !== 'hit') handleMiss()
            }}
          />
        </Suspense>
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
            Pirate ship sunk! You haul {encounter.loot} {CARGO_LABELS[lootGood]} aboard.
          </p>
          <button
            type="button"
            onClick={() =>
              onResolve({
                won: true,
                coins: 0,
                cargo: lootDelta(lootGood, encounter.loot),
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
              onResolve({ won: false, coins: 0, cargo: {}, damage: hull })
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
