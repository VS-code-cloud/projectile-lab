import { Float } from '@react-three/drei'
import * as THREE from 'three'

/** Main deck walking surface height (local units, before `scale`). */
export const SHIP_DECK_Y = 1.7
/** Half the flat usable main-deck length along local z. */
export const SHIP_DECK_HALF_LENGTH = 4.5
/** Half the deck width along local x. */
export const SHIP_DECK_HALF_WIDTH = 1.5
/** Raised stern quarterdeck / poop deck height. */
export const SHIP_QUARTERDECK_Y = 3.2
/** Z center of the raised stern block. */
export const SHIP_QUARTERDECK_Z = -4.0

const DARK_STRIPE = '#1a1208'
const WATERLINE = '#0f0a06'
const MAST_COLOR = '#3b2614'
const DECK_COLOR = '#3f2713'
const RIGGING_COLOR = '#15110d'

/** Evenly spaced gun-port z positions (skip bow taper). */
const GUN_PORT_Z = [-4.2, -3.2, -2.2, -1.2, -0.2, 0.8, 1.8, 2.8, 3.6]

const MASTS = [
  { z: 3.5, height: 10.5, yardHeights: [4.2, 7.0] },
  { z: 0, height: 13.5, yardHeights: [5.0, 8.5] },
  { z: -3.5, height: 9.5, yardHeights: [3.8, 6.5] },
] as const

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

