import { useEffect, useMemo, useRef } from 'react'
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
} from './naval'
import type { NavalSceneProps } from './naval'

const SCALE = 0.6
const ACT_DURATION = 2
const BALL_R = 0.35
const ARROW_SCALE = 3.2

function ux(meters: number): number {
  return meters * SCALE
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
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
  const lookAt = useRef(new THREE.Vector3(0, 0, 0))
  const simT = useRef(0)
  const done = useRef(false)
  const heelRef = useRef<THREE.Group>(null)
  const ballGroupRef = useRef<THREE.Group>(null)

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
  const deckLen = ux(length)
  const idleCam = useMemo(() => new THREE.Vector3(-18, 16, 30), [])
  const idleLook = useMemo(() => new THREE.Vector3(deckLen * 0.35, 0, 0), [deckLen])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    const k = reducedMotion ? 40 : 3

    let desiredPos: THREE.Vector3
    let desiredLook: THREE.Vector3

    if (phaseRef.current === 'acting' && !done.current) {
      simT.current += delta
      const progress = Math.min(simT.current / ACT_DURATION, 1)
      const eased = easeOutCubic(progress)
      const heelDeg = inputRef.current * eased
      const distM = length * eased
      const ballX = ux(distM)
      ballGroupRef.current?.position.set(ballX, BALL_R + 0.15, 0)
      onProgress(distM)

      heelRef.current?.rotation.set(0, 0, THREE.MathUtils.degToRad(heelDeg))
      desiredLook = new THREE.Vector3(ballX * 0.6, 0, 0)
      desiredPos = new THREE.Vector3(ballX - 10, 12, 22)

      if (progress >= 1 && !done.current) {
        done.current = true
        onSettled()
      }
    } else if (phaseRef.current === 'result') {
      const heelDeg = inputRef.current
      const ballX = deckLen
      ballGroupRef.current?.position.set(ballX, BALL_R + 0.15, 0)
      heelRef.current?.rotation.set(0, 0, THREE.MathUtils.degToRad(heelDeg))
      desiredLook = new THREE.Vector3(ballX * 0.6, 0, 0)
      desiredPos = new THREE.Vector3(ballX - 10, 12, 22)
    } else {
      heelRef.current?.rotation.set(0, 0, 0)
      ballGroupRef.current?.position.set(0, BALL_R + 0.15, 0)
      desiredPos = idleCam
      desiredLook = idleLook
    }

    dampVec3(camera.position, desiredPos, k, delta)
    dampVec3(lookAt.current, desiredLook, k, delta)
    camera.lookAt(lookAt.current)
  })

  const thetaRad = THREE.MathUtils.degToRad(phase === 'idle' ? 0 : committedInput)
  const sinLen = Math.max(0.4, Math.sin(thetaRad) * ARROW_SCALE)
  const cosLen = Math.max(0.4, Math.cos(thetaRad) * ARROW_SCALE)

  return (
    <>
      <NavalEnvironment sparkleSpeed={animate ? 0.35 : 0} />

      <group position={[0, 0.4, 0]}>
        <Ship
          rotation={[0, Math.PI / 2, 0]}
          hullColor="#4a6fa5"
          sailColor="#e8eef5"
          flag={false}
          float
          animate={animate}
        />

        <group ref={heelRef} position={[0, 1.6, 0]}>
          {/* Flat deck plank — ball rolls along +x to the lee gun port. */}
          <mesh position={[deckLen / 2, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[deckLen + 1.2, 0.18, 7]} />
            <meshStandardMaterial color="#8b7355" roughness={0.85} />
          </mesh>

          {/* Gun-port cradle at the lee edge. */}
          <mesh position={[deckLen + 0.2, -0.05, 0]} castShadow>
            <boxGeometry args={[0.7, 0.45, 1.4]} />
            <meshStandardMaterial color="#5c5348" roughness={0.9} />
          </mesh>
          <Text
            position={[deckLen + 0.2, 1.2, 0]}
            fontSize={1.4}
            color="#fde047"
            outlineWidth={0.06}
            outlineColor="#3a2a05"
            anchorX="center"
            anchorY="middle"
          >
            Lee gun
          </Text>

          {phase !== 'idle' && (
            <group ref={ballGroupRef} position={[0, BALL_R + 0.15, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[BALL_R, 20, 20]} />
                <meshStandardMaterial
                  color="#14181f"
                  metalness={0.7}
                  roughness={0.3}
                  emissive="#b45309"
                  emissiveIntensity={0.18}
                />
              </mesh>
              <VectorArrow
                origin={[0, 0, 0]}
                dir={[1, 0, 0]}
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
        </group>
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

  const idleText = `Heel the deck to run a shot to the lee gun. The ball rolls L = ${length} m to the gun port; the rammer can catch it safely at v = ${target} m/s. Enter the heel angle θ.`

  return (
    <NavalGameShell
      hookKey="heelDeck"
      intro={idleText}
      target={target}
      answered={answered}
      onSubmit={onSubmit}
      inputLabel="Heel angle θ (degrees)"
      actionLabel="Heel & release"
      busyLabel="Heeling…"
      parseInput={(text) => {
        const n = Number(text)
        return Number.isFinite(n) && n >= 0 && n <= 90 ? Math.round(n) : null
      }}
      evaluate={(input) => evaluateHeel(input, length, target, tolerance)}
      statusText={{
        idle: idleText,
        acting: 'Rolling…',
        hit: 'Right heel — the shot rolls into the cradle!',
        short: 'Too shallow — the ball stalls before the gun port.',
        far: 'Too steep — it arrives like a battering ram and stoves the port.',
      }}
      resultSuffix={(r) => `Ball reaches the port at ${r.value.toFixed(1)} m/s.`}
      cameraInit={[-18, 16, 30]}
      renderScene={(sceneProps) => (
        <HeelDeckScene length={length} {...sceneProps} />
      )}
    />
  )
}
