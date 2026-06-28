import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Open-sea water: a single large flat plane (covers the horizon, fades into fog)
 * with a custom fog-enabled ShaderMaterial. The fragment shader does the
 * "professional water" look without vertex tessellation — animated procedural
 * ripple normals, a Schlick Fresnel deep→shallow tint, a bright sun specular
 * (HDR so the post-FX Bloom catches it), and drifting foam. The detail is
 * world-anchored via `uOrigin` (the floating-origin player offset) so it streams
 * past as the ship sails. Math mirrors `waterField.ts`.
 */
const VERTEX = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorldPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vec4 mvPosition = viewMatrix * worldPos;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const FRAGMENT = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec2 uOrigin;
  uniform vec3 uSunDir;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uFoam;
  varying vec3 vWorldPos;

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
  float fbm(vec2 p) {
    float s = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      s += amp * vnoise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return s;
  }

  void main() {
    // World-anchored detail coords (small scale so ripples read near the ship).
    vec2 w = (vWorldPos.xz + uOrigin) * 0.012;
    vec2 drift = vec2(uTime * 0.6, uTime * 0.35);

    // Approximate a ripple normal from the gradient of layered noise.
    float e = 0.08;
    float n0 = fbm(w + drift);
    float nx = fbm(w + vec2(e, 0.0) + drift);
    float nz = fbm(w + vec2(0.0, e) + drift);
    vec3 normal = normalize(vec3((n0 - nx) * 1.4, 1.0, (n0 - nz) * 1.4));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - clamp(dot(viewDir, normal), 0.0, 1.0), 3.0);
    vec3 color = mix(uDeep, uShallow, clamp(fres, 0.0, 1.0));

    // Sun specular, pushed > 1 so Bloom picks up the glints.
    vec3 refl = reflect(-normalize(uSunDir), normal);
    float spec = pow(max(dot(refl, viewDir), 0.0), 90.0);
    color += vec3(1.0, 0.96, 0.85) * spec * 2.2;

    // Drifting foam flecks on the choppier patches.
    float foam = smoothstep(0.74, 0.9, fbm(w * 1.8 + drift * 1.3));
    color = mix(color, uFoam, foam * 0.45);

    gl_FragColor = vec4(color, 1.0);
    #include <fog_fragment>
  }
`

interface SeaWaterProps {
  /** Plane extent in render units (oversized so its edge fades into fog). */
  size: number
  /** Normalized→render world scale (floating-origin factor). */
  world: number
  /** Player position ref (floating-origin anchor) read each frame. */
  player: { current: { x: number; y: number } }
  /** Sun direction (matches the scene key light). */
  sunDir: [number, number, number]
  /** Drive the ripple animation (false for reduced motion). */
  animate: boolean
}

export function SeaWater({ size, world, player, sunDir, animate }: SeaWaterProps) {
  // Declarative material via a JSX ref (R3F manages construction + disposal).
  // The ref is read only inside useFrame (never during render), and the stable
  // uniforms object is built once — satisfying the react-hooks ref/immutability
  // rules while still letting us mutate uniform values per frame.
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(
    () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uOrigin: { value: new THREE.Vector2() },
          uSunDir: {
            value: new THREE.Vector3(sunDir[0], sunDir[1], sunDir[2]).normalize(),
          },
          uDeep: { value: new THREE.Color('#0a3a63') },
          uShallow: { value: new THREE.Color('#8fcdec') },
          uFoam: { value: new THREE.Color('#eaf6ff') },
        },
      ]),
    [sunDir],
  )

  useFrame(({ clock }) => {
    const m = matRef.current
    if (!m) return
    if (animate) m.uniforms.uTime.value = clock.elapsedTime
    const p = player.current
    m.uniforms.uOrigin.value.set((p.x - 0.5) * world, (p.y - 0.5) * world)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <shaderMaterial
        ref={matRef}
        fog
        uniforms={uniforms}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
      />
    </mesh>
  )
}
