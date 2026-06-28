import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import {
  centripetalAccel,
  evaluateOrbit,
} from '../../lib/maelstromGame'
import type { BandStatus } from '../../lib/navalChallenge'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
  VectorArrow,
} from './naval'
import type { NavalSceneProps } from './naval'

const SCALE = 3
const ORBIT_LAPS = 1.5
const ARROW_SCALE = 0.22
const OUTCOME_DURATION = 1.4

interface MaelstromSceneParams {
  radius: number
  target: number
  tolerance: number
}

/** Spinning rings of foam arcs; each arc gets its own heading offset. */
function FoamBands({
  count,
  baseR,
  step,
  tube,
  y,
}: {
  count: number
  baseR: number
  step: number
  tube: number
  y: number
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} rotation={[0, i * 1.7, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
            <torusGeometry args={[baseR - i * step, tube, 8, 72, Math.PI * 1.5]} />
            <meshStandardMaterial
              color="#eaf7ff"
              transparent
              opacity={0.55 - i * 0.1}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}
    </>
  )
}

/**
 * A top-down whirlpool: concentric discs darkening toward the eye (reading as
 * depth on the opaque sea) overlaid with two counter-spinning sets of foam arcs.
 */
function Whirlpool({ animate }: { animate: boolean }) {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)

  useFrame((_, d) => {
    if (!animate) return
    if (outer.current) outer.current.rotation.y -= d * 0.7
    if (inner.current) inner.current.rotation.y -= d * 1.5
  })

  const eye: Array<[string, number]> = [
    ['#1b5878', 13],
    ['#123f59', 9.3],
    ['#0c2f44', 6],
    ['#061f2d', 3],
  ]

  return (
    <group position={[0, 0.06, 0]}>
      {eye.map(([color, r], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01 * i, 0]}>
          <circleGeometry args={[r, 64]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      <group ref={outer}>
        <FoamBands count={3} baseR={12.2} step={2.1} tube={0.26} y={0.06} />
      </group>
      <group ref={inner}>
        <FoamBands count={2} baseR={5.6} step={1.9} tube={0.18} y={0.07} />
      </group>
    </group>
  )
}

function MaelstromScene({
  radius,
  target,
  tolerance,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: MaelstromSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3())
  const simT = useRef(0)
  const done = useRef(false)
  const angle = useRef(0)
  const outcomeT = useRef(0)
  const orbitDone = useRef(false)
  const shipRef = useRef<THREE.Group>(null)
  const shipPos = useRef(new THREE.Vector3())
  // Direction the ship flings free on a clean orbit (+x).
  const exitAngle = 0

  const worldR = SCALE * radius
  const totalOrbit = ORBIT_LAPS * Math.PI * 2
  const animate = !reducedMotion

  const phaseRef = useRef(phase)
  const inputRef = useRef(committedInput)
  useEffect(() => {
    phaseRef.current = phase
    inputRef.current = committedInput
  }, [phase, committedInput])

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      angle.current = 0
      outcomeT.current = 0
      orbitDone.current = false
      done.current = false
    }
  }, [phase, shotId])

  const idleCam = useMemo(() => new THREE.Vector3(0, 38, 46), [])
  const idleLook = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  function orbitStatus(v: number): BandStatus {
    return evaluateOrbit(v, radius, target, tolerance).status
  }

  function placeOnOrbit(theta: number, r: number) {
    shipPos.current.set(Math.cos(theta) * r, 0.4, Math.sin(theta) * r)
    shipRef.current?.position.copy(shipPos.current)
    const heading = -theta + Math.PI / 2
    shipRef.current?.rotation.set(0, heading, 0)
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3
    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const v = inputRef.current
      const a = centripetalAccel(v, radius)
      onProgress(a)

      if (!orbitDone.current) {
        angle.current += (v / radius) * delta
        const theta = angle.current
        placeOnOrbit(theta, worldR)

        if (angle.current >= totalOrbit) {
          orbitDone.current = true
          outcomeT.current = 0
        }
      } else {
        outcomeT.current += delta
        const p = Math.min(outcomeT.current / OUTCOME_DURATION, 1)
        const theta = angle.current
        const status = orbitStatus(v)
        const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
        const inward = new THREE.Vector3(-Math.cos(theta), 0, -Math.sin(theta))

        if (status === 'hit') {
          const start = new THREE.Vector3(
            Math.cos(theta) * worldR,
            0.4,
            Math.sin(theta) * worldR,
          )
          shipPos.current.copy(start).addScaledVector(tangent, p * worldR * 1.6)
        } else if (status === 'short') {
          const r = worldR * (1 - p * 0.85)
          placeOnOrbit(theta + p * 0.6, r)
        } else {
          const start = new THREE.Vector3(
            Math.cos(theta) * worldR,
            0.4,
            Math.sin(theta) * worldR,
          )
          shipPos.current
            .copy(start)
            .addScaledVector(tangent, p * worldR * 0.5)
            .addScaledVector(inward, -p * worldR * 0.55)
        }

        shipRef.current?.position.copy(shipPos.current)

        if (outcomeT.current >= OUTCOME_DURATION && !done.current) {
          done.current = true
          onSettled()
        }
      }

      desiredLook = shipPos.current.clone()
      desiredPos = new THREE.Vector3(
        shipPos.current.x * 0.35,
        34,
        shipPos.current.z * 0.35 + 38,
      )
    } else if (phaseRef.current === 'result') {
      const v = inputRef.current
      const theta = angle.current || exitAngle
      const status = orbitStatus(v)
      if (status === 'short') {
        placeOnOrbit(theta, worldR * 0.25)
      } else if (status === 'far') {
        const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
        const inward = new THREE.Vector3(-Math.cos(theta), 0, -Math.sin(theta))
        shipPos.current
          .set(Math.cos(theta) * worldR, 0.4, Math.sin(theta) * worldR)
          .addScaledVector(tangent, worldR * 0.5)
          .addScaledVector(inward, -worldR * 0.55)
        shipRef.current?.position.copy(shipPos.current)
      } else {
        const tangent = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta))
        shipPos.current
          .set(Math.cos(theta) * worldR, 0.4, Math.sin(theta) * worldR)
          .addScaledVector(tangent, worldR * 1.6)
        shipRef.current?.position.copy(shipPos.current)
      }
      desiredLook = shipPos.current.clone()
      desiredPos = new THREE.Vector3(
        shipPos.current.x * 0.35,
        34,
        shipPos.current.z * 0.35 + 38,
      )
    } else {
      placeOnOrbit(exitAngle, worldR)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const showArrows = phase === 'acting'
  const v = committedInput
  const a = centripetalAccel(v, radius)
  // The arrows are children of the ship group, which is rotated each frame to
  // face its heading (see placeOnOrbit). So they use fixed LOCAL directions:
  // -Z points inward to the vortex, -X points along the direction of travel.
  const inwardDir: [number, number, number] = [0, 0, -1]
  const tangentDir: [number, number, number] = [-1, 0, 0]

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />
      <Whirlpool animate={animate} />

      <group ref={shipRef} position={[worldR, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          flag={false}
          float
          animate={animate}
        />
        {showArrows && (
          <>
            <VectorArrow
              origin={[0, 7, 0]}
              dir={inwardDir}
              length={Math.max(2, a * ARROW_SCALE)}
              color="#f97316"
              label={`a = ${a.toFixed(1)} m/s²`}
            />
            <VectorArrow
              origin={[0, 7, 2.5]}
              dir={tangentDir}
              length={Math.max(2, v * ARROW_SCALE * 0.35)}
              color="#38bdf8"
              label={`v = ${v} m/s`}
            />
          </>
        )}
      </group>
    </>
  )
}

function idleCopy(radius: number, target: number): string {
  return `Caught in a giant whirlpool! It holds you at radius r = ${radius} m. Your hull and rope can bear about a = ${target} m/s² pulling inward. Enter the rowing speed v that keeps that inward acceleration, then slingshot free.`
}

export default function MaelstromGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const radius = step.params?.radius ?? 5
  const target = step.params?.target ?? 20
  const tolerance = step.params?.tolerance ?? 2

  const idle = idleCopy(radius, target)

  return (
    <NavalGameShell
      hookKey="maelstrom"
      intro={idle}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Rowing speed (m/s)"
      actionLabel="Row the circle"
      busyLabel="Circling…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n > 0 && n <= 40 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateOrbit(input, radius, target, tolerance)}
      statusText={{
        idle,
        acting: 'Circling…',
        hit: 'Steady orbit — cut the rope and slingshot free!',
        short: 'Too slow — the whirlpool drags you inward and down.',
        far: 'Too fast — the inward force snaps the rope and flings you off course.',
      }}
      resultSuffix={(r) =>
        `Centripetal a = v²/r = ${r.value.toFixed(1)} m/s².`
      }
      cameraInit={[0, 38, 46]}
      renderScene={(sceneProps) => (
        <MaelstromScene
          radius={radius}
          target={target}
          tolerance={tolerance}
          {...sceneProps}
        />
      )}
    />
  )
}
