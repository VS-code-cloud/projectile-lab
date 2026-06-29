import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import type { BandResult, BandStatus } from '../../lib/navalChallenge'
import { evaluateShove, shoveAccel } from '../../lib/shoveGame'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
  VectorArrow,
} from './naval'
import type { NavalSceneProps } from './naval'

const ACT_DURATION = 2.4
const ARROW_SCALE = 7
// The two hulls rest grappled this far apart (render units), separated along +x.
const START_X = 3.6

interface ShoveSceneParams {
  mass: number
  accelReq: number
  tolerance: number
}

function ShoveScene({
  mass,
  accelReq,
  tolerance,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: ShoveSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const pirateRef = useRef<THREE.Group>(null)
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
  const accel = shoveAccel(committedInput || 0, mass)
  const status: BandStatus = evaluateShove(
    committedInput,
    mass,
    accelReq,
    tolerance,
  ).status

  const idleCam = useMemo(() => new THREE.Vector3(-8, 24, 46), [])
  const idleLook = useMemo(() => new THREE.Vector3(START_X, 0, 0), [])

  /** Separation distance (render units) the pushed hull has drifted at time t. */
  function pirateXAt(t: number): number {
    return START_X + 0.5 * accel * t * t * 1.6
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3
    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const t = simT.current
      const px = pirateXAt(t)
      pirateRef.current?.position.set(px, 0.4, 0)
      onProgress(px - START_X)
      desiredPos = idleCam
      desiredLook = new THREE.Vector3((px - 3.4) / 2, 0, 0)
      if (t >= ACT_DURATION && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const px = pirateXAt(ACT_DURATION)
      pirateRef.current?.position.set(px, 0.4, 0)
      desiredPos = idleCam
      desiredLook = new THREE.Vector3((px - 3.4) / 2, 0, 0)
    } else {
      pirateRef.current?.position.set(START_X, 0.4, 0)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const showArrow = phase === 'acting' || phase === 'result'
  const arrowLen = Math.max(2, accel * ARROW_SCALE)

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.3 : 0} />

      {/* Your ship, holding to port. */}
      <group position={[-3.4, 0.4, 0]}>
        <Ship flag={false} float animate={animate} />
      </group>

      {/* Pirate hull grappled alongside to starboard; shoved off on +x. */}
      <group ref={pirateRef} position={[START_X, 0.4, 0]}>
        <Ship hullColor="#5b3a1d" sailColor="#d6c2a2" flag float animate={animate} />
        {showArrow && (
          <VectorArrow
            origin={[0, 6, 0]}
            dir={[1, 0.08, 0]}
            length={arrowLen}
            color={status === 'hit' ? '#34d399' : '#fbbf24'}
            label={`a = F/m = ${accel.toFixed(2)} m/s²`}
          />
        )}
      </group>
    </>
  )
}

export default function BoardingShoveGame3D({
  step,
  answered,
  onSubmit,
  singleAttempt,
  onAttemptSettled,
}: StepComponentProps & {
  singleAttempt?: boolean
  onAttemptSettled?: (result: BandResult) => void
}) {
  const mass = step.params?.pirateShipMass ?? 8000
  const accelReq = step.params?.separationAccel ?? 1
  const tolerance = step.params?.tolerance ?? 300
  const target = step.params?.target ?? mass * accelReq

  const idle = `The loot's aboard, but the grapnels still bind you to the pirate hull (m = ${mass} kg) — shove off before they swarm back! Push so the two ships break apart at a = ${accelReq} m/s².`

  return (
    <NavalGameShell
      hookKey="boardingShove"
      intro={idle}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      singleAttempt={singleAttempt}
      onAttemptSettled={onAttemptSettled}
      inputLabel="Push force (N)"
      actionLabel="Shove off"
      busyLabel="Heaving…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n > 0 && n <= 60000 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateShove(input, mass, accelReq, tolerance)}
      statusText={{
        idle,
        acting: 'Heaving…',
        hit: 'The hulls break apart — you slip away with the loot!',
        short: 'Too soft — the ships stay locked and the boarders pour back across.',
        far: 'Too hard — you nearly capsize wrenching free.',
      }}
      resultSuffix={(r) => `F = ${r.value} N → a = ${(r.value / mass).toFixed(2)} m/s².`}
      cameraInit={[-8, 24, 46]}
      renderScene={(sceneProps) => (
        <ShoveScene mass={mass} accelReq={accelReq} tolerance={tolerance} {...sceneProps} />
      )}
    />
  )
}
