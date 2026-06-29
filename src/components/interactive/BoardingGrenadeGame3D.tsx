import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import type { BandResult } from '../../lib/navalChallenge'
import { evaluateShot } from '../../lib/cannonGame'
import { positionAt, timeToReturn } from '../../physics/kinematics'
import { dampVec3, NavalEnvironment, NavalGameShell, Ship } from './naval'
import type { NavalSceneProps } from './naval'

// Meters -> world units. Boarding distances are short (~30-70 m), so a larger
// scale than the cannon keeps the throw readable in frame.
const U = 0.7
const TIME_SCALE = 2.2
const THROW_ORIGIN = new THREE.Vector3(0, 4.4, 0)
const GRENADE_R = 0.5

function ux(meters: number): number {
  return meters * U
}

interface GrenadeSceneParams {
  v: number
  target: number
  tolerance: number
}

/** A handful of pirate boarders crowded on the enemy bow, the grenade's mark. */
function BoardingParty({ x, animate }: { x: number; animate: boolean }) {
  return (
    <group position={[x, 0.4, 0]}>
      <Ship
        rotation={[0, Math.PI / 2, 0]}
        hullColor="#5b3a1d"
        sailColor="#d6c2a2"
        flag
        float
        animate={animate}
      />
      {[-1.1, 0, 1.1].map((z, i) => (
        <mesh key={i} position={[1.2, 2.7, z]} castShadow>
          <capsuleGeometry args={[0.32, 1.0, 4, 8]} />
          <meshStandardMaterial color="#2b2118" roughness={0.9} />
        </mesh>
      ))}
    </group>
  )
}

/** Expanding blast ring where the grenade bursts. Remounts per throw. */
function Burst({ x }: { x: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  useFrame((_, d) => {
    t.current += d
    const p = Math.min(t.current / 1.1, 1)
    const s = 1 + p * 8
    ref.current?.scale.set(s, s, s)
    if (matRef.current) matRef.current.opacity = (1 - p) * 0.8
  })
  return (
    <mesh ref={ref} position={[x, 2.6, 0]}>
      <sphereGeometry args={[0.6, 16, 16]} />
      <meshBasicMaterial ref={matRef} color="#ffb347" transparent opacity={0.8} />
    </mesh>
  )
}

function GrenadeScene({
  v,
  target,
  tolerance,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: GrenadeSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const ballRef = useRef<THREE.Mesh>(null)
  const lookAt = useRef(new THREE.Vector3(ux(target) * 0.5, 0, 0))
  const simT = useRef(0)
  const done = useRef(false)

  const phaseRef = useRef(phase)
  const angleRef = useRef(committedInput)
  useEffect(() => {
    phaseRef.current = phase
    angleRef.current = committedInput
  }, [phase, committedInput])

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      done.current = false
    }
  }, [phase, shotId])

  const animate = !reducedMotion
  const idleCam = useMemo(() => new THREE.Vector3(-12, 26, 48), [])
  const idleLook = useMemo(() => new THREE.Vector3(ux(target) * 0.55, 0, 0), [target])
  const landX = ux(evaluateShot(v, committedInput, target, tolerance).distance)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3
    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta * TIME_SCALE
      const angle = angleRef.current
      const flight = timeToReturn(v, angle)
      const t = Math.min(simT.current, flight)
      const p = positionAt(v, angle, t)
      const bx = ux(p.x)
      const by = THROW_ORIGIN.y + Math.max(0, ux(p.y))
      ballRef.current?.position.set(bx, by, 0)
      onProgress(p.x)
      desiredLook = new THREE.Vector3(bx, by * 0.5, 0)
      desiredPos = new THREE.Vector3(bx - 24, by + 22, 40)
      if (simT.current >= flight && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      desiredLook = new THREE.Vector3(landX, 1, 0)
      desiredPos = new THREE.Vector3(landX - 30, 24, 44)
    } else {
      ballRef.current?.position.copy(THROW_ORIGIN)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.3 : 0} />

      {/* Your deck (the thrower stands here at the origin). */}
      <group position={[-2.4, 0.4, 0]}>
        <Ship rotation={[0, Math.PI / 2, 0]} flag={false} float animate={animate} />
      </group>

      <BoardingParty x={ux(target)} animate={animate} />

      {phase !== 'idle' && (
        <mesh ref={ballRef} position={THROW_ORIGIN.toArray()} castShadow>
          <sphereGeometry args={[GRENADE_R, 18, 18]} />
          <meshStandardMaterial
            color="#1b1b1b"
            metalness={0.5}
            roughness={0.5}
            emissive="#ff7518"
            emissiveIntensity={0.3}
          />
        </mesh>
      )}

      {phase === 'result' &&
        evaluateShot(v, committedInput, target, tolerance).status === 'hit' && (
          <Burst key={shotId} x={landX} />
        )}
    </>
  )
}

export default function BoardingGrenadeGame3D({
  step,
  answered,
  onSubmit,
  singleAttempt,
  onAttemptSettled,
}: StepComponentProps & {
  singleAttempt?: boolean
  onAttemptSettled?: (result: BandResult) => void
}) {
  const v = step.params?.v ?? 20
  const target = step.params?.target ?? 40
  const tolerance = step.params?.tolerance ?? 8

  const idle = `Pirates are massing to board! Hurl a powder grenade onto their boarding party ${target} m down the rail. You lob it at v = ${v} m/s — set the launch angle so it lands right on them (within ${tolerance} m). Split the throw into its components vₓ = v·cosθ and v_y = v·sinθ. Pick your angle so distance = ${target} m.`

  return (
    <NavalGameShell
      hookKey="boardingGrenade"
      intro={idle}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      singleAttempt={singleAttempt}
      onAttemptSettled={onAttemptSettled}
      inputLabel="Launch angle (degrees)"
      inputPlaceholder="0–90"
      actionLabel="Throw grenade"
      busyLabel="In the air…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= 0 && n <= 90 ? Math.round(n) : null
      }}
      evaluate={(input) => {
        // Adapt the cannon's ShotResult ({distance,status}) to the shell's
        // BandResult ({value,status}); the landing distance is the graded value.
        const r = evaluateShot(v, input, target, tolerance)
        return { value: r.distance, status: r.status }
      }}
      statusText={{
        idle,
        acting: 'In the air…',
        hit: 'Direct hit — the boarding party is scattered!',
        short: 'Fell short — it splashes into the sea before reaching them.',
        far: 'Overthrown — it sails clean over their heads.',
      }}
      resultSuffix={(r) => `Landed at ${r.value.toFixed(1)} m.`}
      cameraInit={[-12, 26, 48]}
      renderScene={(sceneProps) => (
        <GrenadeScene v={v} target={target} tolerance={tolerance} {...sceneProps} />
      )}
    />
  )
}
