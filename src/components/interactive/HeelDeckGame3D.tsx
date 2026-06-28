import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { evaluateHeel } from '../../lib/heelGame'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
  VectorArrow,
  SHIP_DECK_Y,
} from './naval'
import type { NavalSceneProps } from './naval'

const ACT_DURATION = 2
const KEG_RADIUS = 0.42
const ARROW_SCALE = 3.2
const PREVIEW_DEG = 12
// Starboard-side pivot on the main deck (cannon end, bow-ward).
const PIVOT_X = 0.9
const PIVOT_Y = SHIP_DECK_Y + 0.1
const PIVOT_Z = 2.2
const IDLE_CAMERA = new THREE.Vector3(-11, 10, 18)
const IDLE_LOOK_AT = new THREE.Vector3(0, SHIP_DECK_Y + 1.5, 0)
const RELOAD_CAMERA = new THREE.Vector3(-2.4, SHIP_DECK_Y + 1.85, PIVOT_Z + 3.6)
const RELOAD_LOOK_AT = new THREE.Vector3(PIVOT_X, SHIP_DECK_Y + 0.3, PIVOT_Z - 1.4)

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function isReloadPhase(phase: NavalSceneProps['phase']): boolean {
  return phase === 'acting' || phase === 'result'
}

/** Thin wooden gangplank along local −z; pivot is at local origin (cannon end). */
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

/** Deck cannon + gun crew at the pivot (low) end, aimed out over the starboard rail. */
function GunCrewTarget() {
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <mesh position={[0, 0.28, 0.55]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.65, 12]} />
        <meshStandardMaterial color="#46301a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, -0.55]} castShadow>
        <cylinderGeometry args={[0.32, 0.36, 0.65, 12]} />
        <meshStandardMaterial color="#46301a" roughness={0.9} />
      </mesh>
      <mesh position={[0.55, 0.22, 0]} castShadow>
        <boxGeometry args={[0.85, 0.45, 1]} />
        <meshStandardMaterial color="#5c4326" roughness={0.9} />
      </mesh>
      <mesh position={[1.05, 0.38, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.26, 0.32, 1.4, 14]} />
        <meshStandardMaterial color="#1f2329" metalness={0.7} roughness={0.4} />
      </mesh>
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
  const lookAt = useRef(IDLE_LOOK_AT.clone())
  const simT = useRef(0)
  const done = useRef(false)
  const rampRef = useRef<THREE.Group>(null)
  const kegRef = useRef<THREE.Mesh>(null)

  const phaseRef = useRef(phase)
  const inputRef = useRef(committedInput)
  phaseRef.current = phase
  inputRef.current = committedInput

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      done.current = false
    }
  }, [phase, shotId])

  const animate = !reducedMotion
  const rampLen = length

  /** Places the keg along the plank: t in [0,1] maps raised end → cannon. */
  function setKeg(t: number) {
    kegRef.current?.position.set(0, KEG_RADIUS + 0.08, -rampLen * (1 - t))
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const zoomed = isReloadPhase(phaseRef.current)
    const k = reducedMotion ? 40 : zoomed ? 6 : 3

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

    const desiredPos = zoomed ? RELOAD_CAMERA : IDLE_CAMERA
    const desiredLook = zoomed ? RELOAD_LOOK_AT : IDLE_LOOK_AT

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const thetaRad = THREE.MathUtils.degToRad(
    phase === 'idle' ? PREVIEW_DEG : committedInput,
  )
  const sinLen = Math.max(0.5, Math.sin(thetaRad) * ARROW_SCALE)
  const cosLen = Math.max(0.5, Math.cos(thetaRad) * ARROW_SCALE)

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      <Ship position={[0, 0, 0]} float={false} animate={animate} />

      {/* Gangplank pivots at the cannon end on the starboard main deck. */}
      <group ref={rampRef} position={[PIVOT_X, PIVOT_Y, PIVOT_Z]}>
        <RampPlank length={rampLen} />
        <GunCrewTarget />

        <mesh ref={kegRef} castShadow>
          <cylinderGeometry args={[KEG_RADIUS * 0.85, KEG_RADIUS, KEG_RADIUS * 1.6, 16]} />
          <meshStandardMaterial
            color="#46301a"
            roughness={0.85}
            emissive="#b45309"
            emissiveIntensity={0.22}
          />
        </mesh>

        {phase !== 'idle' && (
          <group position={[0, KEG_RADIUS + 0.35, -rampLen * 0.38]}>
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

        <Text
          position={[-0.6, 1.6, 0.4]}
          fontSize={0.55}
          color="#fde047"
          outlineWidth={0.03}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          Gun crew
        </Text>
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

  const idleText = `Set the loading ramp's tilt so a powder keg rolls down to the gun crew. The keg rolls L = ${length} m down the ramp; the crew can safely catch it at v = ${target} m/s. Enter the ramp angle θ.`

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
      cameraInit={[-11, 10, 18]}
      renderScene={(sceneProps) => (
        <HeelDeckScene length={length} {...sceneProps} />
      )}
    />
  )
}
