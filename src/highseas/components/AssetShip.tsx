import { useMemo } from 'react'
import { Float, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ASSET_SHIP_URL } from '../assets'

// The Quaternius pirate-ship glTF is modeled with its hull's long axis along X
// (after its baked node scale, the model is ~8.5 long × 3.8 beam × 10.6 tall).
// The rest of the scene follows the procedural `Ship` convention of bow = local
// +Z (see `headingToRenderRotationDeg`, applied to the parent group), so we spin
// the model -90° about Y to point its bow down +Z. If a screenshot shows the bow
// pointing the wrong way, flip the sign here.
const SHIP_YAW_OFFSET = -Math.PI / 2
// The glTF is ~8.5 render-units long; the procedural ship is ~11 long at scale 1.
// This base makes a `scale` prop here mean roughly the same footprint as the same
// `scale` passed to the procedural `Ship`, so call sites can stay symmetric.
const SHIP_BASE_SCALE = 1.3
// Settle the hull slightly into the water (the model's keel sits at y≈0).
const SHIP_SINK = -0.6

interface AssetShipProps {
  /** Footprint scale, matching the procedural `Ship` scale semantics (~0.7–1). */
  scale?: number
  /** Optional hull tint (multiplied onto materials) to read pirate vs navy. */
  tint?: string
  /** Gentle bob/roll wrapper. */
  float?: boolean
  animate?: boolean
}

/**
 * Renders the CC0 glTF ship, deep-cloned per instance (so player + each contact
 * get their own object graph and optional tint). Suspends while the model loads;
 * the caller wraps this in Suspense + AssetErrorBoundary with the procedural ship
 * as the fallback.
 */
export function AssetShip({ scale = 1, tint, float = false, animate = true }: AssetShipProps) {
  const { scene } = useGLTF(ASSET_SHIP_URL)

  const model = useMemo(() => {
    const clone = scene.clone(true)
    if (tint) {
      const tintColor = new THREE.Color(tint)
      const tintMat = (m: THREE.Material): THREE.Material => {
        const c = m.clone() as THREE.MeshStandardMaterial
        if (c.color) c.color.multiply(tintColor)
        return c
      }
      clone.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(tintMat)
          : tintMat(mesh.material)
      })
    }
    return clone
  }, [scene, tint])

  const body = (
    <group
      rotation={[0, SHIP_YAW_OFFSET, 0]}
      scale={scale * SHIP_BASE_SCALE}
      position={[0, SHIP_SINK, 0]}
    >
      <primitive object={model} />
    </group>
  )

  if (!float) return body
  return (
    <Float
      speed={animate ? 1.3 : 0}
      rotationIntensity={animate ? 0.16 : 0}
      floatIntensity={animate ? 0.6 : 0}
    >
      {body}
    </Float>
  )
}
