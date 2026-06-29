import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { evaluateHeel } from '../../lib/heelGame'
import { dampVec3, NavalEnvironment, NavalGameShell, VectorArrow } from './naval'
import type { NavalSceneProps } from './naval'

const ACT_DURATION = 2
const KEG_RADIUS = 0.42
const ARROW_SCALE = 3.2
const PREVIEW_DEG = 12
// A clean, flat deck section (top surface height) the whole scene sits on, so
// the inclined ramp + keg + two crew read clearly without a whole ship in the
// way. The ramp's low (cannon) end pivots here; it rises toward −z.
const DECK_TOP = 0.6
const PIVOT_Z = 0.4
// One fixed 3/4 camera for every phase: angled from the front-left-above so the
// ramp's tilt is clear AND the barrel (which rolls about its cross-slope axis)
// is seen on its side showing its staves, with both crew in view.
const CAMERA_POS = new THREE.Vector3(-8, 4.8, 4.5)
const CAMERA_LOOK = new THREE.Vector3(0.3, 1, -2.2)

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

/** Thin wooden loading ramp along local −z; pivot is at local origin (cannon end). */
function RampPlank({ length }: { length: number }) {
  return (
    <group>
      <mesh position={[0, 0, -length / 2]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.14, length]} />
        <meshStandardMaterial color="#a0732a" roughness={0.85} />
      </mesh>
      <mesh position={[-0.62, 0.22, -length / 2]} castShadow>
        <boxGeometry args={[0.12, 0.28, length]} />
        <meshStandardMaterial color="#6b4a1e" roughness={0.9} />
      </mesh>
      <mesh position={[0.62, 0.22, -length / 2]} castShadow>
        <boxGeometry args={[0.12, 0.28, length]} />
        <meshStandardMaterial color="#6b4a1e" roughness={0.9} />
      </mesh>
    </group>
  )
}

/** A powder keg: a staved wooden barrel (bulged middle, tapered ends, iron
 *  hoops), laid on its side so it rolls down the ramp across the slope. */
function Barrel() {
  const R = KEG_RADIUS
  const H = KEG_RADIUS * 1.8
  const wood = '#7a4f22'
  const hoop = '#241a10'
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[R, R, H * 0.5, 18]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      <mesh position={[0, H * 0.375, 0]} castShadow>
        <cylinderGeometry args={[R * 0.8, R, H * 0.25, 18]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      <mesh position={[0, -H * 0.375, 0]} castShadow>
        <cylinderGeometry args={[R, R * 0.8, H * 0.25, 18]} />
        <meshStandardMaterial color={wood} roughness={0.85} />
      </mesh>
      {[-H * 0.3, 0, H * 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[R * 1.04, R * 1.04, H * 0.07, 18]} />
          <meshStandardMaterial color={hoop} metalness={0.4} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

/** A simple deckhand: a capsule body with a head, standing on the deck. */
function Crew({
  position,
  shirt,
  facing = 0,
}: {
  position: [number, number, number]
  shirt: string
  facing?: number
}) {
  return (
    <group position={position} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.78, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.86, 4, 8]} />
        <meshStandardMaterial color={shirt} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#d9b48a" roughness={0.85} />
      </mesh>
    </group>
  )
}

/** Deck gun on its carriage at the bottom (catch) end, barrel out over the rail. */
function DeckCannon() {
  return (
    <group>
      <mesh position={[0, 0.28, 0]} castShadow>
        <boxGeometry args={[0.7, 0.4, 0.95]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.5, 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 14]} />
        <meshStandardMaterial color="#1f2329" metalness={0.7} roughness={0.4} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.16, -0.28]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.12, 12]} />
          <meshStandardMaterial color="#46301a" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

interface HeelDeckSceneParams {
  length: number
}

