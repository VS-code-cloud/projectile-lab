import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Float,
  MeshReflectorMaterial,
  Sky,
  Sparkles,
  Text,
} from '@react-three/drei'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { useMotionPreference } from '../../hooks/useMotionPreference'
import { positionAt, timeToReturn } from '../../physics/kinematics'
import { evaluateShot, type ShotStatus } from '../../lib/cannonGame'

// Meters -> world units. Keeps the ~650 m field at a comfortable scene size.
const WORLD = 0.2
const BALL_R = 1.6
const BARREL_LEN = 11
// Real flights run up to ~11 s; compress so a shot resolves in a few seconds.
const TIME_SCALE = 2.5

/** Converts a (meters) ground distance to world x units. */
function ux(meters: number): number {
  return meters * WORLD
}

interface SceneParams {
  v: number
  target: number
  tolerance: number
}

interface FlightSceneProps extends SceneParams {
  /** Current aim angle from the input (degrees), used when idle. */
  displayAngle: number
  /** Phase the parent is driving. */
  phase: 'idle' | 'flying' | 'result'
  /** The angle actually in flight; changes per shot to reset the sim. */
  firedAngle: number
  /** Increments each time Fire is pressed, to (re)start the animation. */
  shotId: number
  /** Snap the camera instead of easing (reduced motion). */
  reducedMotion: boolean
  /** Called once the projectile reaches the ground. */
  onLanded: () => void
  /** Reports the farthest downrange distance (m) reached, for test hooks. */
  onFollowDistance: (meters: number) => void
}

/** Muzzle tip position (world units) for a given aim angle. */
function muzzle(angleDeg: number): THREE.Vector3 {
  const a = THREE.MathUtils.degToRad(angleDeg)
  return new THREE.Vector3(Math.cos(a) * BARREL_LEN, Math.sin(a) * BARREL_LEN, 0)
}

// Shared sun direction so the sky, key light, and water glint agree.
const SUN: [number, number, number] = [-70, 48, 96]

/**
 * The seaside fort the cannon defends: a stone rampart at the shore with
 * crenellations, a stone gun platform, and a grassy headland behind it.
 */
