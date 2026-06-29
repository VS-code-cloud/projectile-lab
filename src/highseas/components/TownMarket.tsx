import type { CargoGood, HighSeasSave, Town } from '../types'
import { CARGO_GOODS, CARGO_LABELS, holdTotal, holdValue, toHold } from '../cargo'
import { maxBuyable } from '../economy'

interface TownMarketProps {
  save: HighSeasSave
  town: Town
  onSell: () => void
  onBuy: (good: CargoGood, amount: number) => void
}

/**
 * Port trading panel: buy or sell each good at this town's per-good rate. Buy low
 * at one port and sell high at another — the rates differ by town.
 */
export function TownMarket({ save, town, onSell, onBuy }: TownMarketProps) {
  const hold = toHold(save.cargo)
  const proceeds = holdValue(hold, town.buyRates)
  const canSell = holdTotal(hold) > 0

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div>
        <h2 className="font-display text-base font-semibold text-slate-900">
          {town.name} market
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Trade silk and spice — this port's rates differ from the others.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {CARGO_GOODS.map((good) => {
          const rate = town.buyRates[good]
          const buyable = maxBuyable(save, town, good)
          return (
            <div
              key={good}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {CARGO_LABELS[good]}{' '}
                  <span className="text-xs font-medium text-sky-700">
                    {rate} coins/unit
                  </span>
                </p>
                <p className="text-xs text-slate-500">
                  Hold: <span className="num font-semibold text-slate-900">{hold[good]}</span>
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onBuy(good, 1)}
                  disabled={buyable < 1}
                  className="btn-ghost min-h-9 px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy 1
                </button>
                <button
                  type="button"
                  onClick={() => onBuy(good, buyable)}
                  disabled={buyable < 1}
                  className="btn-ghost min-h-9 px-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Buy {buyable || 'max'}
                </button>
              </div>
            </div>
          )
        })}
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
