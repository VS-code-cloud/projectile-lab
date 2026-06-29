import { Suspense, lazy, useState } from 'react'
import type { Step } from '../../lessons/types'
import type { BandResult, BandStatus } from '../../lib/navalChallenge'
import type { BoardingEncounter, CargoGood, EncounterResult } from '../types'
import { CARGO_LABELS, lootDelta } from '../cargo'
import { boardingDamageFor, boardingLootFor } from '../boardingMath'

const BoardingGrenadeGame3D = lazy(
  () => import('../../components/interactive/BoardingGrenadeGame3D'),
)
const BoardingSwingGame3D = lazy(
  () => import('../../components/interactive/BoardingSwingGame3D'),
)
const BoardingShoveGame3D = lazy(
  () => import('../../components/interactive/BoardingShoveGame3D'),
)

interface BoardingBattleProps {
  encounter: BoardingEncounter
  /** Player's current hull HP (for the projected-damage warning). */
  hull: number
  /** Player's max hull HP at this ship tier (the guaranteed % is taken of this). */
  hullMax: number
  /** Who is boarding — sets the flavor copy. Defaults to pirates. */
  foe?: 'pirate' | 'navy'
  /** Hull damage already taken before the boarding (e.g. from missed cannon shots). */
  priorDamage?: number
  onResolve: (result: EncounterResult) => void
}

type PhaseKey = 'p1' | 'p2' | 'p3'
type Phase = PhaseKey | 'settled'

const PHASE_META: Record<PhaseKey, { n: number; title: string }> = {
  p1: { n: 1, title: 'Grenade the boarding party' },
  p2: { n: 2, title: 'Cut the swinging boarder loose' },
  p3: { n: 3, title: 'Shove off the grappled ship' },
}

const NEXT: Record<PhaseKey, Phase> = { p1: 'p2', p2: 'p3', p3: 'settled' }

function fallback() {
  return <div className="h-72 w-full animate-shimmer rounded-xl" />
}

function buildStep(
  uid: string,
  component: string,
  params: Record<string, number>,
): Step {
  return {
    uid,
    stepType: 'question',
    displayText: '',
    interactiveComponent: component,
    expected: [params.target ?? 0],
    explanation: '',
    params,
  }
}

/**
 * A pirate boarding party in three one-shot melee phases, each a different
 * physics lesson: hurl a powder grenade (projectile), cut a rope-swinging
 * boarder loose (circular motion), then shove off the grappled hull after
 * looting (Newton's second law). You always fight through all three; each phase
 * missed adds hull damage. Winning hauls a multiplied loot share that beats
 * firing on them, but a percentage hull hit is guaranteed in the bargain.
 */
