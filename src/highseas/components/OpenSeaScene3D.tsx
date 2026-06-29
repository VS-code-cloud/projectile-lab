import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import {
  dampVec3,
  detectWebGL,
  NavalEnvironment,
  Ship,
} from '../../components/interactive/naval'
import { newAssetsEnabled } from '../assets'
import { AssetErrorBoundary } from './AssetErrorBoundary'
import { AssetShip } from './AssetShip'
import { AssetIslandDecor } from './AssetIslandDecor'
import { AssetSky } from './AssetSky'
import {
  headingToMovementVector,
  headingToRenderRotationDeg,
  mapPositionPercent,
  WORLD_DISTANCE_METERS,
} from '../navigation'
import {
  graphicsSettings,
  isMobileUserAgent,
  selectGraphicsQuality,
  type GraphicsSettings,
} from '../graphicsQuality'
import { SeaPostFx } from './SeaPostFx'
import { SeaWater } from './SeaWater'
import type { HighSeasPosition, Town } from '../types'

export interface SeaContactView {
  id: string
  kind: 'pirate' | 'navy'
  position: HighSeasPosition
  headingDeg?: number
}

/**
 * Authoritative, render-loop-driven simulation state. The open-sea sim mutates
 * these refs every frame (via `onSimFrame`) instead of React state, so the
 * `<Canvas>` never re-renders per frame — which previously made it flicker
 * transparent. The scene reads them inside its single `useFrame` to place the
 * floating-origin world (the player ship is anchored at the scene origin).
 */
export interface OpenSeaSimRefs {
  /** Player position in normalized [0,1] world coords (floating-origin anchor). */
  player: { current: HighSeasPosition }
  /** Player heading in navigation degrees (0 = east, increases clockwise). */
  heading: { current: number }
  /** Player sail speed (normalized); drives the wake intensity. */
  speed: { current: number }
  /**
   * Live enemy-contact positions, mutated every frame by the sim so the scene
   * can move/rotate the contact ships smoothly (the `contacts` prop only carries
   * membership — which ships exist — and changes rarely, on spawn/fight/moor).
   */
  contacts: { current: SeaContactView[] }
  /**
   * Player-adjustable camera field of view (degrees). Read each frame and applied
   * to the camera, so the FOV slider never re-renders the memoized canvas.
   */
  fov: { current: number }
}

export interface OpenSeaFireControl {
  contactId: string
  distance: number
  range: number
  inRange: boolean
  ready: boolean
  preparing: boolean
  progress: number
}

interface OpenSeaScene3DProps {
  /** Refs the scene reads each frame to render the floating-origin world. */
  sim: OpenSeaSimRefs
  /** Throttled snapshot of the player position; used only by the DOM mini-map. */
  player: HighSeasPosition
  /** Throttled player heading (nav degrees, 0 = east) for the mini-map pointer. */
  playerHeadingDeg: number
  towns: Town[]
  /** Contact membership (which ships exist) — drives the 3D scene's groups. */
  contacts: SeaContactView[]
  /**
   * Throttled (~10 Hz) snapshot of live contact positions for the DOM mini-map
   * dots. Kept separate from `contacts` so the memoized canvas never re-renders
   * just because a dot moved.
   */
  contactDots: SeaContactView[]
  showMap: boolean
  /** Max cannon range (m) for the in-canvas firing ring; null when no target. */
  fireRangeMeters: number | null
  fireControl: OpenSeaFireControl | null
  onFire: () => void
  onTeleportTown: (townId: string) => void
  /** Advances the sim one frame: mutates `sim` refs and lifts discrete events. */
  onSimFrame: (deltaSeconds: number) => void
}

