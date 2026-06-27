import { Float, Text } from '@react-three/drei'

interface BuoyProps {
  position: [number, number, number]
  label?: string
  animate?: boolean
}

/** A small navigation buoy with an optional flat water label, for range marks. */
export function Buoy({ position, label, animate = true }: BuoyProps) {
  return (
    <group position={position}>
      <Float
        speed={animate ? 1.6 : 0}
        rotationIntensity={0}
        floatIntensity={animate ? 0.6 : 0}
      >
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 1.8, 12]} />
          <meshStandardMaterial color="#d8443b" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.8, 0]} castShadow>
          <sphereGeometry args={[0.5, 12, 12]} />
          <meshStandardMaterial color="#f5f5f5" roughness={0.5} />
        </mesh>
      </Float>
      {label && (
        <Text
          position={[0, 0.3, 5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={2.4}
          color="#eaf6ff"
          outlineWidth={0.08}
          outlineColor="#0b3550"
          anchorX="center"
          anchorY="middle"
        >
          {label}
        </Text>
      )}
    </group>
  )
}
