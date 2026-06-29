import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import type { BandResult, BandStatus } from '../../lib/navalChallenge'
import { centripetalAccel, evaluateOrbit } from '../../lib/maelstromGame'
import { dampVec3, NavalEnvironment, NavalGameShell, Ship } from './naval'
import type { NavalSceneProps } from './naval'

const PIVOT_Y = 17
const ROPE_VIS = 12
const PHI0 = 1.15
const SWING_TIME = 1.5
const OUTCOME_TIME = 1.3

interface SwingSceneParams {
  radius: number
  target: number
  tolerance: number
}

function SwingScene({
  radius,
  target,
  tolerance,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: SwingSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 9, 0))
  const boarderRef = useRef<THREE.Group>(null)
  const ropeRef = useRef<THREE.Mesh>(null)
  const simT = useRef(0)
  const done = useRef(false)

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
  const a = centripetalAccel(committedInput, radius)
  const status: BandStatus = evaluateOrbit(
    committedInput,
    radius,
    target,
    tolerance,
  ).status

  const idleCam = useMemo(() => new THREE.Vector3(2, 18, 40), [])
  const idleLook = useMemo(() => new THREE.Vector3(0, 9, 0), [])

  /** Place the boarder at swing angle `phi` (0 = bottom), with optional drop / fling. */
  function place(phi: number, dropY = 0, extraX = 0) {
    const x = Math.sin(phi) * ROPE_VIS + extraX
    const y = PIVOT_Y - Math.cos(phi) * ROPE_VIS - dropY
    boarderRef.current?.position.set(x, Math.max(0.6, y), 0)
    boarderRef.current?.rotation.set(0, 0, phi)
  }

  function setRope(visible: boolean) {
    if (ropeRef.current) ropeRef.current.visible = visible
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      if (simT.current <= SWING_TIME) {
        const p = simT.current / SWING_TIME
        setRope(true)
        place(PHI0 * (1 - p))
        onProgress(a)
      } else {
        const op = Math.min((simT.current - SWING_TIME) / OUTCOME_TIME, 1)
        if (status === 'hit') {
          setRope(false)
          place(0, op * (PIVOT_Y - ROPE_VIS + 8))
        } else if (status === 'short') {
          place(-PHI0 * op)
        } else {
          setRope(false)
          place(0, -op * 5, -op * ROPE_VIS * 1.3)
        }
        if (simT.current - SWING_TIME >= OUTCOME_TIME && !done.current) {
          done.current = true
          onSettled()
        }
      }
    } else if (phaseRef.current === 'result') {
      if (status === 'hit') {
        setRope(false)
        place(0, PIVOT_Y - ROPE_VIS + 8)
      } else if (status === 'short') {
        place(-PHI0)
      } else {
        setRope(false)
        place(0, -5, -ROPE_VIS * 1.3)
      }
    } else {
      setRope(true)
      place(PHI0)
    }

    dampVec3(camera.position, idleCam, k, delta)
    dampVec3(lookAt.current, idleLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.3 : 0} />

      {/* The pirate ship the boarder launches from (starboard, +x). */}
      <group position={[16, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#5b3a1d"
          sailColor="#d6c2a2"
          flag
          float
          animate={animate}
        />
      </group>

      {/* Your deck (-x). */}
      <group position={[-16, 0.4, 0]}>
        <Ship rotation={[0, Math.PI / 2, 0]} flag={false} float animate={animate} />
      </group>

      {/* Rope pivot (a yardarm above). */}
      <mesh position={[0, PIVOT_Y, 0]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshStandardMaterial color="#2b2118" roughness={0.9} />
      </mesh>

      {/* Swinging boarder; local +y runs up the rope to the pivot (centripetal). */}
      <group
        ref={boarderRef}
        position={[Math.sin(PHI0) * ROPE_VIS, PIVOT_Y - Math.cos(PHI0) * ROPE_VIS, 0]}
        rotation={[0, 0, PHI0]}
      >
        <mesh ref={ropeRef} position={[0, ROPE_VIS / 2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, ROPE_VIS, 6]} />
          <meshStandardMaterial color="#caa472" roughness={0.9} />
        </mesh>
        <mesh castShadow>
          <capsuleGeometry args={[0.45, 1.4, 4, 8]} />
          <meshStandardMaterial color="#2b2118" roughness={0.9} />
        </mesh>
      </group>
    </>
  )
}

export default function BoardingSwingGame3D({
  step,
  answered,
  onSubmit,
  singleAttempt,
  onAttemptSettled,
}: StepComponentProps & {
  singleAttempt?: boolean
  onAttemptSettled?: (result: BandResult) => void
}) {
  const radius = step.params?.radius ?? 6
  const target = step.params?.target ?? 24
  const tolerance = step.params?.tolerance ?? 2

  const idle = `A pirate swings across on a fraying rope (length r = ${radius} m). It snaps the instant the inward pull reaches a = ${target} m/s². Judge the swing speed v that hits that breaking acceleration so the rope parts and he drops into the sea.`

  return (
    <NavalGameShell
      hookKey="boardingSwing"
      intro={idle}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      singleAttempt={singleAttempt}
      onAttemptSettled={onAttemptSettled}
      inputLabel="Swing speed (m/s)"
      actionLabel="Cut the rope"
      busyLabel="Swinging…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n > 0 && n <= 40 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateOrbit(input, radius, target, tolerance)}
      statusText={{
        idle,
        acting: 'Swinging…',
        hit: 'The rope snaps at the breaking point — the boarder plunges into the sea!',
        short: 'Too slow — he completes the swing and lands on your deck.',
        far: 'Too fast — the rope whips him clear over your deck.',
      }}
      resultSuffix={(r) => `Centripetal a = v²/r = ${r.value.toFixed(1)} m/s².`}
      cameraInit={[2, 18, 40]}
      renderScene={(sceneProps) => (
        <SwingScene radius={radius} target={target} tolerance={tolerance} {...sceneProps} />
      )}
    />
  )
}
