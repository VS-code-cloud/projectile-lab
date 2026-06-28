import type { HighSeasSave } from '../types'
import { canAfford } from '../economy'
import { capacityFor, forceFor, nextUpgrade } from '../upgrades'

interface ShipUpgradesProps {
  save: HighSeasSave
  onBuy: () => void
}

/**
 * Shipwright panel: shows the next hull/engine tier and its effect on cargo
 * capacity and escape force, with a purchase button gated on affordability.
 */
export function ShipUpgrades({ save, onBuy }: ShipUpgradesProps) {
  const next = nextUpgrade(save.upgradeStage)
  const affordable = canAfford(save)

  if (!next) {
    return (
      <div className="card flex flex-col gap-2 p-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Shipwright
        </h2>
        <p className="text-sm text-slate-500">
          Your ship is fully upgraded — the mighty{' '}
          <span className="font-semibold text-slate-700">Galleon Rig</span>.
        </p>
      </div>
    )
  }

  const curCap = capacityFor(save.upgradeStage)
  const curForce = forceFor(save.upgradeStage)

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-900">
          Shipwright
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Next: <span className="font-semibold text-slate-700">{next.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-xs text-slate-500">Cargo capacity</span>
          <span className="num font-semibold text-slate-900">
            {curCap} → {next.capacity}
          </span>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <span className="block text-xs text-slate-500">Escape force</span>
          <span className="num font-semibold text-slate-900">
            {curForce} → {next.force} N
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onBuy}
        disabled={!affordable}
        className="btn-secondary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {affordable
          ? `Buy for ${next.cost} coins`
          : `Need ${next.cost} coins (have ${save.coins})`}
      </button>
    </div>
  )
}
