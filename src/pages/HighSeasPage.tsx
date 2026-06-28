import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import { ImmersiveBackground } from '../components/visual/ImmersiveBackground'
import { useHighSeas } from '../highseas/useHighSeas'
import { TOWNS } from '../highseas/constants'
import { mulberry32 } from '../highseas/rng'
import { isInRange, maxRange } from '../highseas/combat'
import {
  applyShipControls,
  displayedSpeedMetersPerSecond,
  distanceMeters,
  findTownAtPosition,
  resolveIslandCollision,
  type ShipInput,
} from '../highseas/navigation'
import {
  buildEnvironmentalEncounter,
  buildNavyEncounter,
  buildPirateEncounter,
  generateVisibleContacts,
  shouldRefreshOpenSeaContacts,
  OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS,
} from '../highseas/worldEncounters'
import type {
  Encounter,
  EncounterResult,
  HighSeasPosition,
  Town,
} from '../highseas/types'
import { normalizeHighSeasSave } from '../highseas/voyage'
import { hullMaxFor, shipStatsFor } from '../highseas/upgrades'
import { ShipHUD } from '../highseas/components/ShipHUD'
import { VoyageMap } from '../highseas/components/VoyageMap'
import { TownMarket } from '../highseas/components/TownMarket'
import { ShipUpgrades } from '../highseas/components/ShipUpgrades'
import { PirateBattle } from '../highseas/components/PirateBattle'
import {
  ISLAND_NORMALIZED_RADIUS,
  OFFSHORE_SPAWN_NORMALIZED,
  OpenSeaScene3D,
} from '../highseas/components/OpenSeaScene3D'
import type { SeaContactView } from '../highseas/components/OpenSeaScene3D'
import {
  NavyPursuit,
  OverboardRescue,
  TownMooring,
  WhirlpoolHazard,
} from '../highseas/components/EncounterChallenges'

type SailMode = 'port' | 'autonav' | 'open'
type SeaContact = SeaContactView & { muzzleSpeed?: number; aimDelay?: number }

// How often (in sailing seconds) the per-frame sim pushes a snapshot of
// player/speed/time to React state for the DOM HUD. ~10 Hz is live enough to
// read yet far below the per-frame state churn that made the canvas flicker.
const HUD_SNAPSHOT_SECONDS = 0.1
// Mooring (dock) trigger zone. Once the ship has sailed clear of every harbor,
// re-entering this normalized radius of a town opens the mooring mini-game — the
// only way to dock. It is larger than the island footprint (you moor in the
// shallows just off the port) and larger than the offshore spawn, so "Enter open
// sea" never docks you on the spot.
const HARBOR_ARRIVAL_NORMALIZED = 0.012
// Fraction of speed kept after bumping an island shore (soft collision).
const COLLISION_SPEED_DAMP = 0.25
type PirateFireTarget = {
  contact: SeaContact
  enteredRangeAt: number | null
  ready: boolean
}

type ActiveEncounter =
  | {
      type: 'sea'
      encounter: Encounter
      nextTownId?: string
      returnMode: SailMode
      autoStart?: boolean
    }
  | { type: 'mooring'; townId: string }

function contactViews(
  player: HighSeasPosition,
  seed: number,
  stage: number,
  elapsedSeconds: number,
): SeaContact[] {
  return generateVisibleContacts(seed, stage, player, elapsedSeconds).map((contact) => ({
    id: contact.id,
    kind: contact.kind,
    position: { x: contact.x, y: contact.y },
    headingDeg: contact.kind === 'pirate' ? 210 : 35,
    muzzleSpeed: contact.muzzleSpeed,
    aimDelay: contact.aimDelay,
  }))
}

