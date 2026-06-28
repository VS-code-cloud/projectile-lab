import type { HighSeasSave, Town } from '../types'

interface TownMarketProps {
  save: HighSeasSave
  town: Town
  onSell: () => void
}

/** Port trading panel: sell the whole hold at the town's fixed buy rate. */
export function TownMarket({ save, town, onSell }: TownMarketProps) {
  const proceeds = save.cargo * town.buyRate
  const canSell = save.cargo > 0

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-900">
          {town.name} market
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Sells cargo at{' '}
          <span className="font-semibold text-sky-700">{town.buyRate}</span> coins
          per unit.
        </p>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
        <span className="text-sm text-slate-600">
          Hold: <span className="num font-semibold text-slate-900">{save.cargo}</span>{' '}
          units
        </span>
        <span className="text-sm text-slate-600">
          Value:{' '}
          <span className="num font-semibold text-amber-600">{proceeds}</span> coins
        </span>
      </div>

      <button
        type="button"
        onClick={onSell}
        disabled={!canSell}
        className="btn-primary w-full py-2.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {canSell ? `Sell all for ${proceeds} coins` : 'Hold is empty'}
      </button>
    </div>
  )
}