// Normalized [0,1] world -> render units. Huge so towns sit ~100x an island
// apart; the scene uses a floating origin (player anchored at 0) so these large
// magnitudes never reach the GPU and there is no float-precision jitter.
const WORLD = 275000
// Island footprint radius (render units). The player ship is ~10 units long, so
// a 2000-unit radius (4000-unit diameter) island is ~400x the size of the ship —
// the islands read as substantial landmasses you sail up to, not distant specks.
const ISLAND_RADIUS = 2000
// The original island art was modeled at radius 12; scale it up to ISLAND_RADIUS.
const ISLAND_SCALE = ISLAND_RADIUS / 12
/** Island footprint as a fraction of the normalized [0,1] world. */
export const ISLAND_NORMALIZED_RADIUS = ISLAND_RADIUS / WORLD
/**
 * Normalized offset to spawn a ship just off a port's shore: the island radius
 * plus a margin of open water, so a larger island never swallows the spawn point.
 */
export const OFFSHORE_SPAWN_NORMALIZED = (ISLAND_RADIUS + 350) / WORLD
// Sea + horizon haze color. The canvas background matches it so the ship can
// never sail into a blank/white void — the fog and background blend seamlessly.
const HORIZON_COLOR = '#bcdcec'
const FOG_NEAR = 1800
const FOG_FAR = 34000
// Ocean plane, centered on the ship each render so the sea always fills the view.
const OCEAN_SIZE = 80000
// Sun direction; matches NavalEnvironment's key light so the water's specular
// glints line up with the sky's sun.
const SUN_DIR: [number, number, number] = [-70, 48, 96]
// Foam-fleck tile size (render units) used to convey motion over open water.
const SPARKLE_TILE = 240
// Chase-camera framing: distance behind the heading and height above the ship.
// Pulled back + raised so the whole ship — bow to stern — fits in the taller
// view (see the canvas height below), rather than cropping the ends.
const CAMERA_BACK = 44
const CAMERA_HEIGHT = 27
// Ship render scale — doubled from the original tuning (player 0.92, contact
// 0.72) so approaching ships read clearly against the very large world.
const PLAYER_SHIP_SCALE = 1.84
const CONTACT_SHIP_SCALE = 1.44
// Camera field-of-view bounds for the in-scene slider (degrees).
export const FOV_MIN = 55
export const FOV_MAX = 120
export const FOV_DEFAULT = 75

// Stable Canvas-level config. These MUST keep a constant reference so R3F never
// reconfigures the renderer (re-apply camera, setPixelRatio/resize) on a parent
// re-render, which would reallocate the drawing buffer and flicker the canvas.
const CAMERA_PROPS = {
  position: [0, CAMERA_HEIGHT, CAMERA_BACK] as [number, number, number],
  // Initial field of view; the player can widen/narrow it at runtime via the
  // FOV slider (applied to the camera each frame from `sim.fov`).
  fov: FOV_DEFAULT,
  // Pull the near plane out and the far plane in (the horizon is fogged by
  // FOG_FAR long before `far` anyway): a tighter depth range hugely improves
  // z-buffer precision, which removes the z-fighting "flicker" on the
  // near-coplanar island/sea surfaces. The ship sits ~34 units from the camera,
  // so a 2.5 near plane never clips it.
  near: 2.5,
  far: 36000,
}
// Opaque canvas (no alpha). Tone mapping is disabled on the renderer so the
// post-processing ToneMapping (ACES) is applied once in the composer and Bloom
// samples HDR values (emissive > 1) before the map-down.
const GL_PROPS = { alpha: false, toneMapping: THREE.NoToneMapping }

const DEV = import.meta.env.DEV

declare global {
  interface Window {
    /**
     * Dev-only diagnostics so a browser/CDP probe can verify the flicker fix
     * deterministically (no screenshots): `frames` should climb ~60/s while
     * `seaCanvasRenders` stays flat (the Canvas is NOT re-rendering per frame),
     * `contextLost` stays 0, and `playerX/playerY` change while sailing.
     */
    __highSeasSim?: {
      frames: number
      seaCanvasRenders: number
      outerRenders: number
      contextLost: number
      contextRestored: number
      lastDelta: number
      fps: number
      drawCalls: number
      triangles: number
      quality: string
      playerX: number
      playerY: number
    }
  }
}