function rollPirateOrNavy(
  seed: number,
  stage: number,
  muzzleSpeed: number,
): Encounter {
  const rand = mulberry32(seed)
  if (rand() < 0.58) {
    const range = maxRange(muzzleSpeed)
    return buildPirateEncounter({
      distance: Math.round(range * (0.35 + rand() * 0.45)),
      muzzleSpeed,
      aimDelay: 0,
      rand,
    })
  }
  return buildNavyEncounter(rand, stage)
}

export default function HighSeasPage() {
  const {
    save,
    loading,
    beginVoyage,
    resolveEncounter,
    sell,
    upgrade,
    dock,
    depart,
    updateLocation,
  } = useHighSeas()
  const [mode, setMode] = useState<SailMode>('port')
  const [active, setActive] = useState<ActiveEncounter | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [speed, setSpeed] = useState(0)
  const [player, setPlayer] = useState<HighSeasPosition>(TOWNS[0])
  const [contacts, setContacts] = useState<SeaContact[]>([])
  const [sailingSeconds, setSailingSeconds] = useState(0)
  const [pirateTarget, setPirateTarget] = useState<PirateFireTarget | null>(null)

  // The open-sea simulation runs inside the scene's render loop (`onSimFrame`)
  // and treats these refs as the source of truth. The `player`/`speed`/
  // `sailingSeconds` React state above is only a throttled snapshot for the DOM
  // HUD/map — it is intentionally NOT updated every frame (that 60fps state
  // churn re-rendered the <Canvas> and made it flicker transparent).
  const inputRef = useRef<ShipInput>({})
  const playerRef = useRef(player)
  const headingRef = useRef(0)
  const speedRef = useRef(speed)
  const elapsedRef = useRef(0)
  // Sailing time (s) at which the most recent open-sea encounter was offered;
  // the next one can only trigger a full interval after this, so returning from
  // a fight does not immediately spawn another.
  const lastEncounterAtRef = useRef(0)
  // Sailing time (s) of the last HUD snapshot pushed to React state.
  const lastHudAtRef = useRef(0)
  // Becomes true once the ship has sailed clear of every harbor this voyage leg,
  // so spawning just offshore can't instantly dock; only then does re-entering a
  // harbor open the mooring mini-game.
  const armedForMooringRef = useRef(false)
  const contactsRef = useRef(contacts)
  const pirateTargetRef = useRef(pirateTarget)
  const saveRef = useRef(save)

  // Dev-only: `/dev/high-seas?calm` pauses auto-encounters so the open sea
  // stays mounted indefinitely for inspection/verification.
  const calm = useMemo(
    () => import.meta.env.DEV && new URLSearchParams(window.location.search).has('calm'),
    [],
  )

  // Stable ref bundle the scene reads each frame for floating-origin rendering.
  const sim = useMemo(() => ({ player: playerRef, heading: headingRef }), [])

  const currentTown: Town =
    TOWNS.find((t) => t.id === save?.townId) ?? TOWNS[0]
  const normalizedSave = save ? normalizeHighSeasSave(save) : null
  const stats = shipStatsFor(save?.upgradeStage ?? 0)
  const nearbyTown = useMemo(
    () => findTownAtPosition(player, TOWNS, 0.045),
    [player],
  )

  useEffect(() => {
    contactsRef.current = contacts
  }, [contacts])

  useEffect(() => {
    pirateTargetRef.current = pirateTarget
  }, [pirateTarget])

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const startTeleportEncounter = useCallback((destId: string) => {
    if (!save) return
    const dest = TOWNS.find((town) => town.id === destId) ?? TOWNS[0]
    const encounter = rollPirateOrNavy(
      save.seed + destId.length,
      save.upgradeStage,
      stats.cannonMuzzleSpeed,
    )
    depart()
    updateLocation(dest)
    playerRef.current = dest
    speedRef.current = 0
    setPlayer(dest)
    setContacts([])
    setPirateTarget(null)
    setMode('autonav')
    setActive({
      type: 'sea',
      encounter,
      nextTownId: destId,
      returnMode: 'autonav',
      autoStart: encounter.kind === 'pirate',
    })
  }, [depart, save, stats.cannonMuzzleSpeed, updateLocation])

  function handleChoose(destId: string) {
    startTeleportEncounter(destId)
  }

  function handleOpenSea() {
    if (!save) return
    const saved = normalizedSave?.location ?? currentTown
    // Islands are large relative to the ship, so if the ship would spawn on a
    // town center, set it just offshore (to the west) and face it east so the
    // port's land sits directly ahead in the water — you start "in port".
    const onTown = findTownAtPosition(saved, TOWNS, ISLAND_NORMALIZED_RADIUS)
    const start = onTown
      ? { x: Math.max(0, saved.x - OFFSHORE_SPAWN_NORMALIZED), y: saved.y }
      : saved
    depart()
    playerRef.current = start
    headingRef.current = 0
    speedRef.current = 0
    elapsedRef.current = 0
    lastEncounterAtRef.current = 0
    lastHudAtRef.current = 0
    armedForMooringRef.current = false
    setPlayer(start)
    setSpeed(0)
    setSailingSeconds(0)
    setPirateTarget(null)
    setContacts(contactViews(start, save.seed, save.upgradeStage, 0))
    setMode('open')
    setActive(null)
  }

  function handleReturnToPort() {
    if (!save) return
    // Docking always requires the mooring mini-game — even a manual retreat to
    // the home port. Completing it (see handleResolve) performs the actual dock.
    speedRef.current = 0
    setSpeed(0)
    setContacts([])
    setPirateTarget(null)
    setActive({ type: 'mooring', townId: save.townId })
  }

  const beginPirateFireTarget = useCallback((contact: SeaContact) => {
    setPirateTarget({
      contact,
      enteredRangeAt: null,
      ready: false,
    })
  }, [])

  const triggerOpenSeaContact = useCallback((contact: SeaContact) => {
    const currentSave = saveRef.current
    if (!currentSave) return

    if (contact.kind === 'pirate') {
      beginPirateFireTarget(contact)
      return
    }

    setActive({
      type: 'sea',
      returnMode: 'open',
      encounter: buildNavyEncounter(
        mulberry32(currentSave.seed + Math.round(elapsedRef.current * 1000)),
        currentSave.upgradeStage,
      ),
    })
  }, [beginPirateFireTarget])

  // An open-sea event with no enemy ship: a crew-overboard rescue (1D
  // kinematics) or a whirlpool hazard (uniform circular motion).
  const triggerEnvironmentalEncounter = useCallback(() => {
    const currentSave = saveRef.current
    if (!currentSave) return
    setActive({
      type: 'sea',
      returnMode: 'open',
      encounter: buildEnvironmentalEncounter(
        mulberry32(currentSave.seed + Math.round(elapsedRef.current * 1000)),
        currentSave.upgradeStage,
      ),
    })
  }, [])

  function handleInputButton(key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') {
    if (key === 'ArrowUp') inputRef.current = { ...inputRef.current, up: true }
    if (key === 'ArrowDown') inputRef.current = { ...inputRef.current, down: true }
    if (key === 'ArrowLeft') inputRef.current = { ...inputRef.current, left: true }
    if (key === 'ArrowRight') inputRef.current = { ...inputRef.current, right: true }
    window.setTimeout(() => {
      if (key === 'ArrowUp') inputRef.current = { ...inputRef.current, up: false }
      if (key === 'ArrowDown') inputRef.current = { ...inputRef.current, down: false }
      if (key === 'ArrowLeft') inputRef.current = { ...inputRef.current, left: false }
      if (key === 'ArrowRight') inputRef.current = { ...inputRef.current, right: false }
    }, 180)
  }

  useEffect(() => {
    if (mode !== 'open' || active) return
    function setInput(event: KeyboardEvent, pressed: boolean) {
      if (
        event.key !== 'ArrowUp' &&
        event.key !== 'ArrowDown' &&
        event.key !== 'ArrowLeft' &&
        event.key !== 'ArrowRight'
      ) {
        return
      }
      event.preventDefault()
      inputRef.current = {
        ...inputRef.current,
        up: event.key === 'ArrowUp' ? pressed : inputRef.current.up,
        down: event.key === 'ArrowDown' ? pressed : inputRef.current.down,
        left: event.key === 'ArrowLeft' ? pressed : inputRef.current.left,
        right: event.key === 'ArrowRight' ? pressed : inputRef.current.right,
      }
    }
    const onKeyDown = (event: KeyboardEvent) => setInput(event, true)
    const onKeyUp = (event: KeyboardEvent) => setInput(event, false)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      inputRef.current = {}
    }
  }, [active, mode])

  // Single open-sea simulation step, driven by the scene's `useFrame` (one
  // render-loop clock). It advances physics into refs and lifts ONLY discrete
  // events (contact refresh, encounter trigger, fire-control transitions) plus a
  // throttled HUD snapshot to React — never per-frame state, which is what made
  // the WebGL canvas re-render 60fps and flicker transparent.
  const onSimFrame = useCallback(
    (delta: number) => {
      const currentSave = saveRef.current

      const previousElapsed = elapsedRef.current
      const nextElapsed = previousElapsed + delta
      elapsedRef.current = nextElapsed

      const next = applyShipControls(
        playerRef.current,
        headingRef.current,
        speedRef.current,
        inputRef.current,
        delta,
      )
      // Soft collision: never let the ship sail onto a (now large) island — push
      // it back to the shoreline and bleed off speed for a gentle bump.
      const { position: corrected, collided } = resolveIslandCollision(
        next.position,
        TOWNS,
        ISLAND_NORMALIZED_RADIUS,
      )
      playerRef.current = corrected
      headingRef.current = next.headingDeg
      speedRef.current = collided ? next.speed * COLLISION_SPEED_DAMP : next.speed

      if (currentSave && shouldRefreshOpenSeaContacts(previousElapsed, nextElapsed)) {
        const nextContacts = contactViews(
          corrected,
          currentSave.seed,
          currentSave.upgradeStage,
          nextElapsed,
        )
        contactsRef.current = nextContacts
        setContacts(nextContacts)
      }

      // Docking: the ship must first sail clear of every harbor (so the offshore
      // spawn can't instantly dock); after that, entering a harbor zone opens the
      // mooring mini-game — you cannot dock without completing it.
      const harborTown = findTownAtPosition(corrected, TOWNS, HARBOR_ARRIVAL_NORMALIZED)
      if (!armedForMooringRef.current) {
        if (!harborTown) armedForMooringRef.current = true
      } else if (harborTown) {
        armedForMooringRef.current = false
        setContacts([])
        setPirateTarget(null)
        setActive({ type: 'mooring', townId: harborTown.id })
        return
      }

      if (
        currentSave &&
        !calm &&
        !pirateTargetRef.current &&
        nextElapsed - lastEncounterAtRef.current >= OPEN_SEA_ENCOUNTER_INTERVAL_SECONDS
      ) {
        // ~40% of open-sea events are environmental (overboard rescue or
        // whirlpool); the rest engage a nearby pirate/navy contact.
        const roll = mulberry32(currentSave.seed + Math.round(nextElapsed))()
        if (roll < 0.4) {
          lastEncounterAtRef.current = nextElapsed
          triggerEnvironmentalEncounter()
        } else {
          const [contact] = contactsRef.current
          if (contact) {
            lastEncounterAtRef.current = nextElapsed
            triggerOpenSeaContact(contact)
          }
        }
      }

      // Pirate fire-control: returns the unchanged object on most frames, so
      // React bails out of re-rendering except on an actual range/ready change.
      setPirateTarget((current) => {
        if (!current) return current
        const muzzleSpeed = current.contact.muzzleSpeed ?? stats.cannonMuzzleSpeed
        const aimDelay = current.contact.aimDelay ?? 1
        const distance = Math.round(distanceMeters(corrected, current.contact.position))
        const inRange = isInRange(distance, muzzleSpeed)
        const enteredRangeAt = inRange
          ? current.enteredRangeAt ?? nextElapsed
          : null
        const ready =
          enteredRangeAt !== null && nextElapsed - enteredRangeAt >= aimDelay
        if (
          enteredRangeAt === current.enteredRangeAt &&
          ready === current.ready
        ) {
          return current
        }
        return { ...current, enteredRangeAt, ready }
      })

      // Throttled snapshot for the DOM HUD/map (a few times per second).
      if (nextElapsed - lastHudAtRef.current >= HUD_SNAPSHOT_SECONDS) {
        lastHudAtRef.current = nextElapsed
        setPlayer(corrected)
        setSpeed(speedRef.current)
        setSailingSeconds(nextElapsed)
      }
    },
    [
      calm,
      stats.cannonMuzzleSpeed,
      triggerOpenSeaContact,
      triggerEnvironmentalEncounter,
    ],
  )

  useEffect(() => {
    if (mode !== 'open' || active) return
    const timer = window.setTimeout(() => updateLocation(player), 900)
    return () => window.clearTimeout(timer)
  }, [active, mode, player, updateLocation])

  function engageContact(contact: SeaContact) {
    if (!save) return
    if (contact.kind === 'pirate') {
      beginPirateFireTarget(contact)
    } else {
      setActive({
        type: 'sea',
        returnMode: 'open',
        encounter: buildNavyEncounter(
          mulberry32(save.seed + Math.round(sailingSeconds * 1000)),
          save.upgradeStage,
        ),
      })
    }
  }

  function handleFirePirate() {
    if (!save || !pirateTarget?.ready) return
    const contact = pirateTarget.contact
    const muzzleSpeed = contact.muzzleSpeed ?? stats.cannonMuzzleSpeed
    const distance = Math.round(distanceMeters(player, contact.position))
    if (!isInRange(distance, muzzleSpeed)) return
    setPirateTarget(null)
    setActive({
      type: 'sea',
      returnMode: 'open',
      autoStart: true,
      encounter: buildPirateEncounter({
        distance,
        muzzleSpeed,
        aimDelay: 0,
        rand: mulberry32(save.seed + distance),
      }),
    })
  }

  function handleResolve(result: EncounterResult) {
    if (!save || !active) return
    const willSink = save.hullHp - result.damage <= 0
    resolveEncounter(result)
    if (willSink) {
      setActive(null)
      setPirateTarget(null)
      return
    }

    if (active.type === 'sea' && active.nextTownId) {
      setActive({ type: 'mooring', townId: active.nextTownId })
      return
    }

    if (active.type === 'mooring') {
      dock(active.townId)
      const town = TOWNS.find((t) => t.id === active.townId) ?? TOWNS[0]
      playerRef.current = town
      speedRef.current = 0
      setPlayer(town)
      setSpeed(0)
      setContacts([])
      setPirateTarget(null)
      setMode('port')
      setActive(null)
      return
    }

    // Returning to the open sea: start a fresh encounter interval so the next
    // pursuit cannot trigger immediately after this one resolves.
    lastEncounterAtRef.current = elapsedRef.current
    setMode(active.returnMode)
    setPirateTarget(null)
    setActive(null)
  }

  const fireControl = pirateTarget
    ? (() => {
        const muzzleSpeed = pirateTarget.contact.muzzleSpeed ?? stats.cannonMuzzleSpeed
        const distance = Math.round(distanceMeters(player, pirateTarget.contact.position))
        const range = maxRange(muzzleSpeed)
        const inRange = isInRange(distance, muzzleSpeed)
        const aimDelay = pirateTarget.contact.aimDelay ?? 1
        const preparedFor =
          pirateTarget.enteredRangeAt === null
            ? 0
            : Math.max(0, sailingSeconds - pirateTarget.enteredRangeAt)
        return {
          contactId: pirateTarget.contact.id,
          distance,
          range,
          inRange,
          ready: pirateTarget.ready,
          preparing: inRange && !pirateTarget.ready,
          progress: Math.min(1, preparedFor / aimDelay),
        }
      })()
    : null

  // Discrete range value for the in-canvas firing ring (changes only when a
  // target is acquired/lost), kept separate from the throttled `fireControl`.
  const fireRangeMeters = pirateTarget
    ? maxRange(pirateTarget.contact.muzzleSpeed ?? stats.cannonMuzzleSpeed)
    : null

  return (
    <ImmersiveBackground>
      <Header />
      <main className="mx-auto max-w-5xl px-3 py-6 sm:px-4">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent-400">Capstone voyage</p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-white">
              Sail the High Seas
            </h1>
            <p className="mt-1.5 text-sm text-slate-300">
              Trade cargo between ports, sink pirates with your physics, and bank
              as many coins as you can.
            </p>
          </div>
          <Link to="/" className="btn-ghost min-h-11 self-start px-4 text-white">
            &larr; Back to lessons
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-20 animate-shimmer rounded-2xl" />
            <div className="h-72 animate-shimmer rounded-2xl" />
          </div>
        ) : !save || save.status === 'sunk' ? (
          <VoyageGate
            sunk={save?.status === 'sunk'}
            coins={save?.coins ?? 0}
            onBegin={beginVoyage}
          />
        ) : active ? (
          <div className="space-y-4">
            <ShipHUD save={save} />
            <EncounterOverlay active={active} save={save} onResolve={handleResolve} />
          </div>
        ) : (
          <div className="space-y-4">
            <ShipHUD save={save} />
            {mode === 'open' ? (
              <>
                <OpenSeaScene3D
                  sim={sim}
                  player={player}
                  towns={TOWNS}
                  contacts={contacts}
                  showMap={showMap}
                  fireRangeMeters={fireRangeMeters}
                  fireControl={fireControl}
                  onFire={handleFirePirate}
                  onTeleportTown={startTeleportEncounter}
                  onSimFrame={onSimFrame}
                />
                <OpenSeaControls
                  contacts={contacts}
                  player={player}
                  stats={stats}
                  speed={speed}
                  nearbyTown={nearbyTown}
                  showMap={showMap}
                  onToggleMap={() => setShowMap((v) => !v)}
                  onMove={handleInputButton}
                  onEngage={engageContact}
                  onReturn={handleReturnToPort}
                />
              </>
            ) : (
              <>
                <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <h2 className="font-display text-base font-semibold text-slate-900">
                      Choose how to sail
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-600">
                      Teleport to a town on the chart for one guaranteed encounter, or
                      take the wheel and sail with the arrow keys.
                    </p>
                  </div>
                  <button type="button" onClick={handleOpenSea} className="btn-primary">
                    Enter open sea
                  </button>
                </div>
                <VoyageMap currentTownId={save.townId} onChoose={handleChoose} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <TownMarket
                    save={save}
                    town={currentTown}
                    onSell={() => sell(currentTown)}
                  />
                  <ShipUpgrades save={save} onBuy={upgrade} />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </ImmersiveBackground>
  )
}

function EncounterOverlay({
  active,
  save,
  onResolve,
}: {
  active: ActiveEncounter
  save: NonNullable<ReturnType<typeof normalizeHighSeasSave>>
  onResolve: (result: EncounterResult) => void
}) {
  if (active.type === 'mooring') {
    const town = TOWNS.find((t) => t.id === active.townId) ?? TOWNS[0]
    return <TownMooring townName={town.name} onResolve={onResolve} />
  }

  const { encounter } = active
  if (encounter.kind === 'pirate') {
    return (
      <PirateBattle
        key={`${encounter.distance}-${encounter.aimDelay}`}
        encounter={encounter}
        autoStart={active.autoStart}
        hull={save.hullHp}
        hullMax={hullMaxFor(save.upgradeStage)}
        onResolve={onResolve}
      />
    )
  }
  if (encounter.kind === 'navy') {
    return (
      <NavyPursuit
        encounter={encounter}
        cargo={save.cargo}
        onResolve={onResolve}
      />
    )
  }
  if (encounter.kind === 'overboard') {
    return <OverboardRescue encounter={encounter} onResolve={onResolve} />
  }
  return <WhirlpoolHazard encounter={encounter} onResolve={onResolve} />
}

function OpenSeaControls({
  contacts,
  player,
  stats,
  speed,
  nearbyTown,
  showMap,
  onToggleMap,
  onMove,
  onEngage,
  onReturn,
}: {
  contacts: SeaContact[]
  player: HighSeasPosition
  stats: ReturnType<typeof shipStatsFor>
  speed: number
  nearbyTown: Town | null
  showMap: boolean
  onToggleMap: () => void
  onMove: (key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight') => void
  onEngage: (contact: SeaContact) => void
  onReturn: () => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="card p-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Helm
        </h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Use arrow keys, or tap these controls. Open the map to steer toward towns.
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Speed {displayedSpeedMetersPerSecond(speed).toFixed(0)} m/s
          {nearbyTown ? ` · near ${nearbyTown.name}` : ' · open water'}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <span />
          <button type="button" onClick={() => onMove('ArrowUp')} className="btn-ghost">
            Forward
          </button>
          <span />
          <button type="button" onClick={() => onMove('ArrowLeft')} className="btn-ghost">
            Turn left
          </button>
          <button type="button" onClick={() => onMove('ArrowDown')} className="btn-ghost">
            Back
          </button>
          <button type="button" onClick={() => onMove('ArrowRight')} className="btn-ghost">
            Turn right
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={onToggleMap} className="btn-primary">
            {showMap ? 'Hide map' : 'Open map'}
          </button>
          <button type="button" onClick={onReturn} className="btn-ghost">
            Return to port
          </button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Visible ships
        </h2>
        <div className="mt-3 space-y-2">
          {contacts.map((contact) => {
            const distance = Math.round(distanceMeters(player, contact.position))
            const inRange =
              contact.kind === 'pirate' &&
              isInRange(distance, stats.cannonMuzzleSpeed)
            return (
              <div
                key={contact.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {contact.kind === 'pirate' ? 'Pirate ship' : 'Navy ship'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {distance} m away
                    {contact.kind === 'pirate'
                      ? ` · arm Fire within ${stats.maxFiringRange.toFixed(0)} m`
                      : ' · avoid capture range'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEngage(contact)}
                  disabled={contact.kind === 'pirate' && !inRange}
                  className="btn-primary min-h-10 px-3 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {contact.kind === 'pirate'
                    ? inRange
                      ? 'Arm cannons'
                      : 'Sail closer'
                    : 'Evade'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Start / restart screen shown before a voyage or after being sunk. */
function VoyageGate({
  sunk,
  coins,
  onBegin,
}: {
  sunk: boolean
  coins: number
  onBegin: () => void
}) {
  return (
    <div className="card-glass mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
      <h2 className="font-display text-2xl font-bold text-white">
        {sunk ? 'Your ship went down!' : 'Ready to set sail?'}
      </h2>
      <p className="max-w-sm text-sm text-slate-200">
        {sunk
          ? `You banked ${coins} coins before the sea took you. Chart a new course and try to beat it.`
          : 'Start with a small sloop. Buy and sell cargo, defeat pirates, and upgrade your ship to carry more without losing speed.'}
      </p>
      <button type="button" onClick={onBegin} className="btn-primary glow-brand px-6 py-3">
        {sunk ? 'New voyage' : 'Begin voyage'}
      </button>
    </div>
  )
}