function HeelDeckScene({
  length,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: HeelDeckSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(CAMERA_LOOK.clone())
  const simT = useRef(0)
  const done = useRef(false)
  const rampRef = useRef<THREE.Group>(null)
  const kegRef = useRef<THREE.Group>(null)

  const phaseRef = useRef(phase)
  const inputRef = useRef(committedInput)
  useEffect(() => {
    phaseRef.current = phase
    inputRef.current = committedInput
  }, [phase, committedInput])

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      done.current = false
    }
  }, [phase, shotId])

  const animate = !reducedMotion
  const rampLen = length

  /** Places the keg along the plank (t in [0,1] maps raised end → cannon) and
   *  rolls it about its axis so it visibly tumbles down the ramp. */
  function setKeg(t: number) {
    const z = -rampLen * (1 - t)
    kegRef.current?.position.set(0, KEG_RADIUS + 0.12, z)
    if (kegRef.current) kegRef.current.rotation.x = z / KEG_RADIUS
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 4

    let rampDeg: number
    let t: number

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const progress = Math.min(simT.current / ACT_DURATION, 1)
      const eased = easeOutCubic(progress)
      rampDeg = inputRef.current
      t = eased
      onProgress((inputRef.current === 0 ? 0 : 1) * progress * 5)
      if (progress >= 1 && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      rampDeg = inputRef.current
      t = 1
    } else {
      rampDeg = PREVIEW_DEG
      t = 0
    }

    rampRef.current?.rotation.set(THREE.MathUtils.degToRad(rampDeg), 0, 0)
    setKeg(t)

    dampVec3(camera.position, CAMERA_POS, k, delta)
    dampVec3(lookAt.current, CAMERA_LOOK, k, delta)
    camera.lookAt(lookAt.current)
  })

  const thetaRad = THREE.MathUtils.degToRad(
    phase === 'idle' ? PREVIEW_DEG : committedInput,
  )
  const sinLen = Math.max(0.5, Math.sin(thetaRad) * ARROW_SCALE)
  const cosLen = Math.max(0.5, Math.cos(thetaRad) * ARROW_SCALE)
  // Ground spot under the raised (top) end, where the loader stands.
  const loaderZ = -rampLen * Math.cos(thetaRad) - 0.6

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      {/* Flat deck section — a clear stage for the reload, instead of a whole ship. */}
      <mesh position={[0, DECK_TOP - 0.25, -2]} receiveShadow castShadow>
        <boxGeometry args={[15, 0.5, 13]} />
        <meshStandardMaterial color="#6b4a26" roughness={0.92} />
      </mesh>
      {[-5, -3, -1, 1, 3].map((z) => (
        <mesh
          key={z}
          position={[0, DECK_TOP + 0.001, z - 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[15, 0.05]} />
          <meshStandardMaterial color="#4a3219" />
        </mesh>
      ))}
      {/* Bulwarks: tall walls on the far side and both ends, plus a low rail on
          the near (camera) side, so the platform clearly reads as a ship's deck. */}
      <mesh position={[7.35, DECK_TOP + 0.45, -2]} castShadow>
        <boxGeometry args={[0.3, 1.4, 13]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>
      <mesh position={[0, DECK_TOP + 0.4, 4.35]} castShadow>
        <boxGeometry args={[15, 1.3, 0.3]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>
      <mesh position={[0, DECK_TOP + 0.4, -8.35]} castShadow>
        <boxGeometry args={[15, 1.3, 0.3]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>
      <mesh position={[-7.35, DECK_TOP + 0.05, -2]} castShadow>
        <boxGeometry args={[0.3, 0.5, 13]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>

      {/* Deck gun + gun crew at the bottom (catch) end. */}
      <group position={[0, DECK_TOP, PIVOT_Z + 0.7]}>
        <DeckCannon />
      </group>
      <Crew position={[1.2, DECK_TOP, PIVOT_Z + 0.5]} shirt="#1e3a5f" facing={-Math.PI / 2} />
      <Billboard position={[1.2, DECK_TOP + 2.2, PIVOT_Z + 0.5]}>
        <Text
          fontSize={0.5}
          color="#fde047"
          outlineWidth={0.03}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          Gun crew
        </Text>
      </Billboard>

      {/* The loader stands at the raised end and releases the keg. */}
      <Crew position={[0.95, DECK_TOP, loaderZ]} shirt="#7c2d12" facing={Math.PI} />
      <Billboard position={[0.95, DECK_TOP + 2.2, loaderZ]}>
        <Text
          fontSize={0.5}
          color="#fde047"
          outlineWidth={0.03}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          Loader
        </Text>
      </Billboard>

      {/* Loading ramp: pivots at the cannon (low) end and tilts up toward the loader. */}
      <group ref={rampRef} position={[0, DECK_TOP + 0.08, PIVOT_Z]}>
        <RampPlank length={rampLen} />

        <group ref={kegRef}>
          <Barrel />
        </group>

        {phase !== 'idle' && (
          <group position={[0, KEG_RADIUS + 0.4, -rampLen * 0.42]}>
            <VectorArrow
              origin={[0, 0, 0]}
              dir={[0, 0, 1]}
              length={sinLen}
              color="#fbbf24"
              label="mg·sinθ"
            />
            <VectorArrow
              origin={[0, 0, 0]}
              dir={[0, -1, 0]}
              length={cosLen}
              color="#60a5fa"
              label="mg·cosθ"
            />
          </group>
        )}
      </group>
    </>
  )
}

export default function HeelDeckGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const length = step.params?.length ?? 5
  const target = step.params?.target ?? 7
  const tolerance = step.params?.tolerance ?? 0.4

  const idleText = `On deck, a loader rolls a powder keg down a tilted ramp to the gun crew. The keg rolls L = ${length} m down the ramp; the crew can safely catch it at v = ${target} m/s. Set the ramp angle θ so it arrives at the right speed.`

  return (
    <NavalGameShell
      hookKey="heelDeck"
      intro={idleText}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Ramp angle θ (degrees)"
      actionLabel="Set & release"
      busyLabel="Rolling…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= 0 && n <= 90 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateHeel(input, length, target, tolerance)}
      statusText={{
        idle: idleText,
        acting: 'Rolling…',
        hit: 'Just right — the keg reaches the gun crew at the perfect speed to reload!',
        short: 'Too shallow — the keg stalls before it reaches the crew.',
        far: 'Too steep — the keg slams in too fast and breaks apart.',
      }}
      resultSuffix={(r) => `Keg reaches the gun crew at ${r.value.toFixed(1)} m/s.`}
      cameraInit={[-8, 4.8, 4.5]}
      renderScene={(sceneProps) => (
        <HeelDeckScene length={length} {...sceneProps} />
      )}
    />
  )
}