function devSim() {
  if (!DEV) return undefined
  if (!window.__highSeasSim) {
    window.__highSeasSim = {
      frames: 0,
      seaCanvasRenders: 0,
      outerRenders: 0,
      contextLost: 0,
      contextRestored: 0,
      lastDelta: 0,
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      quality: 'high',
      playerX: 0,
      playerY: 0,
    }
  }
  return window.__highSeasSim
}

/** Render x of `pos` relative to the player (floating origin). */
function relX(pos: HighSeasPosition, player: HighSeasPosition): number {
  return (pos.x - player.x) * WORLD
}
/** Render z of `pos` relative to the player (floating origin). */
function relZ(pos: HighSeasPosition, player: HighSeasPosition): number {
  return (pos.y - player.y) * WORLD
}

function headingRotationY(deg: number): number {
  return THREE.MathUtils.degToRad(headingToRenderRotationDeg(deg))
}

/** Apply a field-of-view (degrees) to a perspective camera, if it changed. */
function applyCameraFov(camera: THREE.Camera, fov: number): void {
  const cam = camera as THREE.PerspectiveCamera
  if (cam.isPerspectiveCamera && cam.fov !== fov) {
    cam.fov = fov
    cam.updateProjectionMatrix()
  }
}

interface ShipModelProps {
  hd: boolean
  scale: number
  float?: boolean
  animate?: boolean
  hullColor?: string
  sailColor?: string
  flag?: boolean
  /** Hull tint for the glTF ship (used to read navy vs pirate). */
  tint?: string
}

/**
 * Renders either the original procedural `Ship` or the CC0 glTF ship, picked by
 * the HD-assets flag. The glTF path is wrapped in Suspense + an error boundary
 * whose fallback is the SAME procedural ship, so the scene looks correct while
 * the model loads and degrades gracefully if it ever fails — the UI works
 * identically with or without the downloaded assets.
 */
function ShipModel({
  hd,
  scale,
  float,
  animate,
  hullColor,
  sailColor,
  flag,
  tint,
}: ShipModelProps) {
  const procedural = (
    <Ship
      scale={scale}
      float={float}
      animate={animate}
      hullColor={hullColor}
      sailColor={sailColor}
      flag={flag}
    />
  )
  if (!hd) return procedural
  return (
    <AssetErrorBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <AssetShip scale={scale} float={float} animate={animate} tint={tint} />
      </Suspense>
    </AssetErrorBoundary>
  )
}

/** Gate + Suspense + error-boundary wrapper for an HD-only asset subtree. */
function HdAssets({ hd, children }: { hd: boolean; children: ReactNode }) {
  if (!hd) return null
  return (
    <AssetErrorBoundary fallback={null}>
      <Suspense fallback={null}>{children}</Suspense>
    </AssetErrorBoundary>
  )
}

// Island elevation profile (render units). A sandy base frustum rises from below
// the waterline to a grassy hill topped by a flat plateau where the town sits.
// Giving the island real volume (instead of a flat disc) means the buildings
// read as standing ON the land, and the ship — stopped at the shore by the soft
// collision (radius ISLAND_RADIUS) — meets a visible beach instead of clipping a
// flat plane.
const ISLAND_PLATEAU_Y = 300
const ISLAND_PLATEAU_RADIUS = ISLAND_RADIUS * 0.62

