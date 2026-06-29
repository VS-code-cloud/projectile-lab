import { TOWNS } from '../constants'
import type { Town } from '../types'

interface VoyageMapProps {
  /** Town the ship is currently docked at. */
  currentTownId: string
  /** Invoked when the player picks a different town to sail to. */
  onChoose: (townId: string) => void
  /** Disable interaction (e.g. while an encounter is resolving). */
  disabled?: boolean
}

const VIEW_W = 100
const VIEW_H = 60

/**
 * Simple node-based sea chart. Towns are placed by their normalized
 * coordinates and fully connected by sailing routes; the current port is
 * highlighted and the others are tappable destinations.
 */
export function VoyageMap({ currentTownId, onChoose, disabled }: VoyageMapProps) {
  const px = (t: Town) => t.x * VIEW_W
  const py = (t: Town) => t.y * VIEW_H

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Sea chart
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose a port to set sail. Enemies may bar the way.
        </p>
      </div>
      <div className="bg-sky-50 p-3">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Sea chart with ports"
        >
          {/* Routes between every pair of towns. */}
          {TOWNS.map((a, i) =>
            TOWNS.slice(i + 1).map((b) => (
              <line
                key={`${a.id}-${b.id}`}
                x1={px(a)}
                y1={py(a)}
                x2={px(b)}
                y2={py(b)}
                stroke="#94a3b8"
                strokeWidth={0.4}
                strokeDasharray="1.5 1.5"
              />
            )),
          )}

          {TOWNS.map((town) => {
            const isCurrent = town.id === currentTownId
            return (
              <g
                key={town.id}
                transform={`translate(${px(town)} ${py(town)})`}
                style={{ cursor: isCurrent || disabled ? 'default' : 'pointer' }}
                onClick={() => {
                  if (!isCurrent && !disabled) onChoose(town.id)
                }}
              >
                <circle
                  r={isCurrent ? 3.2 : 2.4}
                  fill={isCurrent ? '#f59e0b' : '#ffffff'}
                  stroke={isCurrent ? '#b45309' : '#475569'}
                  strokeWidth={0.6}
                />
                {isCurrent && (
                  <circle
                    r={4.6}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={0.4}
                    opacity={0.5}
                  />
                )}
                <text
                  y={-4.2}
                  textAnchor="middle"
                  fontSize={3}
                  fontWeight={isCurrent ? 700 : 500}
                  fill="#0f172a"
                >
                  {town.name}
                </text>
                <text y={6.6} textAnchor="middle" fontSize={2.2} fill="#0369a1">
                  Rum {town.buyRates.rum} · Spice {town.buyRates.spice}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
