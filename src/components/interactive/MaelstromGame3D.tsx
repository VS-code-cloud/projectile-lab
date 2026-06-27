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

function Vortex({ animate }: { animate: boolean }) {
  const ring1 = useRef<THREE.Mesh>(null)
  const ring2 = useRef<THREE.Mesh>(null)
  const ring3 = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!animate) return
    const d = delta * 0.9
    if (ring1.current) ring1.current.rotation.y += d
    if (ring2.current) ring2.current.rotation.y -= d * 1.3
    if (ring3.current) ring3.current.rotation.y += d * 0.7
  })

  return (
    <group position={[0, 0.2, 0]}>
      <mesh rotation={[Math.PI, 0, 0]} position={[0, 4, 0]}>
        <coneGeometry args={[7, 8, 32, 1, true]} />
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.85}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {[5.5, 7.5, 9.5].map((r, i) => (
        <mesh
          key={r}
          ref={i === 0 ? ring1 : i === 1 ? ring2 : ring3}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.15 + i * 0.08, 0]}
        >
          <torusGeometry args={[r, 0.18, 10, 48]} />
          <meshStandardMaterial
            color="#1e3a5f"
            transparent
            opacity={0.35 - i * 0.06}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  )
}

function RockRing({ worldR, gapAngle }: { worldR: number; gapAngle: number }) {
  const rocks = useMemo(() => {
    const count = 28
    const gapWidth = 0.45
    const items: Array<[number, number, number, number]> = []
    for (let i = 0; i < count; i++) {
      const t = i / count
      const angle = t * Math.PI * 2
      const da = Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle))
      if (Math.abs(da) < gapWidth) continue
      const rr = worldR + 4 + (i % 3) * 0.8
      items.push([
        Math.cos(angle) * rr,
        0.6 + (i % 4) * 0.35,
        Math.sin(angle) * rr,
        1 + (i % 5) * 0.25,
      ])
    }
    return items
  }, [worldR, gapAngle])

  return (
    <>
      {rocks.map(([x, y, z, h], i) => (
        <mesh
          key={i}
          position={[x, y, z]}
          rotation={[0, i * 0.9, 0]}
          castShadow
        >
          <coneGeometry args={[1.8, h * 2.4, 5]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
      ))}
    </>
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
  const gapAngle = 0

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
      const theta = angle.current || gapAngle
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
      placeOnOrbit(gapAngle, worldR)
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
      <Vortex animate={animate} />
      <RockRing worldR={worldR} gapAngle={gapAngle} />

      <group ref={shipRef} position={[worldR, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#4a6fa5"
          sailColor="#e8eef5"
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
  return `Caught in the maelstrom! The eddy holds you at radius r = ${radius} m. Your hull and cable can bear about a = ${target} m/s² inward. Enter the rowing speed v that holds that centripetal acceleration, then slingshot through the gap.`
}

export default function MaelstromGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const radius = step.params?.radius ?? 5
  const target = step.params?.target ?? 20
  const tolerance = step.params?.tolerance ?? 2
  const mass = step.params?.mass ?? 50
  void mass

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
        hit: 'Steady orbit — cut the cable and slingshot through the gap!',
        short: 'Too slow — the vortex drags you inward and down.',
        far: 'Too fast — the inward force snaps the cable into the rocks.',
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