function TownIsland({ hd }: { hd: boolean }) {
  return (
    <group>
      {/* Sandy beach base: widest underwater, breaking the surface as a shore. */}
      <mesh position={[0, -10, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS * 0.92, ISLAND_RADIUS * 1.06, 150, 56]} />
        <meshStandardMaterial color="#e4d6a6" roughness={1} />
      </mesh>
      {/* Grassy hill rising to the town plateau. */}
      <mesh position={[0, ISLAND_PLATEAU_Y / 2 + 32, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[ISLAND_PLATEAU_RADIUS, ISLAND_RADIUS * 0.92, ISLAND_PLATEAU_Y - 64, 56]}
        />
        <meshStandardMaterial color="#5fae5a" roughness={1} />
      </mesh>

      {/* Town buildings + dock, modeled at radius ~12 and scaled up, sitting on
          the plateau so they are visibly connected to the landmass. */}
      <group position={[0, ISLAND_PLATEAU_Y, 0]} scale={ISLAND_SCALE}>
        <mesh position={[0, 0.45, 5.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 8, 8]} />
          <meshStandardMaterial color="#6b4a26" roughness={0.8} />
        </mesh>
        {[
          [-4, 0.8, -1, '#f4c36d'],
          [-1, 1.15, 1.2, '#e07a5f'],
          [2.2, 0.95, -1.6, '#f2cc8f'],
          [4.5, 1.35, 1, '#81b29a'],
        ].map(([x, h, z, color]) => (
          <group key={`${x}-${z}`} position={[Number(x), Number(h) / 2, Number(z)]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[2.1, Number(h), 1.8]} />
              <meshStandardMaterial color={String(color)} roughness={0.85} />
            </mesh>
            <mesh position={[0, Number(h) / 2 + 0.28, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[1.7, 0.75, 4]} />
              <meshStandardMaterial color="#7f1d1d" roughness={0.85} />
            </mesh>
          </group>
        ))}
        {/* HD-only: CC0 palms + rocks share this building-space coordinate frame. */}
        <HdAssets hd={hd}>
          <AssetIslandDecor />
        </HdAssets>
      </group>
    </group>
  )
}

function RangeCircle({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const points: number[] = []
    const segments = 72
    for (let i = 0; i < segments; i += 2) {
      const a = (i / segments) * Math.PI * 2
      const b = ((i + 1) / segments) * Math.PI * 2
      points.push(Math.cos(a) * radius, 0.14, Math.sin(a) * radius)
      points.push(Math.cos(b) * radius, 0.14, Math.sin(b) * radius)
    }
    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return next
  }, [radius])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#fef3c7" transparent opacity={0.95} />
    </lineSegments>
  )
}

interface SeaSceneProps {
  sim: OpenSeaSimRefs
  towns: Town[]
  contacts: SeaContactView[]
  fireRangeMeters: number | null
  reducedMotion: boolean
  hd: boolean
  onSimFrame: (deltaSeconds: number) => void
}

