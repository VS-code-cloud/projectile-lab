import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { evaluateKedge, netForce } from '../../lib/kedgeGame'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
  VectorArrow,
} from './naval'
import type { NavalSceneProps } from './naval'
import type { BandStatus } from '../../lib/navalChallenge'

const ACT_DURATION = 2.5
const ARROW_SCALE = 0.045
// World x positions along the channel (+x = toward the dock / land).
// The dock's seaward face is at x = 24; the ship is ~1.7 wide in x.
const BERTH_X = 21 // docked neatly alongside, small gap (a hit)
const DOCK_FACE_X = 22.5 // jammed against the dock face (a crash) — never past it
const ROCKS_X = -26 // jagged rocks to leeward (a "too little" miss)

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

interface KedgeSceneParams {
  windForce: number
  currentForce: number
  targetNet: number
  tolerance: number
}

/** Where the ship ends up, and how, for a given rope pull. */
function outcomeFor(
  haul: number,
  windForce: number,
  currentForce: number,
  targetNet: number,
  tolerance: number,
): { x: number; status: BandStatus; crashed: boolean } {
  const error = netForce(windForce, currentForce, haul) - targetNet
  if (Math.abs(error) <= tolerance) {
    return { x: BERTH_X, status: 'hit', crashed: false }
  }
  if (error < 0) {
    // Too little pull: wind/current win and set you down onto the rocks.
    const x = Math.max(ROCKS_X, ROCKS_X + 6 + error * 0.12)
    return { x, status: 'short', crashed: false }
  }
  // Too much pull: you drive into the dock and stop hard (never through it).
  return { x: DOCK_FACE_X, status: 'far', crashed: true }
}

function KedgeScene({
  windForce,
  currentForce,
  targetNet,
  tolerance,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: KedgeSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const simT = useRef(0)
  const done = useRef(false)
  const shipRef = useRef<THREE.Group>(null)

  const phaseRef = useRef(phase)
  const haulRef = useRef(committedInput)
  useEffect(() => {
    phaseRef.current = phase
    haulRef.current = committedInput
  }, [phase, committedInput])

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      done.current = false
    }
  }, [phase, shotId])

  const animate = !reducedMotion
  const idleCam = useMemo(() => new THREE.Vector3(-26, 28, 54), [])
  const idleLook = useMemo(() => new THREE.Vector3(6, 0, 0), [])

  /** Applies the resting pose: crashed ships jam against the dock at an angle. */
  function poseShip(x: number, crashed: boolean) {
    shipRef.current?.position.set(x, 0.4, 0)
    shipRef.current?.rotation.set(0, crashed ? -0.22 : 0, crashed ? 0.16 : 0)
  }

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3

    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const progress = Math.min(simT.current / ACT_DURATION, 1)
      const eased = easeOutCubic(progress)
      const { x: endX, crashed } = outcomeFor(
        haulRef.current,
        windForce,
        currentForce,
        targetNet,
        tolerance,
      )
      const shipX = endX * eased
      // Hold the ship level until the very end; a crash tilts on impact.
      const crashing = crashed && progress > 0.85
      shipRef.current?.position.set(shipX, 0.4, 0)
      shipRef.current?.rotation.set(
        0,
        crashing ? -0.22 : 0,
        crashing ? 0.16 : 0,
      )
      onProgress(Math.abs(shipX))

      desiredLook = new THREE.Vector3(shipX + 8, 0, 0)
      desiredPos = new THREE.Vector3(shipX - 20, 26, 46)

      if (progress >= 1 && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const { x, crashed } = outcomeFor(
        haulRef.current,
        windForce,
        currentForce,
        targetNet,
        tolerance,
      )
      poseShip(x, crashed)
      desiredLook = new THREE.Vector3(x + 8, 0, 0)
      desiredPos = new THREE.Vector3(x - 20, 26, 46)
    } else {
      poseShip(0, false)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const windLen = Math.max(2, Math.abs(windForce) * ARROW_SCALE)
  const currentLen = Math.max(2, Math.abs(currentForce) * ARROW_SCALE)
  const haulLen = Math.max(
    2,
    Math.abs(phase === 'idle' ? 0 : committedInput) * ARROW_SCALE,
  )

  const rockPositions = useMemo(
    () => [
      [ROCKS_X - 2, 0.8, -3],
      [ROCKS_X - 4, 1.2, 2],
      [ROCKS_X, 0.6, 5],
      [ROCKS_X - 6, 1.5, -1],
    ],
    [],
  )

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      {/* Low, broad grassy coast behind the dock. It sits only just above the
          waterline (top ≈ y=10) and runs far inland and along the shore so its
          far/side edges dissolve into the fog — so it reads as continuous ground
          stretching to the horizon, not a green wall. The seaward face stays at
          x≈30, meeting the dock. */}
      <group position={[830, 0, 0]}>
        <mesh position={[0, -3, 0]} receiveShadow castShadow>
          <boxGeometry args={[1600, 26, 2200]} />
          <meshStandardMaterial color="#3c9446" roughness={1} />
        </mesh>
        {/* Sandy beach strip along the waterline at the seaward edge. */}
        <mesh position={[-800.1, 1.4, 0]}>
          <boxGeometry args={[3, 4, 2200]} />
          <meshStandardMaterial color="#d8c79a" roughness={1} />
        </mesh>
      </group>

      {/* Wooden dock reaching out from the shore to the mooring spot. */}
      <group position={[29, 0, 0]}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 0.6, 14]} />
          <meshStandardMaterial color="#9b7b4a" roughness={0.9} />
        </mesh>
        {[-6, -2, 2, 6].map((z) => (
          <mesh key={z} position={[-4.4, 0.2, z]} castShadow>
            <cylinderGeometry args={[0.35, 0.35, 2.2, 8]} />
            <meshStandardMaterial color="#5c4326" roughness={0.95} />
          </mesh>
        ))}
        <Text
          position={[0, 3.4, 0]}
          fontSize={2.6}
          color="#fde047"
          outlineWidth={0.08}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          Dock
        </Text>
      </group>

      {/* Jagged rocks on the −x side (where too little pull sets you down). */}
      {rockPositions.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, i * 0.7, 0]} castShadow>
          <coneGeometry args={[2.2, y * 2.2, 5]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.95} />
        </mesh>
      ))}
      <Text
        position={[ROCKS_X - 4, 6, 0]}
        fontSize={2.4}
        color="#94a3b8"
        outlineWidth={0.08}
        outlineColor="#0b2233"
        anchorX="center"
        anchorY="middle"
      >
        Rocks
      </Text>

      <group ref={shipRef} position={[0, 0.4, 0]}>
        <Ship
          flag={false}
          float
          animate={animate}
        />
        <VectorArrow
          origin={[0, 7, -2]}
          dir={[-1, 0, 0]}
          length={windLen}
          color="#ef4444"
        />
        <VectorArrow
          origin={[0, 7, 0]}
          dir={[1, 0, 0]}
          length={currentLen}
          color="#22d3ee"
        />
        <VectorArrow
          origin={[0, 7, 2]}
          dir={[1, 0, 0]}
          length={haulLen}
          color="#fbbf24"
        />
      </group>
    </>
  )
}

