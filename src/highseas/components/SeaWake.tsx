import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { wakeIntensity, wakeOpacity } from '../wakeField'

/**
 * Speed-driven ship wake: a feathered foam ribbon trailing astern plus a bright
 * bow-spray crescent, drawn on a flat plane just above the sea. It lives inside
 * the (heading-rotated) player-ship group so it always trails the bow correctly.
 * The foam churns via `uTime` and its length/opacity scale with the ship's
 * speed (read from a ref each frame — no React state). Additive, depth-write
 * off, and `toneMapped={false}`-bright so the post-FX Bloom catches the foam.
 * Math mirrors `wakeField.ts`. Rendered only when motion is enabled.
 */
const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// vUv.y runs 0 (far tail) → 1 (at the stern, nearest the ship) because the
// plane is built tail-first; foam is strongest at the stern and frays toward the
// tail, only reaching as far back as the ship's speed (uIntensity) allows.
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uOpacity;
  uniform vec3 uFoam;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Distance back from the stern (0 at ship, 1 at the far tail).
    float back = 1.0 - vUv.y;

    // The wake only reaches uIntensity of the ribbon; fade out past that.
    float reach = mix(0.12, 1.0, uIntensity);
    float lengthFade = 1.0 - smoothstep(reach * 0.6, reach, back);

    // The trail widens as it spreads behind the ship; foam concentrates on the
    // two churned edges of the "V".
    float halfWidth = mix(0.12, 0.5, back);
    float edge = abs(vUv.x - 0.5);
    float band = smoothstep(halfWidth, halfWidth * 0.55, edge);

    // Churning foam texture scrolling toward the tail.
    float churn = vnoise(vec2(vUv.x * 14.0, back * 26.0 - uTime * 3.0));
    churn = smoothstep(0.35, 0.85, churn);

    float alpha = band * lengthFade * (0.45 + 0.55 * churn) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uFoam, alpha);
  }
`

const WAKE_WIDTH = 9
const WAKE_LENGTH = 48
const WAKE_Y = 0.4

interface SeaWakeProps {
  /** Player sail speed ref (normalized); read each frame, never via state. */
  speed: { current: number }
  /** MAX_SAIL_SPEED, so intensity normalizes to 0..1. */
  maxSpeed: number
  /** Drive the foam churn (false → static, low opacity). */
  animate: boolean
}

export function SeaWake({ speed, maxSpeed, animate }: SeaWakeProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uOpacity: { value: 0 },
      uFoam: { value: new THREE.Color('#eaf7ff') },
    }),
    [],
  )

  useFrame(({ clock }) => {
    const m = matRef.current
    if (!m) return
    if (animate) m.uniforms.uTime.value = clock.elapsedTime
    const intensity = wakeIntensity(speed.current, maxSpeed)
    m.uniforms.uIntensity.value = intensity
    m.uniforms.uOpacity.value = wakeOpacity(intensity)
  })

  return (
    <group>
      {/* Trailing foam ribbon: flat on the water, extending astern (local −z). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, WAKE_Y, -WAKE_LENGTH / 2 - 4]}
      >
        <planeGeometry args={[WAKE_WIDTH, WAKE_LENGTH]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={VERTEX}
          fragmentShader={FRAGMENT}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