function SeaScene({
  sim,
  towns,
  contacts,
  fireRangeMeters,
  reducedMotion,
  hd,
  onSimFrame,
}: SeaSceneProps) {
  const { camera, gl } = useThree()
  const playerShipRef = useRef<THREE.Group>(null)
  const sparklesRef = useRef<THREE.Group>(null)
  const townRefs = useRef<Array<THREE.Group | null>>([])
  const contactRefs = useRef<Map<string, THREE.Group>>(new Map())
  const lookAt = useRef(new THREE.Vector3(0, 4, 0))

  // Keep the freshest sim-advance callback so the (rarely re-rendered) useFrame
  // closure never calls a stale one without forcing the scene to re-subscribe.
  const onSimFrameRef = useRef(onSimFrame)
  useEffect(() => {
    onSimFrameRef.current = onSimFrame
  }, [onSimFrame])

  const desiredPos = useMemo(() => new THREE.Vector3(), [])
  const desiredLook = useMemo(() => new THREE.Vector3(0, 4, 0), [])

  const rangeRadius =
    fireRangeMeters != null ? (fireRangeMeters / WORLD_DISTANCE_METERS) * WORLD : null

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    // Advance the entire open-sea simulation (mutates the sim refs in place and
    // lifts only discrete/throttled events to React). No per-frame React state.
    onSimFrameRef.current(delta)

    // Apply the player's chosen field of view (from the slider) without ever
    // re-rendering the memoized canvas — read straight off the sim ref.
    applyCameraFov(camera, sim.fov.current)

    const player = sim.player.current
    const heading = sim.heading.current

    if (playerShipRef.current) {
      playerShipRef.current.rotation.y = headingRotationY(heading)
    }

    if (sparklesRef.current) {
      const px = (player.x - 0.5) * WORLD
      const pz = (player.y - 0.5) * WORLD
      sparklesRef.current.position.set(
        -(((px % SPARKLE_TILE) + SPARKLE_TILE) % SPARKLE_TILE),
        3,
        -(((pz % SPARKLE_TILE) + SPARKLE_TILE) % SPARKLE_TILE),
      )
    }

    for (let i = 0; i < towns.length; i++) {
      const group = townRefs.current[i]
      if (group) group.position.set(relX(towns[i], player), 0, relZ(towns[i], player))
    }

    // Live contact positions come from the sim ref (mutated every frame), so the
    // enemy ships slide/turn smoothly even though the `contacts` membership prop
    // only changes on spawn/fight/moor. Each contact turns to bear on the player.
    const liveContacts = sim.contacts.current
    for (let i = 0; i < liveContacts.length; i++) {
      const contact = liveContacts[i]
      const group = contactRefs.current.get(contact.id)
      if (group) {
        const rx = relX(contact.position, player)
        const rz = relZ(contact.position, player)
        group.position.set(rx, 0, rz)
        group.rotation.y = Math.atan2(-rx, -rz)
      }
    }

    // Chase camera: ease to a spot behind the heading, looking at the ship.
    const forward = headingToMovementVector(heading)
    desiredPos.set(-forward.x * CAMERA_BACK, CAMERA_HEIGHT, -forward.y * CAMERA_BACK)
    const k = reducedMotion ? 40 : 4
    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)

    if (DEV) {
      const d = window.__highSeasSim
      if (d) {
        d.frames++
        d.lastDelta = delta
        d.fps = delta > 0 ? Math.round(1 / delta) : 0
        d.drawCalls = gl.info.render.calls
        d.triangles = gl.info.render.triangles
        d.playerX = player.x
        d.playerY = player.y
      }
    }
  })

  const player0 = sim.player.current

  return (
    <>
      {/* Sky + lighting + fog only; the reflective sea is replaced below by a
          ship-centered plane to avoid the mirror flicker/white-out. */}
      <NavalEnvironment
        sea={false}
        sparkles={false}
        fogArgs={[HORIZON_COLOR, FOG_NEAR, FOG_FAR]}
      />

      {/* HD-only: CC0 HDRI sky + image-based lighting. The fog still fades the
          sea into the horizon, so the fogged water meets the sky seamlessly. */}
      <HdAssets hd={hd}>
        <AssetSky background />
      </HdAssets>

      {/* Open sea: a large flat plane centered on the ship (origin) with a custom
          fog-enabled water shader (Fresnel deep/shallow, sun specular, foam),
          world-anchored so the surface streams past as the ship sails. */}
      <SeaWater
        size={OCEAN_SIZE}
        world={WORLD}
        player={sim.player}
        sunDir={SUN_DIR}
        animate={!reducedMotion}
      />

      {!reducedMotion && (
        <group ref={sparklesRef} position={[0, 3, 0]}>
          <Sparkles
            count={90}
            scale={[SPARKLE_TILE * 3, 8, SPARKLE_TILE * 3]}
            size={3.2}
            speed={0.5}
            color="#ffffff"
            opacity={0.55}
          />
        </group>
      )}

      {rangeRadius != null && <RangeCircle radius={rangeRadius} />}

      <group ref={playerShipRef} rotation={[0, headingRotationY(sim.heading.current), 0]}>
        <ShipModel hd={hd} scale={PLAYER_SHIP_SCALE} float animate={!reducedMotion} />
      </group>

      {contacts.map((contact) => {
        const pirate = contact.kind === 'pirate'
        return (
          <group
            key={contact.id}
            ref={(group) => {
              if (group) contactRefs.current.set(contact.id, group)
              else contactRefs.current.delete(contact.id)
            }}
            position={[relX(contact.position, player0), 0, relZ(contact.position, player0)]}
          >
            {/* The outer group is turned to bear on the player each frame, so the
                ship model stays at identity rotation here. */}
            <ShipModel
              hd={hd}
              scale={CONTACT_SHIP_SCALE}
              hullColor={pirate ? '#7c3f18' : '#334155'}
              sailColor={pirate ? '#d6c2a2' : '#e0f2fe'}
              flag={pirate}
              tint={pirate ? undefined : '#9fb1cc'}
              float
              animate={!reducedMotion}
            />
          </group>
        )
      })}

      {towns.map((town, i) => (
        <group
          key={town.id}
          ref={(group) => {
            townRefs.current[i] = group
          }}
          position={[relX(town, player0), 0, relZ(town, player0)]}
        >
          <TownIsland hd={hd} />
        </group>
      ))}
    </>
  )
}

