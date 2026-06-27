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

const ACT_DURATION = 2.5
const ARROW_SCALE = 0.045
const DOCK_X = 24
const ROCKS_X = -24
const PIER_X = 38

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

interface KedgeSceneParams {
  windForce: number
  currentForce: number
  targetNet: number
}

function KedgeScene({
  windForce,
  currentForce,
  targetNet,
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
  const idleLook = useMemo(() => new THREE.Vector3(4, 0, 0), [])

  /** Map net force error to a berth position along the channel (+x = dock). */
  function finalShipX(haul: number): number {
    const n = netForce(windForce, currentForce, haul)
    const error = n - targetNet
    if (Math.abs(error) <= 20) return DOCK_X
    if (error < -20) return ROCKS_X + error * 0.15
    return DOCK_X + error * 0.35
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
      const endX = finalShipX(haulRef.current)
      const shipX = endX * eased
      shipRef.current?.position.set(shipX, 0.4, 0)
      onProgress(Math.abs(shipX))

      desiredLook = new THREE.Vector3(shipX + 8, 0, 0)
      desiredPos = new THREE.Vector3(shipX - 20, 26, 46)

      if (progress >= 1 && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const shipX = finalShipX(haulRef.current)
      shipRef.current?.position.set(shipX, 0.4, 0)
      desiredLook = new THREE.Vector3(shipX + 8, 0, 0)
      desiredPos = new THREE.Vector3(shipX - 20, 26, 46)
    } else {
      shipRef.current?.position.set(0, 0.4, 0)
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
      [-28, 0.8, -3],
      [-30, 1.2, 2],
      [-26, 0.6, 5],
      [-32, 1.5, -1],
    ],
    [],
  )

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      {/* Stone pier / berth on the +x side. */}
      <group position={[DOCK_X + 4, 0, 0]}>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[8, 5, 28]} />
          <meshStandardMaterial color="#8a8276" roughness={0.95} />
        </mesh>
        <mesh position={[0, 5.2, 0]} castShadow>
          <boxGeometry args={[8.4, 0.6, 28.4]} />
          <meshStandardMaterial color="#7c7468" roughness={0.95} />
        </mesh>
        <Text
          position={[0, 8, 0]}
          fontSize={2.6}
          color="#fde047"
          outlineWidth={0.08}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          Berth
        </Text>
      </group>

      {/* Jagged rocks on the −x side. */}
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
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#4a6fa5"
          sailColor="#e8eef5"
          flag={false}
          float
          animate={animate}
        />
        <VectorArrow
          origin={[0, 7, -2]}
          dir={[-1, 0, 0]}
          length={windLen}
          color="#ef4444"
          label={`Wind ${windForce} N`}
        />
        <VectorArrow
          origin={[0, 7, 0]}
          dir={[1, 0, 0]}
          length={currentLen}
          color="#22d3ee"
          label={`Current +${currentForce} N`}
        />
        <VectorArrow
          origin={[0, 7, 2]}
          dir={[1, 0, 0]}
          length={haulLen}
          color="#fbbf24"
          label={
            phase === 'idle'
              ? 'Haul ? N'
              : `Haul +${committedInput} N`
          }
        />
      </group>

      {/* Pier face marker for overshoot feedback. */}
      <mesh position={[PIER_X, 3, 0]} castShadow>
        <boxGeometry args={[1.5, 6, 20]} />
        <meshStandardMaterial color="#6b6560" roughness={0.9} transparent opacity={0.35} />
      </mesh>
    </>
  )
}

const IDLE_TEXT =
  'Warp the prize into her berth. Toward the dock is positive: the wind sets you at the rocks (−300 N), the current helps (+120 N). Enter the capstan haul so the net force is a gentle +60 N into the berth.'

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

  return (
    <NavalGameShell
      hookKey="kedge"
      intro={IDLE_TEXT}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Capstan haul (N)"
      actionLabel="Haul"
      busyLabel="Hauling…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= -500 && n <= 800 ? Math.round(n) : null
      }}
      evaluate={(input) =>
        evaluateKedge(input, windForce, currentForce, targetNet, tolerance)
      }
      statusText={{
        idle: IDLE_TEXT,
        acting: 'Hauling…',
        hit: 'Net force eased her alongside — moored!',
        short: 'Too little haul — wind and current set you onto the rocks.',
        far: 'Over-hauled — you ram the pier.',
      }}
      resultSuffix={(r) =>
        `Net force ${r.value >= 0 ? '+' : ''}${r.value} N toward the dock.`
      }
      cameraInit={[-26, 28, 54]}
      renderScene={(sceneProps) => (
        <KedgeScene
          windForce={windForce}
          currentForce={currentForce}
          targetNet={targetNet}
          {...sceneProps}
        />
      )}
    />
  )
}