/** Instruction copy built from the (now randomized) situation numbers. */
function introText(windForce: number, currentForce: number, targetNet: number): string {
  return `Pull your ship into the dock! Count 'toward the dock' as positive. The wind pushes you toward the rocks at ${windForce} N, and the current helps you toward the dock at +${currentForce} N. Set your rope pull so the total (net) force is a gentle +${targetNet} N toward the dock.`
}

export default function KedgeGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const windForce = step.params?.windForce ?? -300
  const currentForce = step.params?.currentForce ?? 120
  const targetNet = step.params?.targetNet ?? 60
  const tolerance = step.params?.tolerance ?? 20
  const target = step.params?.target ?? targetNet
  const idleText = introText(windForce, currentForce, targetNet)

  return (
    <NavalGameShell
      hookKey="kedge"
      intro={idleText}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Rope pull (N)"
      actionLabel="Pull"
      busyLabel="Pulling…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= -500 && n <= 800 ? Math.round(n) : null
      }}
      evaluate={(input) =>
        evaluateKedge(input, windForce, currentForce, targetNet, tolerance)
      }
      statusText={{
        idle: idleText,
        acting: 'Pulling…',
        hit: 'The forces balance — you glide in and dock safely!',
        short: 'Too little pull — the wind and current push you onto the rocks.',
        far: 'Too much pull — you crash into the dock!',
      }}
      resultSuffix={(r) =>
        r.status === 'hit'
          ? `Total force ${r.value >= 0 ? '+' : ''}${r.value} N toward the dock.`
          : ''
      }
      cameraInit={[-26, 28, 54]}
      renderScene={(sceneProps) => (
        <KedgeScene
          windForce={windForce}
          currentForce={currentForce}
          targetNet={targetNet}
          tolerance={tolerance}
          {...sceneProps}
        />
      )}
    />
  )
}
