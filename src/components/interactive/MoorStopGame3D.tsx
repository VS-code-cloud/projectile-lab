import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { StepComponentProps } from '../../lessons/types'
import { evaluateStop } from '../../lib/stopGame'
import {
  dampVec3,
  NavalEnvironment,
  NavalGameShell,
  Ship,
} from './naval'
import type { NavalSceneProps } from './naval'

const SCALE = 0.3
const GLIDE_DURATION = 2.5

function ux(meters: number): number {
  return meters * SCALE
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

interface MoorStopSceneParams {
  v0: number
  a: number
  target: number
}

function MoorStopScene({
  v0,
  a,
  target,
  phase,
  committedInput,
  shotId,
  reducedMotion,
  onProgress,
  onSettled,
}: MoorStopSceneParams & NavalSceneProps) {
  const { camera } = useThree()
  const lookAt = useRef(new THREE.Vector3(ux(target) * 0.55, 0, 0))
  const simT = useRef(0)
  const landed = useRef(false)
  const shipRef = useRef<THREE.Group>(null)

  const phaseRef = useRef(phase)
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (phase === 'acting') {
      simT.current = 0
      landed.current = false
    }
  }, [phase, shotId])

  const idleCam = useMemo(() => new THREE.Vector3(-24, 34, 52), [])
  const idleLook = useMemo(
    () => new THREE.Vector3(ux(target) * 0.55, 0, 0),
    [target],
  )

  const animate = !reducedMotion
  // The ship always glides its true coasting distance; the swimmer sits at the
  // distance the helm was told to cut sail (the learner's input), so a wrong
  // call leaves a visible gap. Before the first shot, park the swimmer ahead.
  const targetX = ux(target)
  const swimmerX = ux(committedInput > 0 ? committedInput : target)

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3

    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !landed.current) {
      simT.current += delta
      const progress = Math.min(simT.current / GLIDE_DURATION, 1)
      const eased = easeOutCubic(progress)
      const metersTravelled = target * eased
      const shipX = ux(metersTravelled)
      shipRef.current?.position.set(shipX, 0.4, 0)
      onProgress(metersTravelled)

      desiredLook = new THREE.Vector3(shipX, 0, 0)
      desiredPos = new THREE.Vector3(shipX - 18, 22, 38)

      if (progress >= 1) {
        landed.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const shipX = targetX
      shipRef.current?.position.set(shipX, 0.4, 0)
      desiredLook = new THREE.Vector3(shipX, 0, 0)
      desiredPos = new THREE.Vector3(shipX - 18, 22, 38)
    } else {
      shipRef.current?.position.set(0, 0.4, 0)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      <group position={[swimmerX, 0, -6]}>
        <mesh position={[0, 0.5, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#f97316" roughness={0.5} />
        </mesh>
        <Text
          position={[0, 2.2, 0]}
          fontSize={2.2}
          color="#fde047"
          outlineWidth={0.08}
          outlineColor="#3a2a05"
          anchorX="center"
          anchorY="middle"
        >
          {'Swimmer overboard'}
        </Text>
      </group>

      <group ref={shipRef} position={[0, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#4a6fa5"
          sailColor="#e8eef5"
          flag={false}
          float
          animate={animate}
        />
      </group>

      <Text
        position={[0, 14, 0]}
        fontSize={2.8}
        color="#eaf6ff"
        outlineWidth={0.08}
        outlineColor="#0b3550"
        anchorX="center"
        anchorY="middle"
      >
        {`v0 = ${v0} m/s · a = ${a} m/s²`}
      </Text>
    </>
  )
}

export default function MoorStopGame3D({
  step,
  answered,
  onSubmit,
}: StepComponentProps) {
  const v0 = step.params?.v0 ?? 20
  const a = step.params?.a ?? 2
  const target = step.params?.target ?? 100
  const tolerance = step.params?.tolerance ?? 5

  return (
    <NavalGameShell
      hookKey="moorStop"
      intro={
        <>
          Final challenge: a shipmate is overboard dead ahead! You are making way
          at{' '}
          <span className="font-semibold text-slate-900">v₀ = {v0} m/s</span>{' '}
          when you cut sail, and drag will then slow you down at{' '}
          <span className="font-semibold text-slate-900">a = {a} m/s²</span>. Calculate
          how far from the swimmer the ship should cut sail so it glides to a dead
          stop right alongside, and call that distance to the helm — they'll cut
          sail with the swimmer exactly that far off the bow.
        </>
      }
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Coasting distance (m)"
      actionLabel="Cut sail"
      busyLabel="Gliding…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= 0 && n <= 400 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateStop(input, v0, a, tolerance)}
      statusText={{
        idle:
          'A shipmate is overboard dead ahead. Enter how far you\'ll glide so the helm cuts sail with the swimmer that far off the bow.',
        acting: 'Gliding…',
        hit: 'Dead in the water right alongside — line away!',
        short:
          'You under-judged the glide — the ship sails right past the swimmer.',
        far: 'You over-judged the glide — the ship stops short, swimmer out of reach.',
      }}
      resultSuffix={(r) =>
        `You set ${r.value} m; the ship truly glides ${target} m.`
      }
      cameraInit={[-24, 34, 52]}
      renderScene={(sceneProps) => (
        <MoorStopScene
          v0={v0}
          a={a}
          target={target}
          {...sceneProps}
        />
      )}
    />
  )
}
