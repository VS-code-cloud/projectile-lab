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
            resolution={512}
            mirror={0.55}
            mixStrength={1.4}
            blur={[300, 90]}
            roughness={0.7}
            depthScale={1.1}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.2}
            color={seaColor}
            metalness={0.5}
          />
        </mesh>
      )}

      {sparkles && (
        <Sparkles
          count={70}
          scale={[400, 8, 220]}
          position={[120, 2.5, 0]}
          size={3}
          speed={sparkleSpeed}
          color="#ffffff"
          opacity={0.5}
        />
      )}
    </>
  )
}
