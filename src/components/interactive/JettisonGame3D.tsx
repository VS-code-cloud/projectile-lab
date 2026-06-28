import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { evaluateJettison, resultingAccel } from '../../lib/jettisonGame'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
  VectorArrow,
} from './naval'
import type { NavalSceneProps } from './naval'

const ACT_DURATION = 2.5
const ARROW_SCALE = 2.2

interface JettisonSceneParams {
  force: number
  ladenMass: number
}

interface CargoCrateProps {
  index: number
  animate: boolean
}

/** A single crate/barrel tumbling off the stern into the wake. */
function CargoCrate({ index, animate }: CargoCrateProps) {
  const ref = useRef<THREE.Group>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const t = useRef(0)
  const offset = useMemo(
    () => ({
      x: -4 - index * 1.2,
      z: (index % 2 === 0 ? -1 : 1) * (1.2 + (index % 3) * 0.4),
      spin: (index + 1) * 0.7,
    }),
    [index],
  )

  useFrame((_, delta) => {
    if (!animate) return
    t.current += delta
    const p = Math.min(t.current / 1.8, 1)
    ref.current?.position.set(
      offset.x - p * 6,
      1.8 - p * p * 5,
      offset.z + p * 2,
    )
    ref.current?.rotation.set(p * offset.spin * 3, p * 1.2, p * offset.spin * 2)
    if (matRef.current) matRef.current.opacity = 1 - p * 0.85
  })

  const isBarrel = index % 2 === 1
  return (
    <group ref={ref} position={[-5, 1.8, offset.z]}>
      {isBarrel ? (
        <mesh castShadow>
          <cylinderGeometry args={[0.55, 0.65, 1.4, 12]} />
          <meshStandardMaterial ref={matRef} color="#8b6914" roughness={0.85} transparent />
        </mesh>
      ) : (
        <mesh castShadow>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshStandardMaterial ref={matRef} color="#a16207" roughness={0.9} transparent />
        </mesh>
      )}
    </group>
  )
}

function JettisonScene({
  force,
  ladenMass,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: JettisonSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const simT = useRef(0)
  const done = useRef(false)
  const playerRef = useRef<THREE.Group>(null)
  const pursuerRef = useRef<THREE.Group>(null)

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
  const accel = resultingAccel(force, committedInput || ladenMass)
  const crateCount = Math.min(
    8,
    Math.max(0, Math.round((ladenMass - committedInput) / 100)),
  )

  const idleCam = useMemo(() => new THREE.Vector3(-24, 30, 52), [])
  const idleLook = useMemo(() => new THREE.Vector3(8, 0, 0), [])

  // Pursuer closes at the rate you'd have while still fully laden (too slow to escape).
  const pursuerApproach = resultingAccel(force, ladenMass)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3

    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const progress = Math.min(simT.current / ACT_DURATION, 1)
      const t = simT.current

      const playerX = 0.5 * accel * t * t * 0.35
      const pursuerX = -36 + pursuerApproach * t * t * 0.35 * 0.55
      playerRef.current?.position.set(playerX, 0.4, 0)
      pursuerRef.current?.position.set(pursuerX, 0.4, 0)

      const gap = playerX - pursuerX
      onProgress(gap)

      desiredLook = new THREE.Vector3(playerX + 6, 0, 0)
      desiredPos = new THREE.Vector3(playerX - 18, 26, 44)

      if (progress >= 1 && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const t = ACT_DURATION
      const playerX = 0.5 * accel * t * t * 0.35
      const pursuerX = -36 + pursuerApproach * t * t * 0.35 * 0.55
      playerRef.current?.position.set(playerX, 0.4, 0)
      pursuerRef.current?.position.set(pursuerX, 0.4, 0)
      desiredLook = new THREE.Vector3(playerX + 6, 0, 0)
      desiredPos = new THREE.Vector3(playerX - 18, 26, 44)
    } else {
      playerRef.current?.position.set(0, 0.4, 0)
      pursuerRef.current?.position.set(-36, 0.4, 0)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const arrowLen = Math.max(2, accel * ARROW_SCALE)
  const showCrates = phase === 'acting' && crateCount > 0

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      <group ref={pursuerRef} position={[-36, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#3d2b1f"
          sailColor="#d4cfc4"
          flag
          float
          animate={animate}
        />
      </group>

      <group ref={playerRef} position={[0, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          flag={false}
          float
          animate={animate}
        />
        <VectorArrow
          origin={[0, 6, 0]}
          dir={[1, 0.15, 0]}
          length={arrowLen}
          color="#fbbf24"
          label={`a = ${accel.toFixed(1)} m/s²`}
        />
        {showCrates &&
          Array.from({ length: crateCount }, (_, i) => (
            <CargoCrate key={`${shotId}-${i}`} index={i} animate={animate} />
          ))}
      </group>
    </>
  )
}

export default function JettisonGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const force = step.params?.force ?? 4000
  const accelReq = step.params?.accelReq ?? 5
  const ladenMass = step.params?.ladenMass ?? 1200
  const target = step.params?.target ?? 800
  const tolerance = step.params?.tolerance ?? 40

  const idleText = `A navy ship is catching up to you. Your sails push with a steady F = ${force} N, but loaded at ${ladenMass} kg you're too slow. Enter the mass to KEEP so you reach the escape acceleration a = ${accelReq} m/s² — the rest goes overboard.`

  return (
    <NavalGameShell
      hookKey="jettison"
      intro={idleText}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Mass to keep (kg)"
      actionLabel="Throw cargo"
      busyLabel="Lightening…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n > 0 && n <= ladenMass ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateJettison(input, force, accelReq, tolerance)}
      statusText={{
        idle: idleText,
        acting: 'Lightening…',
        hit: 'Light enough — you speed away with the most gold still aboard!',
        short: "You threw away cargo you didn't need to.",
        far: 'Still too heavy — the navy ship catches you.',
      }}
      resultSuffix={(r) =>
        `Kept ${r.value} kg → a = ${(force / r.value).toFixed(2)} m/s².`
      }
      cameraInit={[-24, 30, 52]}
      renderScene={(sceneProps) => (
        <JettisonScene force={force} ladenMass={ladenMass} {...sceneProps} />
      )}
    />
  )
}
