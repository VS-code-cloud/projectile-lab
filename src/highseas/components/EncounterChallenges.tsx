import { Suspense, lazy, useMemo, useState } from 'react'
import type { Step } from '../../lessons/types'
import { generateMooringSituation } from '../mooringSituation'
import type {
  CargoHold,
  EncounterResult,
  NavyEncounter,
  OverboardEncounter,
  WhirlpoolEncounter,
} from '../types'
import { keepMass } from '../../lib/jettisonGame'
import { holdTotal, toHold } from '../cargo'
import { buildBoardingEncounter } from '../worldEncounters'
import { mulberry32 } from '../rng'
import { BoardingBattle } from './BoardingBattle'

const JettisonGame3D = lazy(
  () => import('../../components/interactive/JettisonGame3D'),
)
const MoorStopGame3D = lazy(
  () => import('../../components/interactive/MoorStopGame3D'),
)
const KedgeGame3D = lazy(
  () => import('../../components/interactive/KedgeGame3D'),
)
const MaelstromGame3D = lazy(
  () => import('../../components/interactive/MaelstromGame3D'),
)
const HeelDeckGame3D = lazy(
  () => import('../../components/interactive/HeelDeckGame3D'),
)

interface ChallengeProps {
  onResolve: (result: EncounterResult) => void
}

function fallback() {
  return <div className="h-72 w-full animate-shimmer rounded-xl" />
}

function stepFor(
  uid: string,
  interactiveComponent: string,
  expected: number,
  params: Record<string, number>,
): Step {
  return {
    uid,
    stepType: 'question',
    displayText: '',
    interactiveComponent,
    expected: [expected],
    explanation: '',
    params,
  }
}

