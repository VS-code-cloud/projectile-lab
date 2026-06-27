import { Float } from '@react-three/drei'
import * as THREE from 'three'

interface ShipProps {
  position?: [number, number, number]
  /** Euler rotation (radians). Use the z component for heel, y for heading. */
  rotation?: [number, number, number]
  scale?: number
  hullColor?: string
  sailColor?: string
  /** Show the black flag at the masthead. */
  flag?: boolean
  /** Wrap in a gentle bob/roll. */
  float?: boolean
  /** Drive the float animation (false for reduced motion). */
  animate?: boolean
}

/**
 * A weathered pirate ship: tapered hull, mast, square sail, and black flag.
 * Parametric so it can be the player, an enemy, or an anchored target, and can
 * be heeled (rotated about its forward axis) for the inclined-plane scene.
 */
export function Ship({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  hullColor = '#5b3a1d',
  sailColor = '#efe6d0',
  flag = true,
  float = false,
  animate = true,
}: ShipProps) {
  const body = (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Hull (long axis along z). */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[3.4, 2.2, 11]} />
        <meshStandardMaterial color={hullColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[3.7, 0.5, 11.4]} />
        <meshStandardMaterial color="#3f2713" roughness={0.85} />
      </mesh>
      {/* Bow + stern caps. */}
      <mesh position={[0, 0.6, 6]} rotation={[Math.PI / 4, 0, 0]} castShadow>
        <boxGeometry args={[3.4, 2, 2.2]} />
        <meshStandardMaterial color={hullColor} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.6, -6]} rotation={[-Math.PI / 4, 0, 0]} castShadow>
        <boxGeometry args={[3.4, 2, 2.2]} />
        <meshStandardMaterial color={hullColor} roughness={0.85} />
      </mesh>
      {/* Mast + sail. */}
      <mesh position={[0, 7, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 12, 12]} />
        <meshStandardMaterial color="#3b2614" roughness={0.8} />
      </mesh>
      <mesh position={[0, 8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[8, 6.5]} />
        <meshStandardMaterial color={sailColor} roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      {flag && (
        <mesh position={[0.9, 12.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 1]} />
          <meshStandardMaterial color="#15110d" side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  )

  if (!float) return body
  return (
    <Float
      speed={animate ? 1.3 : 0}
      rotationIntensity={animate ? 0.18 : 0}
      floatIntensity={animate ? 0.7 : 0}
    >
      {body}
    </Float>
  )
}