function handleCreated({ gl }: { gl: THREE.WebGLRenderer }) {
  if (!DEV) return
  const canvas = gl.domElement
  canvas.addEventListener('webglcontextlost', () => {
    const d = devSim()
    if (d) d.contextLost++
  })
  canvas.addEventListener('webglcontextrestored', () => {
    const d = devSim()
    if (d) d.contextRestored++
  })
}

interface SeaCanvasProps {
  sim: OpenSeaSimRefs
  towns: Town[]
  contacts: SeaContactView[]
  fireRangeMeters: number | null
  reducedMotion: boolean
  hd: boolean
  settings: GraphicsSettings
  onSimFrame: (deltaSeconds: number) => void
}

/**
 * The `<Canvas>` subtree, memoized so the throttled HUD/mini-map re-renders of
 * the parent never reconcile the renderer. It re-renders only when one of its
 * own (discrete) props changes: the contacts list, the firing range, motion
 * preference, the stable sim refs, or the stable `onSimFrame` callback.
 */
const SeaCanvas = memo(function SeaCanvas({
  sim,
  towns,
  contacts,
  fireRangeMeters,
  reducedMotion,
  hd,
  settings,
  onSimFrame,
}: SeaCanvasProps) {
  if (DEV) {
    const d = devSim()
    if (d) d.seaCanvasRenders++
  }
  return (
    <Canvas
      camera={CAMERA_PROPS}
      dpr={settings.dpr}
      gl={GL_PROPS}
      onCreated={DEV ? handleCreated : undefined}
    >
      <color attach="background" args={[HORIZON_COLOR]} />
      <SeaScene
        sim={sim}
        towns={towns}
        contacts={contacts}
        fireRangeMeters={fireRangeMeters}
        reducedMotion={reducedMotion}
        hd={hd}
        onSimFrame={onSimFrame}
      />
      <SeaPostFx settings={settings} />
    </Canvas>
  )
})

