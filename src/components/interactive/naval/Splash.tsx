import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

interface SplashProps {
  position: [number, number, number]
}

/**
 * Expanding foam ring marking a splashdown. Remount it (via a changing `key`)
 * to replay; it grows and fades over ~1.2s then stays invisible.
 */
export function Splash({ position }: SplashProps) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshBasicMaterial>(null)
  const t = useRef(0)
  useFrame((_, d) => {
    t.current += d
    const p = Math.min(t.current / 1.2, 1)
    const s = 1 + p * 9
    ref.current?.scale.set(s, s, s)
    if (matRef.current) matRef.current.opacity = (1 - p) * 0.7
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={position}>
      <ringGeometry args={[1.1, 1.7, 40]} />
      <meshBasicMaterial
        ref={matRef}
        color="#eaf8ff"
        transparent
        opacity={0.7}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