function Fort() {
  const merlons = useMemo(() => {
    const xs: number[] = []
    for (let z = -16; z <= 16; z += 4) xs.push(z)
    return xs
  }, [])
  return (
    <group>
      {/* Grassy headland (near side / land). Polygon offset keeps it firmly in
          front of the coplanar sea so the shoreline doesn't z-fight. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-994, 0.05, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial
          color="#3c9446"
          roughness={1}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>

      {/* Foam line where the headland meets the sea. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.5, 0.14, 0]}>
        <planeGeometry args={[2.4, 2000]} />
        <meshBasicMaterial
          color="#eaf6ff"
          transparent
          opacity={0.55}
          polygonOffset
          polygonOffsetFactor={-6}
          polygonOffsetUnits={-6}
        />
      </mesh>

      {/* Stone gun platform under the cannon. */}
      <mesh position={[-2, -0.5, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[12, 13, 1.2, 32]} />
        <meshStandardMaterial color="#9c958a" roughness={0.95} />
      </mesh>

      {/* Seaward rampart wall. */}
      <mesh position={[6, 1.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 3.4, 38]} />
        <meshStandardMaterial color="#8a8276" roughness={0.95} />
      </mesh>
      {merlons.map((z) => (
        <mesh key={z} position={[6, 3.7, z]} castShadow>
          <boxGeometry args={[2.4, 1.6, 2.2]} />
          <meshStandardMaterial color="#7c7468" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

/** A weathered pirate ship — the target — bobbing at anchor on the swell. */
function PirateShip({ x, animate }: { x: number; animate: boolean }) {
  return (
    <Float
      speed={animate ? 1.3 : 0}
      rotationIntensity={animate ? 0.18 : 0}
      floatIntensity={animate ? 0.7 : 0}
    >
      <group position={[x, 0.4, 0]}>
        {/* Hull (long axis across the firing line, broadside to the fort). */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <boxGeometry args={[3.4, 2.2, 11]} />
          <meshStandardMaterial color="#5b3a1d" roughness={0.85} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow>
          <boxGeometry args={[3.7, 0.5, 11.4]} />
          <meshStandardMaterial color="#3f2713" roughness={0.85} />
        </mesh>
        {/* Bow + stern caps for a boat-like silhouette. */}
        <mesh position={[0, 0.6, 6]} rotation={[Math.PI / 4, 0, 0]} castShadow>
          <boxGeometry args={[3.4, 2, 2.2]} />
          <meshStandardMaterial color="#5b3a1d" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.6, -6]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
          <boxGeometry args={[3.4, 2, 2.2]} />
          <meshStandardMaterial color="#5b3a1d" roughness={0.85} />
        </mesh>
        {/* Mast + sail. */}
        <mesh position={[0, 7, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 12, 12]} />
          <meshStandardMaterial color="#3b2614" roughness={0.8} />
        </mesh>
        <mesh position={[0, 8, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[8, 6.5]} />
          <meshStandardMaterial color="#efe6d0" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* Black flag. */}
        <mesh position={[0.9, 12.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 1]} />
          <meshStandardMaterial color="#15110d" side={THREE.DoubleSide} />
        </mesh>
      </group>
    </Float>
  )
}

/** A small navigation buoy + flat range label, marking distance downrange. */
function Buoy({ x, label, animate }: { x: number; label: string; animate: boolean }) {
  return (
    <group position={[x, 0, 9]}>
      <Float speed={animate ? 1.6 : 0} rotationIntensity={0} floatIntensity={animate ? 0.6 : 0}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 1.8, 12]} />
          <meshStandardMaterial color="#d8443b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
        </mesh>
      </Float>
      <Text
        position={[0, 0.3, 5]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={2.4}
        color="#eaf6ff"
        outlineWidth={0.08}
        outlineColor="#0b3550"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

/** Expanding foam ring where a shot splashes down. Remounts per shot. */
function Splash({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  useFrame((_, d) => {
    t.current += d
    const p = Math.min(t.current / 1.2, 1)
    const s = 1 + p * 9
    ref.current?.scale.set(s, s, s)
    if (matRef.current) matRef.current.opacity = (1 - p) * 0.7
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.18, 0]}>
      <ringGeometry args={[1.1, 1.7, 40]} />
      <meshBasicMaterial
        ref={matRef}
        color="#eaf8ff"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

/**
 * The R3F scene: ground, cannon, target zone, projectile, and a smoothed
 * (frame-rate-independent damped) chase camera that follows the ball in flight
 * and eases back to the aiming view otherwise.
 */
function FlightScene({
  v,
  target,
  tolerance,
  displayAngle,
  phase,
  firedAngle,
  shotId,
  reducedMotion,
  onLanded,
  onFollowDistance,
}: FlightSceneProps) {
  const { camera } = useThree()
  const ballRef = useRef<THREE.Mesh>(null)
  const simT = useRef(0)
  const landed = useRef(false)
  const lookAt = useRef(new THREE.Vector3(ux(target) * 0.55, 0, 0))

  // Latest dynamic values read inside the frame loop (avoid stale closures).
  const phaseRef = useRef(phase)
  const firedRef = useRef(firedAngle)
  const displayRef = useRef(displayAngle)
  useEffect(() => {
    phaseRef.current = phase
    firedRef.current = firedAngle
    displayRef.current = displayAngle
  }, [phase, firedAngle, displayAngle])

  // Restart the sim clock whenever a new shot begins.
  useEffect(() => {
    if (phase === 'flying') {
      simT.current = 0
      landed.current = false
    }
  }, [phase, shotId])

  // Frame the whole field: cannon (x≈0) on the left, target zone (x≈ux(target))
  // on the right, both comfortably inside the view.
  const idleCam = useMemo(
    () => new THREE.Vector3(-28, 40, 64),
    [],
  )
  const idleLook = useMemo(
    () => new THREE.Vector3(ux(target) * 0.62, 0, 0),
    [target],
  )

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3
    const alpha = 1 - Math.exp(-k * delta)

    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'flying' && !landed.current) {
      simT.current += delta * TIME_SCALE
      const angle = firedRef.current
      const flight = timeToReturn(v, angle)
      const t = Math.min(simT.current, flight)
      const p = positionAt(v, angle, t)
      const bx = ux(p.x)
      const by = Math.max(0, ux(p.y))
      ballRef.current?.position.set(bx, by + BALL_R, 0)
      onFollowDistance(p.x)
      desiredLook = new THREE.Vector3(bx, by, 0)
      desiredPos = new THREE.Vector3(bx - 40, by + 30, 46)
      if (simT.current >= flight) {
        landed.current = true
        onLanded()
      }
    } else if (phaseRef.current === 'result') {
      // Frame where the ball came to rest near the target zone, pulled back far
      // enough that the distance labels read at roughly the idle scale.
      const restX = ux(evaluateShot(v, firedRef.current, target, tolerance).distance)
      desiredLook = new THREE.Vector3(restX, 0, 0)
      desiredPos = new THREE.Vector3(restX - 56, 30, 52)
    } else {
      // Idle: keep the ball at the muzzle and frame the field + target.
      const m = muzzle(displayRef.current)
      ballRef.current?.position.set(m.x, m.y, 0)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    camera.position.lerp(desiredPos, alpha)
    lookAt.current.lerp(desiredLook, alpha)
    camera.lookAt(lookAt.current)
  })

  const shipX = ux(target)
  const animate = !reducedMotion
  // Range buoys, skipping the one the pirate ship sits on.
  const markers = useMemo(
    () => [100, 200, 300, 400, 600].filter((m) => m !== target),
    [target],
  )
  const splashX = ux(evaluateShot(v, firedAngle, target, tolerance).distance)

  return (
    <>
      <Sky sunPosition={SUN} turbidity={3} rayleigh={2.4} mieCoefficient={0.004} mieDirectionalG={0.85} />
      <fog attach="fog" args={['#bfe0f0', 300, 1000]} />

      <hemisphereLight args={['#dff0ff', '#2f6b39', 0.95]} />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={SUN}
        intensity={1.7}
        color="#fff6e6"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <Fort />

      {/* Open sea — reflective, oversized, and faded into haze by the fog so it
          has no visible edge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <MeshReflectorMaterial
          resolution={512}
          mirror={0.55}
          mixStrength={1.4}
          blur={[300, 90]}
          roughness={0.7}
          depthScale={1.1}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.2}
          color="#2e88c4"
          metalness={0.5}
        />
      </mesh>

      {/* Sun glints / sea spray over the play area. */}
      <Sparkles
        count={70}
        scale={[ux(target) * 1.8, 8, 70]}
        position={[ux(target) * 0.7, 2.5, 0]}
        size={3}
        speed={animate ? 0.35 : 0}
        color="#ffffff"
        opacity={0.55}
      />

      {/* Range buoys with flat water labels. */}
      {markers.map((m) => (
        <Buoy key={m} x={ux(m)} label={`${m} m`} animate={animate} />
      ))}

      {/* The pirate ship (target) and its label. */}
      <PirateShip x={shipX} animate={animate} />
      <Text
        position={[shipX, 16, 0]}
        fontSize={3.4}
        color="#fde047"
        outlineWidth={0.1}
        outlineColor="#3a2a05"
        anchorX="center"
        anchorY="middle"
      >
        {`Pirate ship · ${target} m`}
      </Text>

      {/* Cannon: wooden carriage + iron barrel aimed at the chosen angle. */}
      <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[2.4, 2.6, 2.2, 24]} />
        <meshStandardMaterial color="#6b4a26" roughness={0.8} />
      </mesh>
      <group
        rotation={[0, 0, THREE.MathUtils.degToRad(displayAngle)]}
        position={[0, 1.6, 0]}
      >
        <mesh position={[BARREL_LEN / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.2, 1.45, BARREL_LEN, 20]} />
          <meshStandardMaterial color="#23272e" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh position={[BARREL_LEN, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.35, 1.35, 0.7, 20]} />
          <meshStandardMaterial color="#16191e" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* Cannonball — only mounted once fired (hidden at rest to avoid clipping
          into the barrel). */}
      {phase !== 'idle' && (
        <mesh ref={ballRef} position={[0, BALL_R, 0]} castShadow>
          <sphereGeometry args={[BALL_R, 24, 24]} />
          <meshStandardMaterial
            color="#14181f"
            metalness={0.7}
            roughness={0.3}
            emissive="#b45309"
            emissiveIntensity={0.18}
          />
        </mesh>
      )}

      {/* Splashdown ring on the water. */}
      {phase === 'result' && <Splash key={shotId} x={splashX} />}
    </>
  )
}

/** True when the browser can create a WebGL context. */
function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

const STATUS_TEXT: Record<ShotStatus, string> = {
  short: 'Splash! The ball fell short of the ship.',
  hit: 'Direct hit — the pirate ship is sunk!',
  far: 'Overshot — the ball sailed clear past them.',
}

/**
 * Capstone mini-game for the 2D projectile lesson, themed as a seaside fort
 * defending against a pirate ship. The cannon's bearing is already locked onto
 * the ship; the learner sets the launch angle so the shot lands on the ship at
 * the target range. An immersive smoothed chase camera follows each shot.
 * Unlimited attempts; the first successful shot completes the step. Falls back
 * to a text-only mode (still completable) when WebGL is unavailable.
 *
 * @param props.step Provides `params.v`, `params.target`, `params.tolerance`.
 */
export default function CannonGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const v = step.params?.v ?? 80
  const target = step.params?.target ?? 500
  const tolerance = step.params?.tolerance ?? 5
  const { animationsEnabled } = useMotionPreference()

  const [webglOk] = useState(detectWebGL)
  const [angleText, setAngleText] = useState('')
  const [displayAngle, setDisplayAngle] = useState(45)
  const [firedAngle, setFiredAngle] = useState(45)
  const [phase, setPhase] = useState<'idle' | 'flying' | 'result'>('idle')
  const [status, setStatus] = useState<ShotStatus | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [shotId, setShotId] = useState(0)

  const submitted = useRef(answered)
  const maxFollowed = useRef(0)
  // Eases the camera back to the aiming view a beat after a shot resolves.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }
  }, [])

  /** Records the outcome to a dev-only window hook for browser/MCP tests. */
  function publishHook(angle: number, dist: number, st: ShotStatus) {
    if (!import.meta.env.DEV) return
    ;(window as unknown as Record<string, unknown>).__cannon = {
      angle,
      landingDistance: dist,
      status: st,
      target,
      tolerance,
      maxBallDistanceFollowed: maxFollowed.current,
    }
  }

  /** Settles a shot: classify, reveal result, and complete on first success. */
  function settle(angle: number) {
    const result = evaluateShot(v, angle, target, tolerance)
    setDistance(result.distance)
    setStatus(result.status)
    publishHook(angle, result.distance, result.status)
    if (result.status === 'hit' && !submitted.current) {
      submitted.current = true
      onSubmit([target])
    }
  }

  function parseAngle(): number | null {
    const n = Number(angleText)
    if (!Number.isFinite(n) || n < 0 || n > 90) return null
    return Math.round(n)
  }

  /** Fire at the entered angle. */
  function handleFire() {
    const angle = parseAngle()
    if (angle === null) return
    if (idleTimer.current) {
      clearTimeout(idleTimer.current)
      idleTimer.current = null
    }
    maxFollowed.current = 0
    setDisplayAngle(angle)
    setFiredAngle(angle)
    setStatus(null)
    setDistance(null)
    if (webglOk) {
      setPhase('flying')
      setShotId((id) => id + 1)
    } else {
      // Text-only fallback: no animation, settle immediately.
      setPhase('result')
      settle(angle)
    }
  }

  /** Updates the typed angle and, while idle, the live cannon aim. */
  function handleAngleChange(text: string) {
    setAngleText(text)
    if (phase !== 'flying') {
      const n = Number(text)
      if (Number.isFinite(n) && n >= 0 && n <= 90) setDisplayAngle(Math.round(n))
    }
  }

  const banner = (() => {
    if (phase === 'flying') return { text: 'Firing…', tone: 'firing' as const }
    if (status)
      return {
        text: STATUS_TEXT[status],
        tone: status === 'hit' ? ('hit' as const) : ('miss' as const),
      }
    if (answered) return { text: 'Ship sunk — the fort is safe!', tone: 'hit' as const }
    return { text: 'Set the cannon angle and fire on the ship!', tone: 'idle' as const }
  })()

  const bannerClass =
    banner.tone === 'hit'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
      : banner.tone === 'miss'
        ? 'bg-amber-100 text-amber-800 border-amber-300'
        : 'bg-slate-100 text-slate-700 border-slate-200'

  const canFire = parseAngle() !== null && phase !== 'flying'

  return (
    <div className="min-w-0 space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <p className="text-sm leading-relaxed text-slate-700">
          Final challenge: defend your fort! A pirate ship is anchored{' '}
          <span className="font-semibold text-emerald-700">{target} m</span> offshore.
          Your cannon is already trained on its bearing and fires every shot at{' '}
          <span className="font-semibold text-slate-900">v = {v} m/s</span>. Set the
          launch <span className="font-semibold">angle</span> so the ball lands on
          the ship (within {tolerance} m). You can solve this with the projectile
          math you already know — range depends only on the speed and angle.
        </p>
      </div>

      <div
        className={`rounded-xl border px-3 py-2 text-center text-base font-semibold ${bannerClass}`}
        role="status"
        aria-live="polite"
      >
        {banner.text}
        {distance !== null && phase !== 'flying' && (
          <span className="ml-1 font-medium">
            {' '}
            Splashed down at <span className="num">{distance.toFixed(1)}</span> m.
          </span>
        )}
      </div>

      {webglOk ? (
        <div className="h-72 w-full overflow-hidden rounded-xl border border-slate-200 sm:h-80">
          <Canvas
            camera={{ position: [-24, 34, 52], fov: 50, near: 1, far: 2200 }}
            dpr={[1, 2]}
            performance={{ min: 0.5 }}
          >
            <color attach="background" args={['#cfe8ff']} />
            <FlightScene
              v={v}
              target={target}
              tolerance={tolerance}
              displayAngle={displayAngle}
              phase={phase}
              firedAngle={firedAngle}
              shotId={shotId}
              reducedMotion={!animationsEnabled}
              onLanded={() => {
                setPhase('result')
                settle(firedAngle)
                // Linger on the landing, then ease back to the aiming view so
                // the learner can re-aim and fire again.
                idleTimer.current = setTimeout(() => setPhase('idle'), 1800)
              }}
              onFollowDistance={(m) => {
                if (m > maxFollowed.current) maxFollowed.current = m
              }}
            />
          </Canvas>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          3D view is unavailable on this device, so the battle is shown as text.
          Enter an angle and fire — your shot is still scored against the pirate ship
          at {target} m.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm font-semibold text-slate-700">
          Launch angle (degrees)
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            step={1}
            value={angleText}
            onChange={(e) => handleAngleChange(e.target.value)}
            placeholder="0–90"
            className="mt-1 w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </label>
        <button
          type="button"
          onClick={handleFire}
          disabled={!canFire}
          className="btn-primary min-h-11"
        >
          {phase === 'flying' ? 'Firing…' : 'Fire'}
        </button>
      </div>
    </div>
  )
}