export function OpenSeaScene3D(props: OpenSeaScene3DProps) {
  const { animationsEnabled } = useMotionPreference()
  const webglOk = useMemo(() => detectWebGL(), [])
  const quality = useMemo(
    () =>
      selectGraphicsQuality({
        reducedMotion: !animationsEnabled,
        mobile: isMobileUserAgent(navigator.userAgent),
      }),
    [animationsEnabled],
  )
  const settings = useMemo(() => graphicsSettings(quality), [quality])
  // HD asset layer is opt-in (env var, or ?newAssets in dev). Stable per mount so
  // the memoized canvas never re-renders on account of it.
  const hd = useMemo(() => newAssetsEnabled(), [])

  if (DEV) {
    const d = devSim()
    if (d) {
      d.outerRenders++
      d.quality = quality
    }
  }

  if (!webglOk) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-sky-50 p-4 text-sm text-slate-600">
        3D sailing is unavailable on this device. Use the map and encounter
        controls below to continue your voyage.
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200">
      {/* Back the canvas with the horizon color: the R3F canvas composites with
          an alpha channel, so if a frame is ever transiently transparent the
          sea/horizon color shows through seamlessly — never the dark page. */}
      <div className="h-[560px] w-full" style={{ backgroundColor: HORIZON_COLOR }}>
        <SeaCanvas
          sim={props.sim}
          towns={props.towns}
          contacts={props.contacts}
          fireRangeMeters={props.fireRangeMeters}
          reducedMotion={!animationsEnabled}
          hd={hd}
          settings={settings}
          onSimFrame={props.onSimFrame}
        />
      </div>
      {props.showMap && (
        <div className="absolute right-3 top-3 w-60 rounded-xl border border-white/50 bg-slate-950/75 p-3 text-xs text-white shadow-xl backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">Open-sea chart</p>
            <span className="text-[10px] text-sky-100">click town to teleport</span>
          </div>
          <div className="relative mt-2 h-32 overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br from-sky-700 to-cyan-950">
            {props.towns.map((town) => (
              <button
                type="button"
                key={town.id}
                className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 text-[0] shadow ring-2 ring-amber-100/80 transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white"
                style={{
                  left: `${mapPositionPercent(town).left}%`,
                  top: `${mapPositionPercent(town).top}%`,
                }}
                onClick={() => props.onTeleportTown(town.id)}
                aria-label={`Teleport to ${town.name}`}
                title={`Teleport to ${town.name}`}
              >
                {town.name}
              </button>
            ))}
            {props.contactDots.map((contact) => {
              const percent = mapPositionPercent(contact.position)
              return (
                <span
                  key={contact.id}
                  className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    contact.kind === 'pirate' ? 'bg-rose-400' : 'bg-blue-200'
                  }`}
                  style={{ left: `${percent.left}%`, top: `${percent.top}%` }}
                />
              )
            })}
            {/* Player marker with a heading pointer. The arrow points east (+x)
                at 0°; on the chart x runs west→east and y runs north→south, and
                nav heading increases clockwise (south = 90°), which matches a CSS
                clockwise rotation — so rotating by the heading aims the bow the
                way the ship is actually sailing. */}
            <span
              className="absolute"
              style={{
                left: `${mapPositionPercent(props.player).left}%`,
                top: `${mapPositionPercent(props.player).top}%`,
                transform: `translate(-50%, -50%) rotate(${props.playerHeadingDeg}deg)`,
              }}
              aria-label="Your ship and heading"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 12 L13 8 L13 16 Z" fill="#6ee7b7" />
                <circle cx="11" cy="12" r="3.6" fill="#ffffff" stroke="#34d399" strokeWidth="2" />
              </svg>
            </span>
          </div>
        </div>
      )}
      {props.fireControl && (
        <div className="absolute right-3 bottom-3 max-w-xs rounded-xl border border-white/50 bg-slate-950/80 p-3 text-xs text-white shadow-xl backdrop-blur">
          <p className="font-semibold">Pirate in range</p>
          <p className="mt-1 text-sky-100">
            Distance {props.fireControl.distance} m · max range{' '}
            {props.fireControl.range.toFixed(0)} m
          </p>
          {props.fireControl.preparing && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-amber-300 transition-all"
                style={{ width: `${props.fireControl.progress * 100}%` }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={props.onFire}
            disabled={!props.fireControl.ready}
            className={`mt-3 min-h-11 w-full rounded-xl px-4 font-semibold transition ${
              props.fireControl.ready
                ? 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 hover:bg-amber-200'
                : 'cursor-not-allowed bg-white/15 text-white/60'
            }`}
          >
            {props.fireControl.ready
              ? 'Fire'
              : props.fireControl.inRange
                ? 'Preparing cannons...'
                : 'Sail into firing range'}
          </button>
        </div>
      )}
    </div>
  )
}
