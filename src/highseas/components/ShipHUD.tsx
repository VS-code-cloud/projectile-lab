import type { HighSeasSave } from '../types'
import { UPGRADES } from '../constants'
import { capacityFor, hullMaxFor } from '../upgrades'

/** Top status strip: coins, cargo load, hull integrity, and current ship tier. */
export function ShipHUD({ save }: { save: HighSeasSave }) {
  const capacity = capacityFor(save.upgradeStage)
  const hullMax = hullMaxFor(save.upgradeStage)
  const hullPct = Math.max(0, Math.round((save.hullHp / hullMax) * 100))
  const cargoPct = Math.min(100, Math.round((save.cargo / capacity) * 100))
  const tier = UPGRADES[Math.min(save.upgradeStage, UPGRADES.length - 1)]

  const hullColor =
    hullPct > 60 ? 'bg-emerald-500' : hullPct > 30 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="card flex flex-col px-4 py-3">
        <span className="num font-display text-2xl font-bold text-amber-600">
          {save.coins}
        </span>
        <span className="mt-0.5 text-xs font-medium text-slate-500">Coins</span>
      </div>

      <div className="card flex flex-col px-4 py-3">
        <span className="num font-display text-2xl font-bold text-slate-900">
          {save.cargo}
          <span className="text-base font-semibold text-slate-400">
            {' '}
            / {capacity}
          </span>
        </span>
        <span className="mt-0.5 text-xs font-medium text-slate-500">Cargo</span>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
            style={{ width: `${cargoPct}%` }}
          />
        </div>
      </div>

      <div className="card flex flex-col px-4 py-3">
        <span className="num font-display text-2xl font-bold text-slate-900">
          {hullPct}%
        </span>
        <span className="mt-0.5 text-xs font-medium text-slate-500">Hull</span>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${hullColor}`}
            style={{ width: `${hullPct}%` }}
          />
        </div>
      </div>

      <div className="card flex flex-col px-4 py-3">
        <span className="font-display truncate text-lg font-bold text-slate-900">
          {tier.name}
        </span>
        <span className="mt-0.5 text-xs font-medium text-slate-500">
          Ship · stage {save.upgradeStage}
        </span>
      </div>
    </div>
  )
}
