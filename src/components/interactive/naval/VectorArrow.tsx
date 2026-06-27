import { Text } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'

interface VectorArrowProps {
  origin: [number, number, number]
  /** Direction the arrow points (need not be normalized). */
  dir: [number, number, number]
  /** Total arrow length in world units. */
  length: number
  color?: string
  thickness?: number
  /** Optional billboarded label near the head. */
  label?: string
}

/**
 * A 3D force/velocity vector: a cylindrical shaft capped with a cone head,
 * oriented from `origin` along `dir`. Used to render free-body diagrams and
 * velocity/acceleration vectors directly on the ships.
 */
export function VectorArrow({
  origin,
  dir,
  length,
  color = '#ffcc00',
  thickness = 0.45,
  label,
}: VectorArrowProps) {
  const quaternion = useMemo(() => {
    const d = new THREE.Vector3(dir[0], dir[1], dir[2])
    if (d.lengthSq() === 0) return new THREE.Quaternion()
    d.normalize()
    return new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d,
    )
  }, [dir])

  const head = thickness * 3
  const shaft = Math.max(0.01, length - head)

  return (
    <group position={origin} quaternion={quaternion}>
      <mesh position={[0, shaft / 2, 0]}>
        <cylinderGeometry args={[thickness, thickness, shaft, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      <mesh position={[0, shaft + head / 2, 0]}>
        <coneGeometry args={[thickness * 2.1, head, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
      {label && (
        <Text
          position={[0, length + 1.4, 0]}
          fontSize={2.2}
          color={color}
          outlineWidth={0.06}
          outlineColor="#0b2233"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  )
}
