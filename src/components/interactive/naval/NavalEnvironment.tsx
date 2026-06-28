import { MeshReflectorMaterial, Sky, Sparkles } from '@react-three/drei'

/** Shared sun direction so the sky, key light, and water glint agree. */
const SUN: [number, number, number] = [-70, 48, 96]

interface NavalEnvironmentProps {
  /** Render the reflective sea plane (off for closed scenes like a ship deck). */
  sea?: boolean
  /** Sea tint. */
  seaColor?: string
  /** Sea plane extent (world units); oversized so its edges fade into fog. */
  seaSize?: number
  /** Render the drifting sea-spray sparkles. */
  sparkles?: boolean
  /** Sparkle drift speed (0 for reduced motion). */
  sparkleSpeed?: number
  /** Fog tuned so the play area is clear and the horizon fades — no visible edge. */
  fogArgs?: [string, number, number]
}

/**
 * Lush, reusable open-sea environment: procedural sky with a warm sun, haze
 * fog that hides the world's edges, hemisphere + key lighting, a reflective
 * sea, and sea-spray sparkles. Drop it at the top of any naval scene.
 */
export function NavalEnvironment({
  sea = true,
  seaColor = '#2e88c4',
  seaSize = 4000,
  sparkles = true,
  sparkleSpeed = 0.35,
  fogArgs = ['#bfe0f0', 300, 1000],
}: NavalEnvironmentProps) {
  return (
    <>
      <Sky
        sunPosition={SUN}
        turbidity={3}
        rayleigh={2.4}
        mieCoefficient={0.004}
        mieDirectionalG={0.85}
      />
      <fog attach="fog" args={fogArgs} />

      <hemisphereLight args={['#dff0ff', '#2f6b39', 0.95]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={SUN} intensity={1.7} color="#fff6e6" />

      {sea && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[seaSize, seaSize]} />
          <MeshReflectorMaterial
            resolution={1024}
            mirror={0.62}
            mixStrength={1.8}
            blur={[420, 110]}
            roughness={0.58}
            depthScale={1.65}
            minDepthThreshold={0.18}
            maxDepthThreshold={1.45}
            color={seaColor}
            metalness={0.42}
          />
        </mesh>
      )}

      {sparkles && (
        <Sparkles
          count={120}
          scale={[520, 10, 280]}
          position={[130, 2.5, 0]}
          size={3.2}
          speed={sparkleSpeed}
          color="#ffffff"
          opacity={0.62}
        />
      )}
    </>
  )
}