function ResultCard({
  tone,
  text,
  action,
  onClick,
}: {
  tone: 'success' | 'danger'
  text: string
  action: string
  onClick: () => void
}) {
  const className =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : 'border-rose-300 bg-rose-50 text-rose-800'

  return (
    <div className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${className}`}>
      <p className="text-sm font-semibold">{text}</p>
      <button type="button" onClick={onClick} className="btn-primary min-h-11 px-4">
        {action}
      </button>
    </div>
  )
}

export function NavyPursuit({
  encounter,
  cargo,
  hull,
  hullMax,
  seed,
  stage,
  onResolve,
}: ChallengeProps & {
  encounter: NavyEncounter
  cargo: CargoHold
  hull: number
  hullMax: number
  seed: number
  stage: number
}) {
  const [escaped, setEscaped] = useState(false)
  const [fighting, setFighting] = useState(false)
  const target = Math.round(keepMass(encounter.force, encounter.escapeAccel))
  const hold = toHold(cargo)
  const total = holdTotal(hold)
  // Ship hull weighs 200 kg, plus 40 kg per cargo unit aboard.
  const ladenMass = 200 + total * 40
  const cargoLost = Math.max(1, Math.min(total, Math.ceil(total * 0.35)))
  // Split the jettisoned units across the two goods proportionally to the hold.
  const lostRum =
    total > 0 ? Math.min(hold.rum, Math.round((cargoLost * hold.rum) / total)) : 0
  const lostSpice = Math.min(hold.spice, cargoLost - lostRum)
  const lostShort = cargoLost - (lostRum + lostSpice)
  const dropRum = Math.min(hold.rum, lostRum + Math.max(0, lostShort))
  const jettisonDelta = { rum: -dropRum, spice: -lostSpice }
  // If the laden ship is already lighter than the escape keep-mass, it is fast
  // enough to outrun the navy without throwing anything overboard.
  const alreadyFast = ladenMass <= target
  // Standing to fight a navy ship plays the same boarding melee as a pirate,
  // just against the marines (built from a stable per-encounter seed).
  const navyBoarding = useMemo(
    () => buildBoardingEncounter(mulberry32(seed + 4242), stage),
    [seed, stage],
  )
  const step = stepFor('high-seas-navy', 'JettisonGame3D', target, {
    force: encounter.force,
    accelReq: encounter.escapeAccel,
    ladenMass,
    target,
    tolerance: encounter.tolerance,
  })

  if (fighting) {
    return (
      <BoardingBattle
        encounter={navyBoarding}
        foe="navy"
        hull={hull}
        hullMax={hullMax}
        onResolve={onResolve}
      />
    )
  }

  if (alreadyFast) {
    return (
      <div className="space-y-3">
        <EncounterHeader
          title="Navy pursuit!"
          body="A commissioned ship gives chase, but your hold is light."
        />
        <ResultCard
          tone="success"
          text={`Your ship weighs only ${ladenMass} kg — light enough to outrun the navy with sails alone.`}
          action="Return to sea"
          onClick={() => onResolve({ won: true, coins: 0, cargo: {}, damage: 0 })}
        />
        <button
          type="button"
          onClick={() => setFighting(true)}
          className="min-h-11 self-start rounded-xl bg-white px-4 font-semibold text-slate-900 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          Or board them and fight to plunder their hold
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <EncounterHeader
        title="Navy pursuit!"
        body={`A commissioned ship is closing in. Drop cargo until your ship can accelerate away — or stand and board them for the prize.`}
      />
      <Suspense fallback={fallback()}>
        <JettisonGame3D
          step={step}
          answered={escaped}
          submittedValues={escaped ? [target] : null}
          isCorrect={escaped ? true : null}
          onSubmit={() => setEscaped(true)}
        />
      </Suspense>
      {escaped ? (
        <ResultCard
          tone="success"
          text={`You escape, losing ${cargoLost} cargo in the chase.`}
          action="Return to sea"
          onClick={() =>
            onResolve({ won: true, coins: 0, cargo: jettisonDelta, damage: 0 })
          }
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFighting(true)}
            className="btn-primary min-h-11 px-4"
          >
            Stand and fight — board them
          </button>
          <button
            type="button"
            onClick={() =>
              onResolve({
                won: false,
                coins: 0,
                cargo: {},
                damage: encounter.damage,
                survivable: true,
              })
            }
            className="btn-ghost min-h-11 px-4 text-rose-600"
          >
            Surrender the chase and take hull damage
          </button>
        </div>
      )}
    </div>
  )
}

export function OverboardRescue({
  encounter,
  onResolve,
}: ChallengeProps & { encounter: OverboardEncounter }) {
  const [rescued, setRescued] = useState(false)
  const [failed, setFailed] = useState(false)
  const target = Math.round((encounter.v0 * encounter.v0) / (2 * encounter.a))
  const step = stepFor('high-seas-overboard', 'MoorStopGame3D', target, {
    v0: encounter.v0,
    a: encounter.a,
    target,
    tolerance: encounter.tolerance,
    highSeasMode: 1,
  })

  return (
    <div className="space-y-3">
      <EncounterHeader
        title="Crew overboard!"
        body="A ship is hot on your tail — cut sails at the right distance so you glide right to the swimmer. You only get one shot at this."
      />
      <Suspense fallback={fallback()}>
        <MoorStopGame3D
          step={step}
          answered={rescued}
          submittedValues={rescued ? [target] : null}
          isCorrect={rescued ? true : null}
          singleAttempt
          onAttemptSettled={(result) => {
            if (result.status !== 'hit') setFailed(true)
          }}
          onSubmit={() => setRescued(true)}
        />
      </Suspense>
      {rescued && (
        <ResultCard
          tone="success"
          text={`Rescue complete. The crew awards ${encounter.reward} coins.`}
          action="Return to sea"
          onClick={() =>
            onResolve({
              won: true,
              coins: encounter.reward,
              cargo: {},
              damage: 0,
            })
          }
        />
      )}
      {failed && !rescued && (
        <ResultCard
          tone="danger"
          text="No one blames you for the failure, but tonight will be a mournful one."
          action="Sail on"
          onClick={() =>
            onResolve({ won: false, coins: 0, cargo: {}, damage: 0 })
          }
        />
      )}
    </div>
  )
}

export function TownMooring({
  townName,
  onResolve,
}: ChallengeProps & { townName: string }) {
  const [moored, setMoored] = useState(false)
  // Fresh, reasonable, runtime-solvable numbers each docking (stable across
  // retries within this attempt). The correct rope pull is computed from the
  // random wind/current/target, so the situation always has a real answer.
  const situation = useMemo(() => generateMooringSituation(), [])
  const target = situation.correctHaul
  const step = stepFor('high-seas-mooring', 'KedgeGame3D', target, {
    windForce: situation.windForce,
    currentForce: situation.currentForce,
    targetNet: situation.targetNet,
    tolerance: situation.tolerance,
    target,
  })

  return (
    <div className="space-y-3">
      <EncounterHeader
        title={`Moor at ${townName}`}
        body="Balance wind, current, and rope pull before the market opens."
      />
      <Suspense fallback={fallback()}>
        <KedgeGame3D
          step={step}
          answered={moored}
          submittedValues={moored ? [target] : null}
          isCorrect={moored ? true : null}
          onSubmit={() => setMoored(true)}
        />
      </Suspense>
      {moored ? (
        <ResultCard
          tone="success"
          text="You are safely tied up at the dock."
          action="Enter town"
          onClick={() => onResolve({ won: true, coins: 0, cargo: {}, damage: 0 })}
        />
      ) : (
        <p className="text-xs text-slate-500">
          A bad approach scrapes the hull. Retry until you dock safely.
        </p>
      )}
    </div>
  )
}

export function WhirlpoolHazard({
  encounter,
  onResolve,
}: ChallengeProps & { encounter: WhirlpoolEncounter }) {
  const [escaped, setEscaped] = useState(false)
  const targetSpeed = Math.round(
    Math.sqrt(encounter.targetAccel * encounter.radius),
  )
  const step = stepFor('high-seas-whirlpool', 'MaelstromGame3D', targetSpeed, {
    radius: encounter.radius,
    target: encounter.targetAccel,
    tolerance: encounter.tolerance,
    mass: 1000,
  })

  return (
    <div className="space-y-3">
      <EncounterHeader
        title="Whirlpool ahead!"
        body="Hold the right speed around the swirl and slingshot free."
      />
      <Suspense fallback={fallback()}>
        <MaelstromGame3D
          step={step}
          answered={escaped}
          submittedValues={escaped ? [targetSpeed] : null}
          isCorrect={escaped ? true : null}
          onSubmit={() => setEscaped(true)}
        />
      </Suspense>
      {escaped ? (
        <ResultCard
          tone="success"
          text="You ride the current and break free."
          action="Return to sea"
          onClick={() => onResolve({ won: true, coins: 0, cargo: {}, damage: 0 })}
        />
      ) : (
        <button
          type="button"
          onClick={() =>
            onResolve({
              won: false,
              coins: 0,
              cargo: {},
              damage: encounter.damage,
              survivable: true,
            })
          }
          className="btn-ghost min-h-11 px-4 text-rose-600"
        >
          Take damage and break loose
        </button>
      )}
    </div>
  )
}

export function ReloadChallenge({ onResolve }: ChallengeProps) {
  const [reloaded, setReloaded] = useState(false)
  const target = 7
  const step = stepFor('high-seas-reload', 'HeelDeckGame3D', target, {
    length: 5,
    target,
    tolerance: 0.4,
  })

  return (
    <div className="space-y-3">
      <EncounterHeader
        title="Reload the deck gun"
        body="Tilt the on-deck ramp so the powder keg reaches the gun crew safely."
      />
      <Suspense fallback={fallback()}>
        <HeelDeckGame3D
          step={step}
          answered={reloaded}
          submittedValues={reloaded ? [target] : null}
          isCorrect={reloaded ? true : null}
          onSubmit={() => setReloaded(true)}
        />
      </Suspense>
      {reloaded && (
        <ResultCard
          tone="success"
          text="Cannons are ready."
          action="Return to sea"
          onClick={() => onResolve({ won: true, coins: 0, cargo: {}, damage: 0 })}
        />
      )}
    </div>
  )
}

function EncounterHeader({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-4">
      <h2 className="font-display text-base font-semibold text-slate-900">
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-slate-600">{body}</p>
    </div>
  )
}