export function BoardingBattle({
  encounter,
  hull,
  hullMax,
  foe = 'pirate',
  priorDamage = 0,
  onResolve,
}: BoardingBattleProps) {
  const [phase, setPhase] = useState<Phase>('p1')
  const [misses, setMisses] = useState(0)
  // The just-settled phase's outcome, held so the player can read it before
  // pressing on (the one-shot mini-game stays on its result frame meanwhile).
  const [pending, setPending] = useState<BandStatus | null>(null)

  const loot = boardingLootFor(encounter)
  // The good plundered from their hold (deterministic per encounter).
  const lootGood: CargoGood =
    (encounter.baseLoot + encounter.grenadeDistance) % 2 === 0 ? 'silk' : 'spice'

  const grenadeStep = buildStep('boarding-grenade', 'BoardingGrenadeGame3D', {
    v: encounter.grenadeSpeed,
    target: encounter.grenadeDistance,
    tolerance: encounter.grenadeTolerance,
  })
  const swingStep = buildStep('boarding-swing', 'BoardingSwingGame3D', {
    radius: encounter.ropeRadius,
    target: encounter.ropeBreakAccel,
    tolerance: encounter.ropeTolerance,
  })
  const shoveStep = buildStep('boarding-shove', 'BoardingShoveGame3D', {
    pirateShipMass: encounter.pirateShipMass,
    separationAccel: encounter.separationAccel,
    target: encounter.pirateShipMass * encounter.separationAccel,
    tolerance: encounter.shoveTolerance,
  })

  function settlePhase(result: BandResult) {
    if (pending !== null) return
    if (result.status !== 'hit') setMisses((m) => m + 1)
    setPending(result.status)
  }

  function advance(from: PhaseKey) {
    setPending(null)
    setPhase(NEXT[from])
  }

  if (phase === 'settled') {
    const damage = boardingDamageFor(encounter, hullMax, misses) + priorDamage
    const sinks = hull - damage <= 0
    return (
      <div className="space-y-3">
        <BoardingHeader misses={misses} foe={foe} />
        <div
          className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${
            sinks
              ? 'border-rose-300 bg-rose-50'
              : 'border-emerald-300 bg-emerald-50'
          }`}
        >
          <div>
            <p
              className={`text-sm font-semibold ${
                sinks ? 'text-rose-800' : 'text-emerald-800'
              }`}
            >
              {sinks
                ? 'You seize the prize, but the battered hull goes down with it.'
                : 'Boarding repelled — you plunder their hold and slip away!'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              Hauled {loot} {CARGO_LABELS[lootGood]} ({encounter.lootMultiplierPct}% of a
              firing kill). The melee costs {damage} hull
              {misses > 0
                ? ` (${misses} phase${misses > 1 ? 's' : ''} fumbled)`
                : ''}
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onResolve({ won: true, coins: 0, cargo: lootDelta(lootGood, loot), damage })
            }
            className="btn-primary min-h-11 px-4"
          >
            {sinks ? 'Go down with the prize' : 'Claim the loot & sail on'}
          </button>
        </div>
      </div>
    )
  }

  const meta = PHASE_META[phase]

  return (
    <div className="space-y-3">
      <BoardingHeader misses={misses} active={meta.n} foe={foe} />
      <Suspense fallback={fallback()}>
        {phase === 'p1' && (
          <BoardingGrenadeGame3D
            key="boarding-p1"
            step={grenadeStep}
            answered={false}
            submittedValues={null}
            isCorrect={null}
            singleAttempt
            onAttemptSettled={settlePhase}
            onSubmit={() => {}}
          />
        )}
        {phase === 'p2' && (
          <BoardingSwingGame3D
            key="boarding-p2"
            step={swingStep}
            answered={false}
            submittedValues={null}
            isCorrect={null}
            singleAttempt
            onAttemptSettled={settlePhase}
            onSubmit={() => {}}
          />
        )}
        {phase === 'p3' && (
          <BoardingShoveGame3D
            key="boarding-p3"
            step={shoveStep}
            answered={false}
            submittedValues={null}
            isCorrect={null}
            singleAttempt
            onAttemptSettled={settlePhase}
            onSubmit={() => {}}
          />
        )}
      </Suspense>
      {pending !== null && (
        <ContinueCard
          phase={phase}
          status={pending}
          onContinue={() => advance(phase)}
        />
      )}
    </div>
  )
}

function BoardingHeader({
  misses,
  active,
  foe = 'pirate',
}: {
  misses: number
  active?: number
  foe?: 'pirate' | 'navy'
}) {
  const who = foe === 'navy' ? 'Navy marines' : 'Pirates'
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            {who} are boarding!
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Fight them off across three rounds of melee — grenade, rope, and a
            final shove. Win it and you plunder more than a clean cannon kill,
            but expect to take some hull damage in the scrum.
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {([1, 2, 3] as const).map((n) => (
          <div
            key={n}
            className={`h-2 flex-1 rounded-full ${
              active && n < active
                ? 'bg-emerald-400'
                : active === n
                  ? 'bg-brand-400'
                  : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      {misses > 0 && (
        <p className="mt-2 text-xs font-semibold text-amber-600">
          {misses} fumble{misses > 1 ? 's' : ''} so far — each one will cost
          extra hull.
        </p>
      )}
    </div>
  )
}

function ContinueCard({
  phase,
  status,
  onContinue,
}: {
  phase: PhaseKey
  status: BandStatus
  onContinue: () => void
}) {
  const hit = status === 'hit'
  const tone = hit
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
    : 'border-amber-300 bg-amber-50 text-amber-800'
  const text = (() => {
    if (phase === 'p1')
      return hit
        ? 'The boarding party is scattered — but more are coming.'
        : 'The grenade misses and the boarders press on — you take a hit.'
    if (phase === 'p2')
      return hit
        ? 'The rope parts and he drops away. Grab their loot while you can!'
        : 'He lands on your deck and lays into the crew — grab the loot anyway!'
    return hit
      ? 'The hulls break apart cleanly.'
      : 'You wrench free clumsily and take a parting blow.'
  })()
  const action =
    phase === 'p3' ? 'Tally the boarding' : phase === 'p2' ? 'Haul the loot aboard' : 'Press the attack'
  return (
    <div className={`card flex flex-wrap items-center justify-between gap-3 p-4 ${tone}`}>
      <p className="text-sm font-semibold">{text}</p>
      <button type="button" onClick={onContinue} className="btn-primary min-h-11 px-4">
        {action}
      </button>
    </div>
  )
}
