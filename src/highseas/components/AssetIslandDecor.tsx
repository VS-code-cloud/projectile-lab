import { Clone, useGLTF } from '@react-three/drei'
import { ASSET_PALM_URL, ASSET_ROCK_URL } from '../assets'

// Placements are in the town building's local space (the parent group is the
// existing `scale={ISLAND_SCALE}` building group, with buildings at x∈[-4.5,4.5]
// and a dock toward +z). Native model sizes here: palm ≈ 2.8 units, rock ≈ 0.2.
// We ring palms just outside the buildings and scatter a few rocks among them.
const PALMS: Array<{ x: number; z: number; s: number; r: number }> = [
  { x: -6.2, z: -3.4, s: 1.25, r: 0.4 },
  { x: -5.6, z: 2.8, s: 1.05, r: 1.9 },
  { x: 0.4, z: -6.4, s: 1.3, r: 2.7 },
  { x: 5.8, z: -2.2, s: 1.15, r: 3.6 },
  { x: 6.4, z: 2.6, s: 1.2, r: 5.1 },
  { x: 2.6, z: 4.8, s: 1.0, r: 0.9 },
]

const ROCKS: Array<{ x: number; z: number; s: number; r: number }> = [
  { x: -3.2, z: 3.6, s: 5.5, r: 0.6 },
  { x: 3.4, z: -3.8, s: 4.2, r: 2.2 },
  { x: -6.6, z: 0.2, s: 6.0, r: 4.0 },
  { x: 5.2, z: 4.0, s: 3.6, r: 1.1 },
]

/**
 * CC0 palm + rock props scattered on the town plateau. Rendered as a child of the
 * island's building group, so it inherits ISLAND_SCALE and only needs small,
 * building-relative coordinates. drei `<Clone>` reuses the loaded geometry across
 * instances. Suspends while loading; the caller gates + error-bounds it.
 */
export function AssetIslandDecor() {
  const palm = useGLTF(ASSET_PALM_URL)
  const rock = useGLTF(ASSET_ROCK_URL)

  return (
    <group>
      {PALMS.map((p, i) => (
        <Clone
          key={`palm-${i}`}
          object={palm.scene}
          position={[p.x, 0, p.z]}
          rotation={[0, p.r, 0]}
          scale={p.s}
        />
      ))}
      {ROCKS.map((r, i) => (
        <Clone
          key={`rock-${i}`}
          object={rock.scene}
          position={[r.x, 0, r.z]}
          rotation={[0, r.r, 0]}
          scale={r.s}
        />
      ))}
    </group>
  )
}