function SquareSail({
  yardY,
  z,
  width,
  height,
  color,
  billow = 0.06,
}: {
  /** Yard height; the sail hangs centered below it. */
  yardY: number
  z: number
  width: number
  height: number
  color: string
  /** Subtle forward belly (radians) around the yard axis. */
  billow?: number
}) {
  return (
    <mesh position={[0, yardY - height / 2, z]} rotation={[billow, Math.PI / 2, 0]}>
      <planeGeometry args={[width, height, 3, 3]} />
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

function TriangularSail({
  position,
  /** Y rotation: `-Math.PI / 2` = foot toward bow, `Math.PI / 2` = foot toward stern. */
  yaw,
  roll = 0,
  width,
  height,
  color,
}: {
  position: [number, number, number]
  yaw: number
  roll?: number
  width: number
  height: number
  color: string
}) {
  const shape = new THREE.Shape()
  // Tack at origin; foot runs along +X, luff runs up +Y (re-oriented by yaw to bow/stern).
  shape.moveTo(0, 0)
  shape.lineTo(width, 0)
  shape.lineTo(0, height)
  shape.closePath()
  return (
    <mesh position={position} rotation={[0, yaw, roll]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color={color} roughness={0.9} side={THREE.DoubleSide} />
    </mesh>
  )
}

/**
 * A three-masted age-of-sail galleon: planked hull with gun-deck stripes, bowsprit,
 * square-rigged sails, and optional pirate flag. Parametric so it can be the player,
 * an enemy, or an anchored target, and can be heeled (rotated about its forward axis)
 * for the inclined-plane scene.
 */
export function Ship({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  hullColor = '#c8a44d',
  sailColor = '#efe6d0',
  flag = true,
  float = false,
  animate = true,
}: ShipProps) {
  const hullMat = { color: hullColor, roughness: 0.85 }
  const darkMat = { color: DARK_STRIPE, roughness: 0.9 }
  const deckMat = { color: DECK_COLOR, roughness: 0.85 }

  const body = (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Keel / waterline band. */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <boxGeometry args={[3.6, 0.35, 11.2]} />
        <meshStandardMaterial color={WATERLINE} roughness={0.95} />
      </mesh>

      {/* Planked hull tiers — slight tumblehome (narrower toward the top). */}
      <mesh position={[0, -0.15, 0]} castShadow>
        <boxGeometry args={[3.55, 0.75, 11]} />
        <meshStandardMaterial {...hullMat} />
      </mesh>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[3.35, 0.7, 10.8]} />
        <meshStandardMaterial {...hullMat} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[3.15, 0.65, 10.4]} />
        <meshStandardMaterial {...hullMat} />
      </mesh>

      {/* Gun-deck stripes (fixed dark color, independent of hullColor). */}
      {[0.15, 0.65].map((y) => (
        <group key={`stripe-${y}`}>
          <mesh position={[-1.68, y, 0]} castShadow>
            <boxGeometry args={[0.2, 0.24, 10.4]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>
          <mesh position={[1.68, y, 0]} castShadow>
            <boxGeometry args={[0.2, 0.24, 10.4]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>
        </group>
      ))}

      {/* Gun ports along each stripe. */}
      {[0.15, 0.65].flatMap((y) =>
        GUN_PORT_Z.flatMap((z) => [
          <mesh key={`port-l-${y}-${z}`} position={[-1.7, y, z]}>
            <boxGeometry args={[0.08, 0.12, 0.08]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>,
          <mesh key={`port-r-${y}-${z}`} position={[1.7, y, z]}>
            <boxGeometry args={[0.08, 0.12, 0.08]} />
            <meshStandardMaterial {...darkMat} />
          </mesh>,
        ]),
      )}

      {/* Main deck cap. */}
      <mesh position={[0, SHIP_DECK_Y - 0.08, 0]} castShadow>
        <boxGeometry args={[3.2, 0.16, 9.2]} />
        <meshStandardMaterial {...deckMat} />
      </mesh>

      {/* Rounded bow. */}
      <mesh position={[0, 0.35, 5.6]} rotation={[Math.PI / 5, 0, 0]} castShadow>
        <boxGeometry args={[3.0, 1.8, 2.4]} />
        <meshStandardMaterial {...hullMat} />
      </mesh>
      <mesh position={[0, SHIP_DECK_Y - 0.15, 5.8]} rotation={[Math.PI / 6, 0, 0]} castShadow>
        <boxGeometry args={[2.8, 0.3, 1.8]} />
        <meshStandardMaterial {...deckMat} />
      </mesh>

      {/* Raised stern quarterdeck / poop deck. */}
      <mesh position={[0, 2.35, SHIP_QUARTERDECK_Z]} castShadow>
        <boxGeometry args={[2.9, 3.0, 3.2]} />
        <meshStandardMaterial {...hullMat} />
      </mesh>
      <mesh position={[0, SHIP_QUARTERDECK_Y - 0.08, SHIP_QUARTERDECK_Z]} castShadow>
        <boxGeometry args={[2.7, 0.16, 2.8]} />
        <meshStandardMaterial {...deckMat} />
      </mesh>
      {[-0.35, 0.35].map((x) => (
        <mesh key={`stern-window-${x}`} position={[x, 2.5, SHIP_QUARTERDECK_Z - 1.45]}>
          <boxGeometry args={[0.35, 0.3, 0.06]} />
          <meshStandardMaterial color="#2a1a0e" roughness={0.7} />
        </mesh>
      ))}

      {/* Bowsprit — angled up-and-forward from the bow. */}
      <mesh position={[0, 2.2, 7.0]} rotation={[-Math.PI / 6, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.12, 5.0, 8]} />
        <meshStandardMaterial color={MAST_COLOR} roughness={0.8} />
      </mesh>

      {/* Masts, yards, and square sails. */}
      {MASTS.map(({ z, height, yardHeights }) => (
        <group key={`mast-${z}`}>
          <mesh position={[0, SHIP_DECK_Y + height / 2, z]} castShadow>
            <cylinderGeometry args={[0.18, 0.26, height, 10]} />
            <meshStandardMaterial color={MAST_COLOR} roughness={0.8} />
          </mesh>
          <mesh position={[0, SHIP_DECK_Y + height + 0.15, z]} castShadow>
            <boxGeometry args={[0.28, 0.12, 0.28]} />
            <meshStandardMaterial color={MAST_COLOR} roughness={0.8} />
          </mesh>
          {yardHeights.map((yardY, i) => (
            <group key={`yard-${z}-${yardY}`}>
              <mesh position={[0, yardY, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.05, 0.05, 5.2, 8]} />
                <meshStandardMaterial color={MAST_COLOR} roughness={0.8} />
              </mesh>
              <SquareSail
                yardY={yardY}
                z={z}
                width={i === 0 ? 4.8 : 3.8}
                height={i === 0 ? 2.0 : 1.6}
                color={sailColor}
                billow={0.05 + i * 0.02}
              />
            </group>
          ))}
        </group>
      ))}

      {/* Jib / staysails — tack at foremast (z=3.5), foot toward the bowsprit. */}
      <TriangularSail
        position={[-0.35, 2.7, 3.5]}
        yaw={-Math.PI / 2}
        roll={-0.06}
        width={4.8}
        height={3.1}
        color={sailColor}
      />
      <TriangularSail
        position={[0.35, 3.0, 3.5]}
        yaw={-Math.PI / 2}
        roll={0.05}
        width={3.6}
        height={2.5}
        color={sailColor}
      />
      <TriangularSail
        position={[0, 3.3, 3.5]}
        yaw={-Math.PI / 2}
        width={2.8}
        height={2.0}
        color={sailColor}
      />

      {/* Mizzen spanker — tack at mizzen (z=-3.5), foot toward the stern. */}
      <TriangularSail
        position={[0, 3.7, -3.5]}
        yaw={Math.PI / 2}
        width={3.8}
        height={2.8}
        color={sailColor}
      />

      {/* Modest rigging — stays and shrouds. */}
      {MASTS.map(({ z, height }) => (
        <group key={`rigging-${z}`}>
          <mesh position={[0, SHIP_DECK_Y + height, z * 0.5 + 2.5]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 6, 4]} />
            <meshStandardMaterial color={RIGGING_COLOR} roughness={0.95} />
          </mesh>
          <mesh position={[-1.4, SHIP_DECK_Y + height * 0.65, z]} rotation={[0, 0, 0.55]}>
            <cylinderGeometry args={[0.012, 0.012, 3.5, 4]} />
            <meshStandardMaterial color={RIGGING_COLOR} roughness={0.95} />
          </mesh>
          <mesh position={[1.4, SHIP_DECK_Y + height * 0.65, z]} rotation={[0, 0, -0.55]}>
            <cylinderGeometry args={[0.012, 0.012, 3.5, 4]} />
            <meshStandardMaterial color={RIGGING_COLOR} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* Pirate flag at the main masthead (legacy `flag` prop). */}
      {flag && (
        <mesh position={[0.9, SHIP_DECK_Y + 13.5, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[1.8, 1]} />
          <meshStandardMaterial color="#15110d" side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Masthead pennants (fore + mizzen) and stern ensign. */}
      {[
        { z: 3.5, height: 10.5, x: 0.55 },
        { z: -3.5, height: 9.5, x: 0.5 },
      ].map(({ z, height, x }) => (
        <mesh
          key={`pennant-${z}`}
          position={[x, SHIP_DECK_Y + height + 0.35, z]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[0.8, 0.45]} />
          <meshStandardMaterial color="#1e3a5f" side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, SHIP_QUARTERDECK_Y + 0.6, SHIP_QUARTERDECK_Z - 1.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.9, 0.5]} />
        <meshStandardMaterial color="#1e3a5f" side={THREE.DoubleSide} />
      </mesh>
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
