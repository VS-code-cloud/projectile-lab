import { useMemo, useState } from 'react'
import { BoardingBattle } from '../highseas/components/BoardingBattle'
import { buildBoardingEncounter } from '../highseas/worldEncounters'
import { mulberry32 } from '../highseas/rng'
import type { EncounterResult } from '../highseas/types'

// Dev-only harness: mounts the three-phase boarding challenge in isolation (no
// auth, no voyage state) so the melee UX can be exercised directly and by
// browser/MCP tests. Routed only when import.meta.env.DEV is true.
export default function BoardingHarness() {
  const [seed, setSeed] = useState(1)
  const [result, setResult] = useState<EncounterResult | null>(null)
  const encounter = useMemo(() => buildBoardingEncounter(mulberry32(seed), 0), [seed])

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display mb-4 text-lg font-semibold text-slate-900">
        Boarding challenge (dev harness)
      </h1>
      {result ? (
        <div className="card space-y-2 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Resolved: cargo +{(result.cargo.silk ?? 0) + (result.cargo.spice ?? 0)} (
            {result.cargo.silk ?? 0} silk · {result.cargo.spice ?? 0} spice), hull damage{' '}
            {result.damage}.
          </p>
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setSeed((s) => s + 1)
            }}
            className="btn-primary min-h-11 px-4"
          >
            New boarding
          </button>
        </div>
      ) : (
        <BoardingBattle
          key={seed}
          encounter={encounter}
          hull={100}
          hullMax={100}
          onResolve={setResult}
        />
      )}
      <p className="mt-4 text-xs text-slate-500">
        Seed {seed} · Resolved: {result ? 'yes' : 'no'}
      </p>
    </main>
  )
}
