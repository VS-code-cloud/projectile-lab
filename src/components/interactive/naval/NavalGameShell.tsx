import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useMotionPreference } from '../../../hooks/useMotionPreference'
import { detectWebGL } from './webgl'
import type { BandResult, BandStatus } from '../../../lib/navalChallenge'

/** State the shell hands each scene every render. */
export interface NavalSceneProps {
  /** idle (aiming), acting (animating the shot), or result (settled). */
  phase: 'idle' | 'acting' | 'result'
  /** The committed numeric input currently being played out. */
  committedInput: number
  /** Increments on each commit so the scene can reset its animation clock. */
  shotId: number
  /** Snap the camera instead of easing (reduced motion). */
  reducedMotion: boolean
  /** Report the farthest value reached, surfaced on the dev hook. */
  onProgress: (value: number) => void
  /** The scene calls this once its animation has settled. */
  onSettled: () => void
}

export interface NavalGameShellProps {
  /** Publishes `window.__<hookKey>` in dev for browser/MCP assertions. */
  hookKey: string
  /** Instructional copy shown in the white box above the scene. */
  intro: ReactNode
  inputLabel: string
  inputPlaceholder?: string
  /** Commit button label (e.g. "Fire", "Cut sail", "Haul"). */
  actionLabel?: string
  /** Busy label while the shot animates. */
  busyLabel?: string
  /** Parse/validate the typed input; return null to reject. */
  parseInput: (text: string) => number | null
  /** Compute the outcome from a committed input. */
  evaluate: (input: number) => BandResult
  /** Banner copy per phase/outcome. */
  statusText: Record<'idle' | 'acting' | BandStatus, string>
  /** Optional trailing detail appended to the banner once settled. */
  resultSuffix?: (result: BandResult) => string
  /** Target metric; `expected:[target]` and onSubmit([target]) fire on first hit. */
  target: number
  answered: boolean
  onSubmit: (values: number[]) => void
  /** Renders the R3F scene (environment + objects + camera driver). */
  renderScene: (scene: NavalSceneProps) => ReactNode
  /** Initial camera position; the scene then drives the camera each frame. */
  cameraInit?: [number, number, number]
  /** Text shown when WebGL is unavailable. */
  fallbackNote?: string
}

/**
 * Shared chrome + state machine for the naval final-challenges. Owns the
 * instruction box, the live status banner, the numeric input + commit button,
 * the WebGL text fallback, the idle→acting→result phase machine with an
 * ease-back-to-aiming pause, the dev hook, and grading (it calls
 * `onSubmit([target])` exactly once, on the first hit). Each challenge supplies
 * its physics via `evaluate`, its copy, and its 3D scene via `renderScene`.
 */
export function NavalGameShell({
  hookKey,
  intro,
  inputLabel,
  inputPlaceholder = '0',
  actionLabel = 'Fire',
  busyLabel = 'Firing…',
  parseInput,
  evaluate,
  statusText,
  resultSuffix,
  target,
  answered,
  onSubmit,
  renderScene,
  cameraInit = [-24, 34, 52],
  fallbackNote,
}: NavalGameShellProps) {
  const { animationsEnabled } = useMotionPreference()
  const reducedMotion = !animationsEnabled

  const [webglOk] = useState(detectWebGL)
  const [inputText, setInputText] = useState('')
  const [committedInput, setCommittedInput] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'acting' | 'result'>('idle')
  const [status, setStatus] = useState<BandStatus | null>(null)
  const [result, setResult] = useState<BandResult | null>(null)
  const [shotId, setShotId] = useState(0)

  const submitted = useRef(answered)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxProgress = useRef(0)

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  /** Classifies the shot, reveals the result, publishes the dev hook, and
   *  completes on first success. */
  const settle = useCallback(
    (input: number): BandResult => {
      const r = evaluate(input)
      setResult(r)
      setStatus(r.status)
      if (import.meta.env.DEV) {
        ;(window as unknown as Record<string, unknown>)[`__${hookKey}`] = {
          input,
          value: r.value,
          status: r.status,
          target,
          maxProgress: maxProgress.current,
        }
      }
      if (r.status === 'hit' && !submitted.current) {
        submitted.current = true
        onSubmit([target])
      }
      return r
    },
    [evaluate, hookKey, target, onSubmit],
  )

  /** Records the farthest value reached, surfaced on the dev hook. */
  const handleProgress = useCallback((v: number) => {
    if (v > maxProgress.current) maxProgress.current = v
  }, [])

  /** Called by the scene once its animation settles: score, then ease back. */
  const handleSettled = useCallback(() => {
    setPhase('result')
    settle(committedInput)
    if (idleTimer.current) clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setPhase('idle'), 1800)
  }, [settle, committedInput])

  /** Commit the typed input and play it out (or settle immediately, no WebGL). */
  function handleCommit() {
    const n = parseInput(inputText)
    if (n === null) return
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    maxProgress.current = 0
    setCommittedInput(n)
    setStatus(null)
    setResult(null)
    if (webglOk) {
      setPhase('acting')
      setShotId((id) => id + 1)
    } else {
      setPhase('result')
      settle(n)
    }
  }

  const banner = (() => {
    if (phase === 'acting') return { text: statusText.acting, tone: 'idle' as const }
    if (status)
      return {
        text: statusText[status],
        tone: status === 'hit' ? ('hit' as const) : ('miss' as const),
      }
    if (answered) return { text: statusText.hit, tone: 'hit' as const }
    return { text: statusText.idle, tone: 'idle' as const }
  })()

  const bannerClass =
    banner.tone === 'hit'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : banner.tone === 'miss'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-slate-100 text-slate-700 border-slate-200'

  const canCommit = parseInput(inputText) !== null && phase !== 'acting'

  // The scene receives deferred handlers (onProgress/onSettled) that it invokes
  // from its own frame loop — never during render — so the refs they close over
  // are not read while rendering. The strict refs rule can't see across the
  // render-prop boundary, hence the scoped disable.
  // eslint-disable-next-line react-hooks/refs
  const scene = renderScene({
    phase,
    committedInput,
    shotId,
    reducedMotion,
    onProgress: handleProgress,
    onSettled: handleSettled,
  })

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <p className="text-sm leading-relaxed text-slate-700">{intro}</p>
      </div>

      <div
        className={`rounded-xl border px-3 py-2 text-center text-base font-semibold ${bannerClass}`}
        role="status"
        aria-live="polite"
      >
        {banner.text}
        {result && phase !== 'acting' && resultSuffix && (
          <span className="ml-1 font-medium"> {resultSuffix(result)}</span>
        )}
      </div>

      {webglOk ? (
        <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 sm:h-80">
          <Canvas
            camera={{ position: cameraInit, fov: 50, near: 1, far: 2200 }}
            dpr={[1, 2]}
            performance={{ min: 0.5 }}
          >
            <color attach="background" args={['#bcd7ea']} />
            {scene}
          </Canvas>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          {fallbackNote ??
            '3D view is unavailable on this device, so the challenge is shown as text. Enter a value and commit — your answer is still scored.'}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm font-semibold text-slate-700">
          {inputLabel}
          <input
            type="number"
            inputMode="numeric"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={inputPlaceholder}
            className="mt-1 w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <button
          type="button"
          onClick={handleCommit}
          disabled={!canCommit}
          className="btn-primary min-h-11"
        >
          {phase === 'acting' ? busyLabel : actionLabel}
        </button>
      </div>
    </div>
  )
}
